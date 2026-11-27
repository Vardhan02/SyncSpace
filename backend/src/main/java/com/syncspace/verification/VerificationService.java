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

import jakarta.annotation.PreDestroy;

// runs the VLM check in the background, the landlord sees "pending" until it's done
@Service
public class VerificationService {

	private static final Logger log = LoggerFactory.getLogger(VerificationService.class);

	private final VlmClient vlm;
	private final VerificationRepository rows;
	private final PhotoStorage photos;
	private final TransactionTemplate tx;
	private final Duration retryAfter;
	// own pool, not a bean: a TaskExecutor bean would take over every @Async in the app
	private final ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();

	public VerificationService(VlmClient vlm, VerificationRepository rows, PhotoStorage photos, TransactionTemplate tx,
			@Value("${vlm.timeout:10m}") Duration timeout) {
		this.vlm = vlm;
		this.rows = rows;
		this.photos = photos;
		this.tx = tx;
		// a check is only "stuck" once it's had the full timeout plus a bit
		this.retryAfter = timeout.plusMinutes(5);

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
		// postgres keeps microseconds, so trim here or the saveResult match never hits
		Instant at = Instant.now().truncatedTo(ChronoUnit.MICROS);
		Integer updated = tx.execute(s -> rows.markPending(houseId, at));
		if (updated == null || updated == 0) {
			return;
		}
		executor.execute(() -> run(houseId, at));
	}

	private void run(long houseId, Instant at) {
		Listing listing = rows.listing(houseId).orElse(null);
		if (listing == null) {
			return;
		}
		VlmClient.Result result;
		try {
			result = vlm.verify(body(houseId, listing));
		} catch (RuntimeException e) {
			// stays pending, retryStuck picks it up again later
			log.warn("vlm check for house {} didn't finish: {}", houseId, e.getMessage());
			return;
		}

		boolean passed = result != null && result.passed();
		String note = result == null ? null : result.reason();
		if (!passed && note == null) {
			note = "the photos don't match the description or amenities";
		}
		String finalNote = note;
		Integer saved = tx.execute(s -> rows.saveResult(houseId, at, passed, passed ? "verified" : "failed", finalNote));
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
		body.put("description", listing.getDescription());
		body.put("amenities", rows.amenities(houseId));
		body.put("photos", list);
		return body;
	}

	// after a restart, or while the VLM service was down
	@Scheduled(initialDelayString = "${vlm.retry-delay:120000}", fixedDelayString = "${vlm.retry-every:300000}")
	public void retryStuck() {
		for (Long id : rows.stuckSince(Instant.now().minus(retryAfter))) {
			request(id);
		}
	}
}
