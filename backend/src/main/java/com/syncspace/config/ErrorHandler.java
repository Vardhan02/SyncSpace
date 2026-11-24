package com.syncspace.config;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.annotation.JsonProperty;

@RestControllerAdvice
public class ErrorHandler {

	private static final Logger log = LoggerFactory.getLogger(ErrorHandler.class);

	// supabase sends error_code + msg, older endpoints send error + error_description
	record SupabaseError(
			@JsonProperty("error_code") String errorCode,
			String msg,
			String error,
			@JsonProperty("error_description") String errorDescription) {
	}

	@ExceptionHandler(HttpClientErrorException.class)
	ResponseEntity<Map<String, String>> supabaseError(HttpClientErrorException e) {
		SupabaseError err = null;
		try {
			err = e.getResponseBodyAs(SupabaseError.class);
		} catch (RuntimeException ignored) {
		}
		String code = err == null ? "" : String.valueOf(err.errorCode());

		String message = switch (code) {
			case "invalid_credentials" -> "wrong email or password";
			case "user_already_exists", "email_exists" -> "an account with this email already exists";
			case "over_request_rate_limit", "over_email_send_rate_limit" -> "too many attempts, try again in a bit";
			case "refresh_token_not_found", "refresh_token_already_used", "session_not_found" -> "session expired, log in again";
			default -> {
				if (err != null && err.msg() != null) yield err.msg();
				if (err != null && err.errorDescription() != null) yield err.errorDescription();
				yield "something went wrong";
			}
		};

		HttpStatus status = code.startsWith("refresh_token") || code.equals("session_not_found")
				? HttpStatus.UNAUTHORIZED
				: HttpStatus.valueOf(e.getStatusCode().value());
		return ResponseEntity.status(status).body(Map.of("message", message));
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	ResponseEntity<Map<String, String>> invalid(MethodArgumentNotValidException e) {
		var field = e.getBindingResult().getFieldError();
		String message = field == null ? "invalid request" : field.getField() + ": " + field.getDefaultMessage();
		return ResponseEntity.badRequest().body(Map.of("message", message));
	}

	@ExceptionHandler(HttpMessageNotReadableException.class)
	ResponseEntity<Map<String, String>> unreadable(HttpMessageNotReadableException e) {
		log.warn("unreadable request body: {}", e.getMessage());
		return ResponseEntity.badRequest().body(Map.of("message", "invalid request body"));
	}

	@ExceptionHandler(ResponseStatusException.class)
	ResponseEntity<Map<String, String>> status(ResponseStatusException e) {
		return ResponseEntity.status(e.getStatusCode()).body(Map.of("message", String.valueOf(e.getReason())));
	}
}
