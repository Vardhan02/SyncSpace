package com.syncspace.auth;

import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.annotation.JsonProperty;

@Component
public class SupabaseAuthClient {

	public record Session(
			@JsonProperty("access_token") String accessToken,
			@JsonProperty("refresh_token") String refreshToken,
			@JsonProperty("expires_in") long expiresIn,
			User user) {
	}

	public record User(String id, String email) {
	}

	private final RestClient http;

	public SupabaseAuthClient(@Value("${supabase.url}") String url, @Value("${supabase.key}") String key) {
		http = RestClient.builder()
				.baseUrl(url + "/auth/v1")
				.defaultHeader("apikey", key)
				.defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
				.build();
	}

	// returns a session with no tokens if "confirm email" is on in the dashboard
	public Session signup(String email, String password, Map<String, String> metadata) {
		return http.post()
				.uri("/signup")
				.body(Map.of("email", email, "password", password, "data", metadata))
				.retrieve()
				.body(Session.class);
	}

	public Session login(String email, String password) {
		return http.post()
				.uri("/token?grant_type=password")
				.body(Map.of("email", email, "password", password))
				.retrieve()
				.body(Session.class);
	}

	public Session refresh(String refreshToken) {
		return http.post()
				.uri("/token?grant_type=refresh_token")
				.body(Map.of("refresh_token", refreshToken))
				.retrieve()
				.body(Session.class);
	}

	// local = only this session, the default would sign the user out everywhere
	public void logout(String accessToken) {
		http.post()
				.uri("/logout?scope=local")
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
				.retrieve()
				.toBodilessEntity();
	}

	public void sendPasswordReset(String email) {
		http.post()
				.uri("/recover")
				.body(Map.of("email", email))
				.retrieve()
				.toBodilessEntity();
	}

	public void updatePassword(String accessToken, String password) {
		http.put()
				.uri("/user")
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
				.body(Map.of("password", password))
				.retrieve()
				.toBodilessEntity();
	}
}
