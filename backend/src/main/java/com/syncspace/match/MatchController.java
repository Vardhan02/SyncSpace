package com.syncspace.match;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.syncspace.match.MatchRepository.MatchRow;
import com.syncspace.match.MatchRepository.SharedRow;
import com.syncspace.photo.PhotoStorage;
import com.syncspace.profile.Roles;
import com.syncspace.profile.UserRole;
import com.syncspace.tenant.TenantProfiles;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

@RestController
@RequestMapping("/api")
public class MatchController {

	// phone is null unless they turned it on
	record MatchItem(long matchId, UUID id, String name, String photoUrl, String email, String phone, Instant matchedAt) {
	}

	record SharedHouse(long houseId, String title, String area, int rent, String status, String coverPhoto,
			boolean sharedByMe, Instant sharedAt, boolean iApplied, boolean theyApplied,
			boolean likedByMe, boolean likedByThem, String applicationStatus) {
	}

	record HouseRequest(@NotNull Long houseId) {
	}

	record ApplyResult(boolean bothApplied, String applicationStatus) {
	}

	record MyApplication(long applicationId, long matchId, String partnerName, long houseId, String houseTitle,
			String status, Instant createdAt, Instant decidedAt) {
	}

	record LandlordContact(long applicationId, long houseId, String houseTitle, String landlordName, String email,
			String phone) {
	}

	private final Roles roles;
	private final MatchRepository matches;
	private final TenantProfiles profiles;
	private final PhotoStorage photos;

	public MatchController(Roles roles, MatchRepository matches, TenantProfiles profiles, PhotoStorage photos) {
		this.roles = roles;
		this.matches = matches;
		this.profiles = profiles;
		this.photos = photos;
	}

	@GetMapping("/matches")
	public List<MatchItem> list(@AuthenticationPrincipal Jwt jwt) {
		UUID me = roles.require(jwt, UserRole.tenant);
		return matches.matches(me).stream()
				.map(m -> new MatchItem(m.getMatchId(), m.getOtherId(), m.getName(), profiles.photoUrl(m.getPhotoPath()),
						m.getEmail(), m.getPhone(), m.getMatchedAt()))
				.toList();
	}

	@GetMapping("/matches/{matchId}/houses")
	public List<SharedHouse> sharedHouses(@AuthenticationPrincipal Jwt jwt, @PathVariable long matchId) {
		UUID me = roles.require(jwt, UserRole.tenant);
		MatchRow m = myMatch(me, matchId);
		return matches.sharedHouses(matchId, me, m.getOtherId()).stream()
				.map(h -> shared(h, me, m.getIAmA()))
				.toList();
	}

	@PostMapping("/matches/{matchId}/houses")
	@Transactional
	public ResponseEntity<Void> share(@AuthenticationPrincipal Jwt jwt, @PathVariable long matchId,
			@Valid @RequestBody HouseRequest req) {
		UUID me = roles.require(jwt, UserRole.tenant);
		myMatch(me, matchId);
		if (!matches.isListed(req.houseId())) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "house not found");
		}
		if (matches.isShared(matchId, req.houseId())) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "already shared with this match");
		}
		matches.share(matchId, req.houseId(), me);
		return ResponseEntity.status(HttpStatus.CREATED).build();
	}

	@PostMapping("/matches/{matchId}/apply")
	@Transactional
	public ApplyResult apply(@AuthenticationPrincipal Jwt jwt, @PathVariable long matchId,
			@Valid @RequestBody HouseRequest req) {
		UUID me = roles.require(jwt, UserRole.tenant);
		MatchRow m = myMatch(me, matchId);
		long houseId = req.houseId();
		if (!matches.isShared(matchId, houseId)) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "that house isn't shared in this match");
		}
		if (!matches.isListed(houseId)) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "this house isn't taking applications");
		}

		matches.apply(matchId, houseId, m.getIAmA());
		String status = matches.applicationStatus(matchId, houseId).orElse(null);
		return new ApplyResult(status != null, status);
	}

	@GetMapping("/applications/mine")
	public List<MyApplication> myApplications(@AuthenticationPrincipal Jwt jwt) {
		UUID me = roles.require(jwt, UserRole.tenant);
		return matches.applications(me).stream()
				.map(a -> new MyApplication(a.getApplicationId(), a.getMatchId(), a.getPartnerName(), a.getHouseId(),
						a.getHouseTitle(), a.getStatus(), a.getCreatedAt(), a.getDecidedAt()))
				.toList();
	}

	@GetMapping("/landlord-contacts")
	public List<LandlordContact> landlordContacts(@AuthenticationPrincipal Jwt jwt) {
		UUID me = roles.require(jwt, UserRole.tenant);
		return matches.landlordContacts(me).stream()
				.map(c -> new LandlordContact(c.getApplicationId(), c.getHouseId(), c.getHouseTitle(), c.getLandlordName(),
						c.getEmail(), c.getPhone()))
				.toList();
	}

	// 404 rather than 403 when it's someone else's match, so ids can't be probed
	private MatchRow myMatch(UUID me, long matchId) {
		return matches.match(me, matchId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "match not found"));
	}

	private SharedHouse shared(SharedRow h, UUID me, boolean iAmA) {
		Instant mine = iAmA ? h.getAAppliedAt() : h.getBAppliedAt();
		Instant theirs = iAmA ? h.getBAppliedAt() : h.getAAppliedAt();
		return new SharedHouse(h.getHouseId(), h.getTitle(), h.getArea(), h.getRent(), h.getStatus(),
				photos.url("house-photos", h.getCoverPath()), me.equals(h.getSharedBy()), h.getSharedAt(),
				mine != null, theirs != null, h.getLikedByMe(), h.getLikedByThem(), h.getApplicationStatus());
	}
}
