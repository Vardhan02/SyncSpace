package com.syncspace.application;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.syncspace.application.ApplicationRepository.ApplicationRow;
import com.syncspace.profile.Roles;
import com.syncspace.profile.UserRole;
import com.syncspace.tenant.TenantCard;
import com.syncspace.tenant.TenantProfiles;

@RestController
@RequestMapping("/api/applications")
public class ApplicationController {

	record HouseRef(long houseId, String title) {
	}

	record TenantRef(UUID id, String name, String photoUrl, String email, String phone) {
	}

	record ApplicationItem(long applicationId, String status, Instant createdAt, Instant decidedAt, HouseRef house,
			List<TenantRef> tenants) {
	}

	static final List<String> STATUSES = List.of("pending", "confirmed", "ignored");

	// full tenant profiles, no contact details
	record ApplicationDetail(long applicationId, String status, Instant createdAt, Instant decidedAt, HouseRef house,
			List<TenantCard> tenants) {
	}

	private final Roles roles;
	private final ApplicationRepository applications;
	private final TenantProfiles profiles;

	public ApplicationController(Roles roles, ApplicationRepository applications, TenantProfiles profiles) {
		this.roles = roles;
		this.applications = applications;
		this.profiles = profiles;
	}

	// ?status=confirmed,ignored for the profile's history, no parameter keeps the pending list for the Applications tab
	@GetMapping
	public List<ApplicationItem> list(@AuthenticationPrincipal Jwt jwt,
			@RequestParam(defaultValue = "pending") List<String> status) {
		UUID me = roles.require(jwt, UserRole.landlord);
		List<String> wanted = status.stream().map(String::trim).distinct().toList();
		for (String s : wanted) {
			if (!STATUSES.contains(s)) {
				throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status: must be one of " + STATUSES);
			}
		}
		return applications.withStatus(me, wanted).stream().map(this::item).toList();
	}

	@GetMapping("/{applicationId}")
	public ApplicationDetail detail(@AuthenticationPrincipal Jwt jwt, @PathVariable long applicationId) {
		UUID me = roles.require(jwt, UserRole.landlord);
		ApplicationRow a = mine(me, applicationId);
		return new ApplicationDetail(a.getApplicationId(), a.getStatus(), a.getCreatedAt(), a.getDecidedAt(),
				new HouseRef(a.getHouseId(), a.getHouseTitle()),
				profiles.cards(List.of(a.getTenantAId(), a.getTenantBId()), Map.of()));
	}

	@PostMapping("/{applicationId}/confirm")
	@Transactional
	public ResponseEntity<Void> confirm(@AuthenticationPrincipal Jwt jwt, @PathVariable long applicationId) {
		ApplicationRow a = pending(jwt, applicationId);
		long houseId = a.getHouseId();

		// lock so two confirms cannot take the same last room
		int rooms = applications.lockRooms(houseId);
		if (rooms == 0) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "no rooms left on this listing");
		}
		decide(a, "confirmed");

		// each confirm takes a room, the last one fills the listing and ignores the other applications
		applications.takeRoom(houseId);
		if (rooms == 1) {
			applications.ignorePending(houseId);
		}
		return ResponseEntity.noContent().build();
	}

	@PostMapping("/{applicationId}/ignore")
	@Transactional
	public ResponseEntity<Void> ignore(@AuthenticationPrincipal Jwt jwt, @PathVariable long applicationId) {
		decide(pending(jwt, applicationId), "ignored");
		return ResponseEntity.noContent().build();
	}

	private ApplicationRow pending(Jwt jwt, long applicationId) {
		UUID me = roles.require(jwt, UserRole.landlord);
		ApplicationRow a = mine(me, applicationId);
		if (!a.getStatus().equals("pending")) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "this application was already " + a.getStatus());
		}
		return a;
	}

	// fails if someone decided it in the meantime
	private void decide(ApplicationRow a, String status) {
		if (applications.decide(a.getApplicationId(), status) == 0) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "this application was already decided");
		}
	}

	// the landlord only gets the pair's contact details once they've confirmed them
	private ApplicationItem item(ApplicationRow a) {
		boolean confirmed = a.getStatus().equals("confirmed");
		return new ApplicationItem(a.getApplicationId(), a.getStatus(), a.getCreatedAt(), a.getDecidedAt(),
				new HouseRef(a.getHouseId(), a.getHouseTitle()),
				List.of(new TenantRef(a.getTenantAId(), a.getTenantAName(), profiles.photoUrl(a.getTenantAPhoto()),
								confirmed ? a.getTenantAEmail() : null, confirmed ? a.getTenantAPhone() : null),
						new TenantRef(a.getTenantBId(), a.getTenantBName(), profiles.photoUrl(a.getTenantBPhoto()),
								confirmed ? a.getTenantBEmail() : null, confirmed ? a.getTenantBPhone() : null)));
	}

	// 404 for someone else's application
	private ApplicationRow mine(UUID me, long applicationId) {
		return applications.find(applicationId)
				.filter(a -> a.getLandlordId().equals(me))
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "application not found"));
	}
}
