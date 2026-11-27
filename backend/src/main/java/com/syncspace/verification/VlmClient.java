package com.syncspace.verification;

import java.time.Duration;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.annotation.JsonProperty;

// Bhavya's VLM service: checks a listing's photos against its description and amenities
@Component
public class VlmClient {

	// TODO: key names are a placeholder until Bhavya sends his real response format
	record Result(@JsonProperty("verification_status") String verificationStatus, String reason) {

		boolean passed() {
			return "verified".equalsIgnoreCase(verificationStatus) || "true".equalsIgnoreCase(verificationStatus);
		}
	}

	private final RestClient http;

	public VlmClient(@Value("${vlm.url:http://localhost:8002/verify}") String url,
			@Value("${vlm.timeout:10m}") Duration timeout) {
		var factory = new SimpleClientHttpRequestFactory();
		factory.setConnectTimeout(Duration.ofSeconds(5));
		// a model going through six photos can take a while, nobody waits on this call
		factory.setReadTimeout(timeout);
		http = RestClient.builder()
				.baseUrl(url)
				.requestFactory(factory)
				.build();
	}

	Result verify(Map<String, Object> request) {
		return http.post()
				.contentType(MediaType.APPLICATION_JSON)
				.body(request)
				.retrieve()
				.body(Result.class);
	}
}
