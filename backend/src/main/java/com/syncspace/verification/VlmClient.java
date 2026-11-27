package com.syncspace.verification;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.annotation.JsonProperty;

//VLM service: POST starts the jobs, GET /listings/{houseId}/verification has the verdict
@Component
public class VlmClient {

	record JobRef(@JsonProperty("job_id") String jobId) {
	}

	record Submitted(Map<String, JobRef> jobs) {
	}

	record ErrorInfo(String code, String message) {
	}

	record AmenityCheck(String name, boolean verified) {
	}

	record AmenitySummary(int selected, int verified) {
	}

	record AmenitiesResult(List<AmenityCheck> amenities, AmenitySummary summary) {
	}

	record AmenitiesRun(@JsonProperty("job_id") String jobId, AmenitiesResult result) {
	}

	record AuditSummary(@JsonProperty("total_claims") int totalClaims, int verified, int contradicted) {
	}

	record AuditResult(AuditSummary summary) {
	}

	record AuditRun(@JsonProperty("job_id") String jobId, AuditResult result) {
	}

	record Log(@JsonProperty("amenities_verify") AmenitiesRun amenities, @JsonProperty("desc_audit") AuditRun audit) {
	}

	// status is PENDING, RUNNING, COMPLETED or FAILED. verification_status is approved, rejected,
	// not_sufficient_data, or null while the jobs are still running
	record Verification(String status, @JsonProperty("status_code") int statusCode,
			@JsonProperty("verification_status") String verificationStatus, ErrorInfo error, Log log) {
	}

	// the service turned the request down (a 4xx), sending it again won't help
	static class Refused extends RuntimeException {
		Refused(String message) {
			super(message);
		}
	}

	private final RestClient http;

	public VlmClient(@Value("${vlm.url:http://localhost:8000}") String url) {
		var factory = new SimpleClientHttpRequestFactory();
		factory.setConnectTimeout(Duration.ofSeconds(5));
		// only the upload of up to six photos, the checking itself happens after it answers
		factory.setReadTimeout(Duration.ofMinutes(2));
		http = RestClient.builder()
				.baseUrl(url)
				.requestFactory(factory)
				.build();
	}

	List<String> submit(Map<String, Object> listing) {
		Submitted s = http.post()
				.uri("/listings/verify")
				.contentType(MediaType.APPLICATION_JSON)
				.body(listing)
				.retrieve()
				.onStatus(code -> code.is4xxClientError(), (req, res) -> {
					throw new Refused("the verification service turned the listing down (" + res.getStatusCode().value() + ")");
				})
				.body(Submitted.class);
		return List.of(s.jobs().get("amenities_verify").jobId(), s.jobs().get("desc_audit").jobId());
	}

	// null when the service has nothing for this house, e.g. it lost its job log
	Verification poll(long houseId) {
		return http.get()
				.uri("/listings/{id}/verification", houseId)
				.exchange((req, res) -> res.getStatusCode().value() == 404 ? null : res.bodyTo(Verification.class));
	}
}
