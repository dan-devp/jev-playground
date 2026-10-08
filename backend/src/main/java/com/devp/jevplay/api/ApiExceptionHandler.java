package com.devp.jevplay.api;

import org.springaicommunity.typesafe.exception.TypeSafeApiConnectionException;
import org.springaicommunity.typesafe.exception.TypeSafeApiException;
import org.springaicommunity.typesafe.exception.TypeSafeApiTimeoutException;
import org.springaicommunity.typesafe.exception.TypeSafeErrorDetail;
import org.springaicommunity.typesafe.exception.TypeSafeException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Turns Jev and validation failures into RFC 9457 problem details the UI can display.
 */
@RestControllerAdvice
public class ApiExceptionHandler extends ResponseEntityExceptionHandler {

	/**
	 * Jev's own 4xx answers (bad key, invalid question, rate limit) keep their status so the
	 * UI can tell them apart; its 5xx answers become a 502, since the fault is upstream.
	 */
	@ExceptionHandler(TypeSafeApiException.class)
	ProblemDetail handleApi(TypeSafeApiException ex) {
		HttpStatus upstream = HttpStatus.resolve(ex.status());
		HttpStatus status = (upstream == null || upstream.is5xxServerError()) ? HttpStatus.BAD_GATEWAY : upstream;
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(status,
				ex.errorMessage() != null ? ex.errorMessage() : ex.getMessage());
		problem.setTitle("Jev API error");
		problem.setProperty("jevStatus", ex.status());
		problem.setProperty("errorType", ex.errorType());
		problem.setProperty("requestId", ex.requestId());
		problem.setProperty("validationErrors",
				ex.validationErrors().stream().map(TypeSafeErrorDetail.ValidationError::toString).toList());
		return problem;
	}

	@ExceptionHandler(TypeSafeApiConnectionException.class)
	ProblemDetail handleConnection(TypeSafeApiConnectionException ex) {
		HttpStatus status = ex instanceof TypeSafeApiTimeoutException ? HttpStatus.GATEWAY_TIMEOUT
				: HttpStatus.BAD_GATEWAY;
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, ex.getMessage());
		problem.setTitle("Jev not reachable");
		return problem;
	}

	@ExceptionHandler(TypeSafeException.class)
	ProblemDetail handleTypeSafe(TypeSafeException ex) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_GATEWAY, ex.getMessage());
		problem.setTitle("Jev error");
		return problem;
	}

	@Override
	protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		ProblemDetail problem = ex.getBody();
		problem.setProperty("validationErrors",
				ex.getFieldErrors()
					.stream()
					.map(error -> error.getField() + ": " + error.getDefaultMessage())
					.toList());
		return handleExceptionInternal(ex, problem, headers, status, request);
	}

	/** The SDK's builders validate questions with {@code Assert}. */
	@ExceptionHandler({ IllegalArgumentException.class, IllegalStateException.class })
	ProblemDetail handleInvalid(RuntimeException ex) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
		problem.setTitle("Invalid request");
		return problem;
	}

}
