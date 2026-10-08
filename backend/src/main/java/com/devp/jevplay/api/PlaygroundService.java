package com.devp.jevplay.api;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import com.devp.jevplay.api.PlaygroundDtos.BatchItem;
import com.devp.jevplay.api.PlaygroundDtos.BatchRequest;
import com.devp.jevplay.api.PlaygroundDtos.Candidate;
import com.devp.jevplay.api.PlaygroundDtos.CandidateResult;
import com.devp.jevplay.api.PlaygroundDtos.CompositeRequest;
import com.devp.jevplay.api.PlaygroundDtos.CompositeResult;
import com.devp.jevplay.api.PlaygroundDtos.ConsistencyRequest;
import com.devp.jevplay.api.PlaygroundDtos.ConsistencyResult;
import com.devp.jevplay.api.PlaygroundDtos.GateDecision;
import com.devp.jevplay.api.PlaygroundDtos.GateRequest;
import com.devp.jevplay.api.PlaygroundDtos.GateResult;
import com.devp.jevplay.api.PlaygroundDtos.ModelView;
import com.devp.jevplay.api.PlaygroundDtos.ModelsResult;
import com.devp.jevplay.api.PlaygroundDtos.Profile;
import com.devp.jevplay.api.PlaygroundDtos.RunRequest;
import com.devp.jevplay.api.PlaygroundDtos.StatisticsView;
import org.springaicommunity.typesafe.JevBatchOptions;
import org.springaicommunity.typesafe.JevBatchResult;
import org.springaicommunity.typesafe.JsonContent;
import org.springaicommunity.typesafe.TypeSafeClient;
import org.springaicommunity.typesafe.exception.TypeSafeApiException;
import org.springaicommunity.typesafe.exception.TypeSafeException;
import org.springaicommunity.typesafe.judge.JevCompositeScore;
import org.springaicommunity.typesafe.judge.JevConfidenceGate;
import org.springaicommunity.typesafe.judge.JevConsistency;
import org.springaicommunity.typesafe.question.Question;
import org.springaicommunity.typesafe.question.SystemOneRequest;
import org.springaicommunity.typesafe.response.SystemOneResponse;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Translates playground requests into Jev calls through the auto-configured
 * {@link TypeSafeClient}.
 */
@Service
public class PlaygroundService {

	private final TypeSafeClient client;

	public PlaygroundService(TypeSafeClient client) {
		this.client = client;
	}

	public ModelsResult models() {
		List<ModelView> models = this.client.listModels()
			.stream()
			.map(model -> new ModelView(model.name(), model.description(), model.releaseDate()))
			.toList();
		return new ModelsResult(this.client.defaultModel(), models);
	}

	public SystemOneResult run(RunRequest request) {
		SystemOneRequest systemOne = toRequest(request.state(), request.model(), questions(request.questions()));
		long start = System.nanoTime();
		SystemOneResponse response = this.client.systemOne(systemOne);
		return SystemOneResult.of(response, elapsedMillis(start));
	}

	public List<BatchItem> batch(BatchRequest request) {
		Map<String, Question> questions = questions(request.questions());
		List<SystemOneRequest> requests = request.states()
			.stream()
			.map(state -> toRequest(state, request.model(), questions))
			.toList();
		JevBatchOptions options = batchOptions(request.concurrency())
			.withFailFast(Boolean.TRUE.equals(request.failFast()));
		return timed(requests, options).stream()
			.map(item -> new BatchItem(item.index(), item.result(), item.error()))
			.toList();
	}

	public ConsistencyResult consistency(ConsistencyRequest request) {
		Map<String, Question> questions = questions(request.questions());
		int samples = request.samples() != null ? request.samples() : JevConsistency.DEFAULT_SAMPLES;
		long start = System.nanoTime();
		JevConsistency.Report report = JevConsistency.sample(this.client, request.state(), questions, samples,
				batchOptions(request.concurrency()));
		long latency = elapsedMillis(start);

		Double threshold = request.threshold();
		List<StatisticsView> statistics = report.statistics()
			.values()
			.stream()
			.map(stats -> new StatisticsView(stats.name(), stats.values(), stats.mean(), stats.standardDeviation(),
					stats.min(), stats.max(), stats.range(), threshold == null ? null : stats.straddles(threshold)))
			.toList();
		List<String> failures = report.failures()
			.stream()
			.map(failure -> "Sample " + failure.index() + ": " + describe(failure.failure()))
			.toList();
		List<String> unstable = threshold == null ? List.of() : report.unstableAt(threshold);
		return new ConsistencyResult(this.client.defaultModel(), report.samples().size(), failures, statistics,
				unstable, latency);
	}

	public GateResult gate(GateRequest request) {
		JevConfidenceGate.Builder builder = JevConfidenceGate.builder();
		if (request.floor() != null) {
			builder.floor(request.floor());
		}
		if (request.requirements() != null) {
			request.requirements().forEach(builder::require);
		}
		JevConfidenceGate gate = builder.build();

		SystemOneRequest systemOne = toRequest(request.state(), request.model(), questions(request.questions()));
		long start = System.nanoTime();
		SystemOneResponse response = this.client.systemOne(systemOne);
		long latency = elapsedMillis(start);

		List<GateDecision> decisions = response.choices()
			.entrySet()
			.stream()
			.map(entry -> {
				String action = entry.getValue().value();
				return new GateDecision(entry.getKey(), action, entry.getValue().confidence(), gate.requiredFor(action),
						gate.decide(entry.getValue()).name());
			})
			.toList();
		return new GateResult(SystemOneResult.of(response, latency), gate.floor(), decisions);
	}

	public CompositeResult composite(CompositeRequest request) {
		Map<String, Question> questions = questions(request.questions());
		Set<String> scoreQuestions = request.questions()
			.stream()
			.filter(question -> question.type() == QuestionSpec.Kind.SCORE)
			.map(QuestionSpec::name)
			.collect(Collectors.toSet());
		Map<String, JevCompositeScore> profiles = new LinkedHashMap<>();
		for (Profile profile : request.profiles()) {
			profile.weights().keySet().forEach(name -> {
				if (!scoreQuestions.contains(name)) {
					throw new IllegalArgumentException(
							"Profile '" + profile.name() + "' weights '" + name + "', which is not a score question");
				}
			});
			JevCompositeScore.Builder builder = JevCompositeScore.builder();
			profile.weights().forEach(builder::weight);
			profiles.put(profile.name(), builder.build());
		}

		List<Candidate> candidates = request.candidates();
		List<SystemOneRequest> requests = candidates.stream()
			.map(candidate -> toRequest(candidate.state(), request.model(), questions))
			.toList();
		List<CandidateResult> results = timed(requests, batchOptions(request.concurrency())).stream()
			.map(item -> {
				Map<String, Double> scores = new LinkedHashMap<>();
				if (item.response() != null) {
					profiles.forEach((name, composite) -> scores.put(name, composite.of(item.response())));
				}
				return new CandidateResult(item.index(), candidates.get(item.index()).label(), item.result(),
						item.error(), scores);
			})
			.toList();
		return new CompositeResult(results);
	}

	/**
	 * Runs a batch and keeps both the raw response, for further computation, and its UI
	 * view. A batch reports one wall-clock latency, so every item carries the batch's.
	 */
	private List<TimedItem> timed(List<SystemOneRequest> requests, JevBatchOptions options) {
		long start = System.nanoTime();
		List<JevBatchResult<SystemOneResponse>> results = this.client.systemOneAll(requests, options);
		long latency = elapsedMillis(start);
		List<TimedItem> items = new ArrayList<>(results.size());
		for (JevBatchResult<SystemOneResponse> result : results) {
			if (result.succeeded()) {
				SystemOneResponse response = result.orThrow();
				items.add(new TimedItem(result.index(), response, SystemOneResult.of(response, latency), null));
			}
			else {
				items.add(new TimedItem(result.index(), null, null, describe(result.failure())));
			}
		}
		return items;
	}

	private record TimedItem(int index, SystemOneResponse response, SystemOneResult result, String error) {
	}

	private static Map<String, Question> questions(List<QuestionSpec> specs) {
		Map<String, Question> questions = new LinkedHashMap<>();
		for (QuestionSpec spec : specs) {
			if (questions.put(spec.name(), spec.toQuestion()) != null) {
				throw new IllegalArgumentException("Duplicate question name '" + spec.name() + "'");
			}
		}
		return questions;
	}

	private static SystemOneRequest toRequest(Object state, String model, Map<String, Question> questions) {
		SystemOneRequest.Builder builder = SystemOneRequest.builder().state(toState(state)).questions(questions);
		if (StringUtils.hasText(model)) {
			builder.model(model);
		}
		return builder.build();
	}

	/**
	 * Jev accepts text, an object, an array or null as state, and answers a bare number or
	 * boolean with a 422. Reject those here with a clearer message.
	 */
	private static JsonContent toState(Object state) {
		if (state instanceof Number || state instanceof Boolean) {
			throw new IllegalArgumentException("State must be text, a JSON object, a JSON array or null");
		}
		return JsonContent.of(state);
	}

	private static JevBatchOptions batchOptions(Integer concurrency) {
		return concurrency == null ? JevBatchOptions.defaults() : JevBatchOptions.ofConcurrency(concurrency);
	}

	private static long elapsedMillis(long startNanos) {
		return (System.nanoTime() - startNanos) / 1_000_000;
	}

	private static String describe(TypeSafeException failure) {
		if (failure instanceof TypeSafeApiException api) {
			String message = api.errorMessage() != null ? api.errorMessage() : api.getMessage();
			return "HTTP " + api.status() + ": " + message;
		}
		return failure.getMessage();
	}

}
