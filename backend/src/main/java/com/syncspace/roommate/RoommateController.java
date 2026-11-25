package com.syncspace.roommate;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.syncspace.profile.Roles;
import com.syncspace.profile.UserRole;
import com.syncspace.tenant.TenantCard;
import com.syncspace.tenant.TenantProfiles;
import com.syncspace.tenant.TenantRepository;

@RestController
@RequestMapping("/api/roommates")
public class RoommateController {

	private final Roles roles;
	private final RoommateRepository roommates;
	private final TenantRepository tenants;
	private final TenantProfiles profiles;

	public RoommateController(Roles roles, RoommateRepository roommates, TenantRepository tenants,
			TenantProfiles profiles) {
		this.roles = roles;
		this.roommates = roommates;
		this.tenants = tenants;
		this.profiles = profiles;
	}

	@GetMapping
	public List<TenantCard> deck(@AuthenticationPrincipal Jwt jwt, @RequestParam(defaultValue = "20") int limit) {
		UUID me = onboardedTenant(jwt);
		var candidates = roommates.deck(me, Math.clamp(limit, 1, 50));

		List<UUID> ids = candidates.stream().map(RoommateRepository.Candidate::getId).toList();
		Map<UUID, Integer> scores = candidates.stream()
				.filter(c -> c.getScore() != null)
				.collect(Collectors.toMap(RoommateRepository.Candidate::getId, c -> percent(c.getScore())));
		return profiles.cards(ids, scores);
	}

	@GetMapping("/{id}")
	public TenantCard card(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
		UUID me = onboardedTenant(jwt);
		if (id.equals(me) || !tenants.isOnboarded(id)) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "roommate not found");
		}
		Map<UUID, Integer> score = roommates.score(me, id).map(s -> Map.of(id, percent(s))).orElse(Map.of());
		return profiles.cards(List.of(id), score).get(0);
	}

	private UUID onboardedTenant(Jwt jwt) {
		UUID me = roles.require(jwt, UserRole.tenant);
		if (!tenants.isOnboarded(me)) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "finish onboarding first");
		}
		return me;
	}

	private static int percent(double score) {
		return (int) Math.round(score * 100);
	}
}
