package com.syncspace.verification;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import com.syncspace.photo.PhotoStorage;
import com.syncspace.verification.VerificationRepository.Listing;
import com.syncspace.verification.VerificationRepository.Photo;
import com.syncspace.verification.VerificationRepository.Waiting;
import com.syncspace.verification.VlmClient.Verification;

import jakarta.annotation.PreDestroy;

// sends a listing to the VLM service in the background and polls for the verdict, the landlord sees "pending" until then
@Service
public class VerificationService {

	private static final Logger log = LoggerFactory.getLogger(VerificationService.class);

	private final VlmClient vlm;
	private final VerificationRepository rows;
	private final PhotoStorage photos;
	private final TransactionTemplate tx;
	private final Duration giveUpAfter;
	// own pool, not a bean: a TaskExecutor bean would take over every @Async in the app
	private final ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();

	public VerificationService(VlmClient vlm, VerificationRepository rows, PhotoStorage photos, TransactionTemplate tx,
			@Value("${vlm.timeout:30m}") Duration timeout) {
		this.vlm = vlm;
		this.rows = rows;
		this.photos = photos;
		this.tx = tx;
		this.giveUpAfter = timeout;

		executor.setCorePoolSize(2);
		executor.setMaxPoolSize(2);
		executor.setQueueCapacity(100);
		executor.setThreadNamePrefix("vlm-");
		executor.initialize();
	}

	@PreDestroy
	void stop() {
		executor.shutdown();
	}

	// Call after the change is saved. Listings without photos have nothing to check yet.
	public void request(long houseId) {
		if (rows.photos(houseId).isEmpty()) {
			return;
		}
		// postgres keeps microseconds, so trim here or the matches on requested_at never hit
		Instant at = Instant.now().truncatedTo(ChronoUnit.MICROS);
		Integer updated = tx.execute(s -> rows.markPending(houseId, at));
		if (updated == null || updated == 0) {
			return;
		}
		// downloading the photos and uploading them takes a few seconds, keep it off the request
		executor.execute(() -> send(houseId, at));
	}

	private void send(long houseId, Instant at) {
		Listing listing = rows.listing(houseId).orElse(null);
		if (listing == null) {
			return;
		}
		try {
			List<String> jobs = vlm.submit(body(houseId, listing));
			tx.execute(s -> rows.saveJobs(houseId, at, String.join(",", jobs)));
		} catch (VlmClient.Refused e) {
			save(houseId, at, false, e.getMessage());
		} catch (RuntimeException e) {
			// stays pending without job ids, resend() tries again later
			log.warn("couldn't send house {} to the vlm service: {}", houseId, e.getMessage());
		}
	}

	@Scheduled(initialDelayString = "${vlm.poll-every:15000}", fixedDelayString = "${vlm.poll-every:15000}")
	public void poll() {
		for (Waiting w : rows.sent()) {
			try {
				check(w);
			} catch (RuntimeException e) {
				log.warn("couldn't poll the vlm service for house {}: {}", w.getHouseId(), e.getMessage());
			}
		}
	}

	private void check(Waiting w) {
		long houseId = w.getHouseId();
		Verification v = vlm.poll(houseId);
		if (v == null) {
			tx.execute(s -> rows.clearJobs(houseId, w.getRequestedAt()));
			return;
		}
		// the service only keeps the latest run, make sure it's the one we sent
		List<String> ours = List.of(w.getJobIds().split(","));
		if (v.log() == null || v.log().amenities() == null || v.log().audit() == null
				|| !ours.contains(v.log().amenities().jobId()) || !ours.contains(v.log().audit().jobId())) {
			return;
		}

		if (v.status().equals("COMPLETED")) {
			boolean passed = "approved".equals(v.verificationStatus());
			tx.executeWithoutResult(s -> {
				if (rows.saveResult(houseId, w.getRequestedAt(), passed, passed ? "verified" : "failed",
						passed ? null : reason(v)) > 0 && v.log().amenities().result() != null) {
					v.log().amenities().result().amenities()
							.forEach(a -> rows.saveAmenity(houseId, a.name(), a.verified()));
				}
			});
		} else if (v.status().equals("FAILED")) {
			if (v.statusCode() == 422) {
				// something about the listing itself, e.g. no usable photos or the description is too short
				save(houseId, w.getRequestedAt(), false,
						v.error() == null ? "the photos couldn't be checked" : v.error().message());
			} else {
				// the model was down or answered nonsense, that's not the landlord's fault: send it again later
				log.warn("vlm service failed on house {}: {}", houseId, v.error() == null ? v.statusCode() : v.error().code());
				tx.execute(s -> rows.clearJobs(houseId, w.getRequestedAt()));
			}
		}
	}

	// not_sufficient_data counts as failed too, the note says what was missing
	private static String reason(Verification v) {
		if ("rejected".equals(v.verificationStatus())) {
			return "none of the amenities or the description could be seen in the photos";
		}
		List<String> parts = new ArrayList<>();
		var amenities = v.log().amenities().result() == null ? null : v.log().amenities().result().summary();
		if (amenities != null && amenities.selected() > 0) {
			parts.add(amenities.verified() + " of " + amenities.selected() + " amenities");
		}
		var claims = v.log().audit().result() == null ? null : v.log().audit().result().summary();
		if (claims != null && claims.totalClaims() > 0) {
			parts.add(claims.verified() + " of " + claims.totalClaims() + " things in the description");
		}
		return parts.isEmpty()
				? "not enough could be checked in the photos"
				: "only " + String.join(" and ", parts) + " could be seen in the photos";
	}

	private void save(long houseId, Instant at, boolean passed, String note) {
		Integer saved = tx.execute(s -> rows.saveResult(houseId, at, passed, passed ? "verified" : "failed", note));
		if (saved == null || saved == 0) {
			log.info("house {} changed while it was being checked, a newer check will save instead", houseId);
		}
	}

	private Map<String, Object> body(long houseId, Listing listing) {
		List<Map<String, Object>> list = new ArrayList<>();
		for (Photo p : rows.photos(houseId)) {
			byte[] bytes = photos.read("house-photos", p.getPath());
			String type = PhotoStorage.imageType(bytes);
			list.add(Map.of(
					"photo_id", p.getPhotoId(),
					"position", p.getPosition(),
					"content_type", type == null ? "image/jpeg" : type,
					"data", Base64.getEncoder().encodeToString(bytes)));
		}
		Map<String, Object> body = new LinkedHashMap<>();
		body.put("house_id", houseId);
		body.put("landlord_id", listing.getLandlordId());
		// the service needs a string; an empty one fails its description check, which counts as failed
		body.put("description", listing.getDescription() == null ? "" : listing.getDescription());
		body.put("amenities", rows.amenities(houseId));
		body.put("photos", list);
		return body;
	}

	// never sent (service was down when it was asked for), or sent but nothing came back in time
	@Scheduled(initialDelayString = "${vlm.resend-delay:120000}", fixedDelayString = "${vlm.resend-every:300000}")
	public void resend() {
		Instant now = Instant.now();
		for (Long id : rows.toResend(now.minus(Duration.ofMinutes(2)), now.minus(giveUpAfter))) {
			request(id);
		}
	}
}
