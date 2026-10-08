package com.devp.jevplay.api;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springaicommunity.typesafe.question.Choice;
import org.springaicommunity.typesafe.question.Noul;
import org.springaicommunity.typesafe.question.Question;
import org.springaicommunity.typesafe.question.Score;
import org.springframework.util.StringUtils;

/**
 * One question as the playground UI describes it. Fields that do not belong to the
 * question's {@link Kind} are ignored.
 */
public record QuestionSpec(@NotBlank String name, @NotNull Kind type, String instructions, String whenTrue,
		String whenFalse, @Valid List<OptionSpec> options, List<String> levels) {

	public enum Kind {

		@JsonProperty("noul") NOUL, @JsonProperty("choice") CHOICE, @JsonProperty("score") SCORE

	}

	public record OptionSpec(@NotBlank String label, String description) {
	}

	public Question toQuestion() {
		return switch (this.type) {
			case NOUL -> toNoul();
			case CHOICE -> toChoice();
			case SCORE -> toScore();
		};
	}

	private Noul toNoul() {
		Noul.Builder builder = Noul.builder();
		if (StringUtils.hasText(this.instructions)) {
			builder.instructions(this.instructions);
		}
		if (StringUtils.hasText(this.whenTrue)) {
			builder.whenTrue(this.whenTrue);
		}
		if (StringUtils.hasText(this.whenFalse)) {
			builder.whenFalse(this.whenFalse);
		}
		return builder.build();
	}

	private Choice toChoice() {
		Choice.Builder builder = Choice.builder();
		if (StringUtils.hasText(this.instructions)) {
			builder.instructions(this.instructions);
		}
		for (OptionSpec option : nonNull(this.options)) {
			if (StringUtils.hasText(option.description())) {
				builder.option(option.label(), option.description());
			}
			else {
				builder.option(option.label());
			}
		}
		return builder.build();
	}

	private Score toScore() {
		Score.Builder builder = Score.builder();
		if (StringUtils.hasText(this.instructions)) {
			builder.instructions(this.instructions);
		}
		nonNull(this.levels).forEach(builder::level);
		return builder.build();
	}

	private static <T> List<T> nonNull(List<T> list) {
		return list == null ? List.of() : list;
	}

}
