package com.devp.jevplay.api;

import java.util.List;

import org.springaicommunity.typesafe.response.SystemOneResponse;

/**
 * One System One call as the UI shows it: the answers in request order plus the call's
 * metadata.
 */
public record SystemOneResult(String model, List<AnswerView> answers, Integer inputTokens, Integer outputTokens,
		String requestId, long latencyMs) {

	public static SystemOneResult of(SystemOneResponse response, long latencyMs) {
		List<AnswerView> answers = response.answers()
			.entrySet()
			.stream()
			.map(entry -> AnswerView.of(entry.getKey(), entry.getValue()))
			.toList();
		return new SystemOneResult(response.model(), answers, response.usage().inputTokens(),
				response.usage().outputTokens(), response.requestId(), latencyMs);
	}

}
