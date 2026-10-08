package com.devp.jevplay.api;

import java.util.List;
import java.util.Map;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

/**
 * Request and response bodies of the playground REST API. A {@code state} is whatever JSON
 * the client sent: text, an object, an array or {@code null}.
 */
public final class PlaygroundDtos {

	private PlaygroundDtos() {
	}

	// --- models

	public record ModelView(String name, String description, String releaseDate) {
	}

	public record ModelsResult(String defaultModel, List<ModelView> models) {
	}

	// --- single call

	public record RunRequest(Object state, String model, @NotEmpty @Valid List<QuestionSpec> questions) {
	}

	// --- batch

	public record BatchRequest(@NotEmpty List<Object> states, String model,
			@NotEmpty @Valid List<QuestionSpec> questions, @Min(1) @Max(16) Integer concurrency, Boolean failFast) {
	}

	public record BatchItem(int index, SystemOneResult result, String error) {
	}

	// --- consistency

	public record ConsistencyRequest(@NotNull Map<String, Object> state,
			@NotEmpty @Valid List<QuestionSpec> questions, @Min(2) @Max(50) Integer samples,
			@Min(1) @Max(16) Integer concurrency, Double threshold) {
	}

	public record StatisticsView(String name, List<Double> values, double mean, double standardDeviation, double min,
			double max, double range, Boolean straddlesThreshold) {
	}

	public record ConsistencyResult(String model, int succeeded, List<String> failures,
			List<StatisticsView> statistics, List<String> unstable, long latencyMs) {
	}

	// --- confidence gate

	public record GateRequest(Object state, String model, @NotEmpty @Valid List<QuestionSpec> questions,
			Double floor, Map<String, Double> requirements) {
	}

	public record GateDecision(String question, String action, double confidence, double required,
			String decision) {
	}

	public record GateResult(SystemOneResult result, double floor, List<GateDecision> decisions) {
	}

	// --- composite score

	public record Candidate(@NotBlank String label, Object state) {
	}

	public record Profile(@NotBlank String name, @NotEmpty Map<String, Double> weights) {
	}

	public record CompositeRequest(@NotEmpty @Valid List<Candidate> candidates, String model,
			@NotEmpty @Valid List<QuestionSpec> questions, @NotEmpty @Valid List<Profile> profiles,
			@Min(1) @Max(16) Integer concurrency) {
	}

	public record CandidateResult(int index, String label, SystemOneResult result, String error,
			Map<String, Double> scores) {
	}

	public record CompositeResult(List<CandidateResult> candidates) {
	}

}
