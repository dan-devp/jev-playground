package com.devp.jevplay.api;

import java.util.LinkedHashMap;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import org.springaicommunity.typesafe.response.Answer;
import org.springaicommunity.typesafe.response.ChoiceAnswer;
import org.springaicommunity.typesafe.response.NoulAnswer;
import org.springaicommunity.typesafe.response.ScoreAnswer;
import org.springaicommunity.typesafe.response.UnknownAnswer;

/**
 * A Jev answer flattened for the UI, discriminated by {@code type}.
 */
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({ @JsonSubTypes.Type(value = AnswerView.NoulView.class, name = "noul"),
		@JsonSubTypes.Type(value = AnswerView.ChoiceView.class, name = "choice"),
		@JsonSubTypes.Type(value = AnswerView.ScoreView.class, name = "score"),
		@JsonSubTypes.Type(value = AnswerView.UnknownView.class, name = "unknown") })
public sealed interface AnswerView {

	String name();

	record NoulView(String name, double value) implements AnswerView {
	}

	record ChoiceView(String name, String value, Map<String, Double> probabilities, double confidence)
			implements AnswerView {
	}

	record ScoreView(String name, double value, int nearestLevel, String nearestLabel, int maxLevel,
			Map<Integer, String> legend, Map<Integer, Double> probabilities, double confidence) implements AnswerView {
	}

	record UnknownView(String name, String typeName, Map<String, Object> raw) implements AnswerView {
	}

	static AnswerView of(String name, Answer answer) {
		return switch (answer) {
			case NoulAnswer noul -> new NoulView(name, noul.value());
			case ChoiceAnswer choice -> new ChoiceView(name, choice.value(), choice.probabilities(), choice.confidence());
			case ScoreAnswer score -> {
				Map<Integer, String> legend = new LinkedHashMap<>();
				score.legend().forEach((level, label) -> legend.put(level, label.toDisplayString()));
				yield new ScoreView(name, score.value(), score.nearestLevel(), score.nearestLabel(), score.maxLevel(),
						legend, score.probabilities(), score.confidence());
			}
			case UnknownAnswer unknown -> new UnknownView(name, unknown.typeName(), unknown.raw());
		};
	}

}
