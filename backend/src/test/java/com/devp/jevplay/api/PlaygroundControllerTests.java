package com.devp.jevplay.api;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springaicommunity.typesafe.RetryPolicy;
import org.springaicommunity.typesafe.TypeSafeClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * Runs the real SDK against a mocked Jev endpoint, so the request mapping and the answer
 * views are checked against Jev's wire format.
 */
@SpringBootTest
@AutoConfigureMockMvc
class PlaygroundControllerTests {

	private static final String JEV = "https://jev.test";

	private static final String TICKET_RESPONSE = """
			{
			  "model": "jev-1.13.0",
			  "answers": {
			    "is_urgent": { "type": "noul", "noul": 0.92 },
			    "department": {
			      "type": "choice",
			      "choice": "technical",
			      "probabilities": { "billing": 0.08, "technical": 0.85, "sales": 0.07 },
			      "confidence": 0.82
			    },
			    "frustration": {
			      "type": "score",
			      "score": 1.6,
			      "legend": { "0": "Calm", "1": "Frustrated", "2": "Very angry" },
			      "probabilities": { "0": 0.05, "1": 0.3, "2": 0.65 },
			      "confidence": 0.78
			    }
			  },
			  "usage": { "input_tokens": 312, "output_tokens": 48 }
			}""";

	private static final String TICKET_REQUEST = """
			{
			  "state": "Help! My payouts have been failing for 3 days.",
			  "model": "jev-1.13.0",
			  "questions": [
			    { "name": "is_urgent", "type": "noul", "instructions": "Does this convey urgency?" },
			    { "name": "department", "type": "choice", "instructions": "Which team should handle this?",
			      "options": [ { "label": "billing", "description": "Payments" }, { "label": "technical" }, { "label": "sales" } ] },
			    { "name": "frustration", "type": "score", "instructions": "How frustrated is the customer?",
			      "levels": [ "Calm", "Frustrated", "Very angry" ] }
			  ]
			}""";

	@TestConfiguration
	static class MockJev {

		@Bean
		RestClient.Builder jevRestClientBuilder() {
			return RestClient.builder();
		}

		@Bean
		MockRestServiceServer jevServer(RestClient.Builder jevRestClientBuilder) {
			return MockRestServiceServer.bindTo(jevRestClientBuilder).build();
		}

		@Bean
		TypeSafeClient typeSafeClient(RestClient.Builder jevRestClientBuilder, MockRestServiceServer jevServer) {
			return TypeSafeClient.builder()
				.apiKey("test-key")
				.baseUrl(JEV)
				.defaultModel("jev-latest")
				.retryPolicy(RetryPolicy.noRetry())
				.restClientBuilder(jevRestClientBuilder)
				.build();
		}

	}

	@Autowired
	MockMvcTester mvc;

	@Autowired
	MockRestServiceServer jev;

	@BeforeEach
	void reset() {
		this.jev.reset();
	}

	@Test
	void runsSystemOneAndFlattensEveryAnswerType() {
		this.jev.expect(requestTo(JEV + "/v1/systemone"))
			.andExpect(method(HttpMethod.POST))
			.andExpect(jsonPath("$.state").value("Help! My payouts have been failing for 3 days."))
			.andExpect(jsonPath("$.model").value("jev-1.13.0"))
			.andExpect(jsonPath("$.questions.is_urgent.type").value("noul"))
			.andExpect(jsonPath("$.questions.department.criteria.billing").value("Payments"))
			.andExpect(jsonPath("$.questions.frustration.criteria[2]").value("Very angry"))
			.andRespond(withSuccess(TICKET_RESPONSE, MediaType.APPLICATION_JSON));

		assertThat(this.mvc.post().uri("/api/system-one").contentType(MediaType.APPLICATION_JSON).content(TICKET_REQUEST))
			.hasStatusOk()
			.bodyJson()
			.satisfies(body -> {
				assertThat(body).extractingPath("$.model").isEqualTo("jev-1.13.0");
				assertThat(body).extractingPath("$.inputTokens").isEqualTo(312);
				assertThat(body).extractingPath("$.answers[0].type").isEqualTo("noul");
				assertThat(body).extractingPath("$.answers[0].value").isEqualTo(0.92);
				assertThat(body).extractingPath("$.answers[1].type").isEqualTo("choice");
				assertThat(body).extractingPath("$.answers[1].value").isEqualTo("technical");
				assertThat(body).extractingPath("$.answers[1].probabilities.technical").isEqualTo(0.85);
				assertThat(body).extractingPath("$.answers[2].type").isEqualTo("score");
				assertThat(body).extractingPath("$.answers[2].nearestLabel").isEqualTo("Very angry");
				assertThat(body).extractingPath("$.answers[2].legend.1").isEqualTo("Frustrated");
			});
		this.jev.verify();
	}

	@Test
	void appliesTheConfidenceGateToEveryChoice() {
		this.jev.expect(requestTo(JEV + "/v1/systemone"))
			.andRespond(withSuccess(TICKET_RESPONSE, MediaType.APPLICATION_JSON));

		String request = TICKET_REQUEST.replaceFirst("\\{", "{ \"floor\": 0.6, \"requirements\": { \"technical\": 0.9 },");
		assertThat(this.mvc.post().uri("/api/confidence-gate").contentType(MediaType.APPLICATION_JSON).content(request))
			.hasStatusOk()
			.bodyJson()
			.satisfies(body -> {
				assertThat(body).extractingPath("$.decisions[0].question").isEqualTo("department");
				assertThat(body).extractingPath("$.decisions[0].required").isEqualTo(0.9);
				assertThat(body).extractingPath("$.decisions[0].decision").isEqualTo("CONFIRM");
			});
	}

	@Test
	void passesJevValidationErrorsThroughAsProblemDetail() {
		this.jev.expect(requestTo(JEV + "/v1/systemone"))
			.andRespond(withStatus(HttpStatus.UNPROCESSABLE_CONTENT).contentType(MediaType.APPLICATION_JSON)
				.body("""
						{ "detail": [ { "type": "value_error", "loc": ["body", "state"], "msg": "bad state" } ] }"""));

		assertThat(this.mvc.post().uri("/api/system-one").contentType(MediaType.APPLICATION_JSON).content(TICKET_REQUEST))
			.hasStatus(HttpStatus.UNPROCESSABLE_CONTENT)
			.bodyJson()
			.satisfies(body -> {
				assertThat(body).extractingPath("$.title").isEqualTo("Jev API error");
				assertThat(body).extractingPath("$.jevStatus").isEqualTo(422);
			});
	}

	@Test
	void rejectsAScoreWithASingleLevelBeforeCallingJev() {
		String request = """
				{ "state": "x", "questions": [ { "name": "s", "type": "score", "levels": [ "only" ] } ] }""";

		assertThat(this.mvc.post().uri("/api/system-one").contentType(MediaType.APPLICATION_JSON).content(request))
			.hasStatus(HttpStatus.BAD_REQUEST)
			.bodyJson()
			.extractingPath("$.detail")
			.asString()
			.contains("at least two levels");
		this.jev.verify();
	}

	@Test
	void reportsBatchFailuresPerItemWithoutFailFast() {
		this.jev.expect(requestTo(JEV + "/v1/systemone"))
			.andRespond(withSuccess(TICKET_RESPONSE, MediaType.APPLICATION_JSON));
		this.jev.expect(requestTo(JEV + "/v1/systemone"))
			.andRespond(withStatus(HttpStatus.BAD_REQUEST).contentType(MediaType.APPLICATION_JSON)
				.body("""
						{ "error": { "type": "invalid_request", "message": "nope" } }"""));

		// No failFast: the flag is optional.
		String request = TICKET_REQUEST.replaceFirst("\"state\": \"[^\"]*\"",
				"\"states\": [ \"first\", { \"ticket\": \"second\" } ], \"concurrency\": 1");
		assertThat(this.mvc.post().uri("/api/batch").contentType(MediaType.APPLICATION_JSON).content(request))
			.hasStatusOk()
			.bodyJson()
			.satisfies(body -> {
				assertThat(body).extractingPath("$[0].result.answers[1].value").isEqualTo("technical");
				assertThat(body).extractingPath("$[1].result").isNull();
				assertThat(body).extractingPath("$[1].error").asString().startsWith("HTTP 400");
			});
		this.jev.verify();
	}

	@Test
	void rejectsABareNumberAsState() {
		String request = """
				{ "state": 42, "questions": [ { "name": "q", "type": "noul", "instructions": "?" } ] }""";

		assertThat(this.mvc.post().uri("/api/system-one").contentType(MediaType.APPLICATION_JSON).content(request))
			.hasStatus(HttpStatus.BAD_REQUEST);
	}

}
