package com.syncspace.ranking;

import java.time.Duration;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.annotation.JsonProperty;

// Krishna's matching service (matching/API.md). It never touches the DB, we send it the rows.
@Component
public class RankingClient {

	record Result(String id, int score) {
	}

	record Filtered(String id, String reason) {
	}

	record Ranked(List<Result> results, @JsonProperty("filtered_out") List<Filtered> filteredOut) {
	}

	private final RestClient http;

	public RankingClient(@Value("${ranking.url:http://localhost:8001}") String url) {
		var factory = new SimpleClientHttpRequestFactory();
		factory.setConnectTimeout(Duration.ofSeconds(2));
		// a tenant's first call is slow, their text gets embedded before it's cached
		factory.setReadTimeout(Duration.ofSeconds(30));
		http = RestClient.builder()
				.baseUrl(url)
				.requestFactory(factory)
				.defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
				.build();
	}

	// tenant and the lists are JSON built in RankingRepository, already in the shape the service wants
	Ranked roommates(String tenant, String candidates, int limit) {
		return post("/rank/roommates", "{\"tenant\":" + tenant + ",\"candidates\":" + candidates + ",\"limit\":" + limit + "}");
	}

	Ranked houses(String tenant, String houses, int limit) {
		return post("/rank/houses", "{\"tenant\":" + tenant + ",\"houses\":" + houses + ",\"limit\":" + limit + "}");
	}

	private Ranked post(String path, String body) {
		return http.post().uri(path).body(body).retrieve().body(Ranked.class);
	}
}
