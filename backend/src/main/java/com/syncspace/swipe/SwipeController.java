package com.syncspace.swipe;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.syncspace.profile.Roles;
import com.syncspace.profile.UserRole;
import com.syncspace.tenant.TenantProfiles;
import com.syncspace.tenant.TenantRepository;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

@RestController
@RequestMapping("/api")
public class SwipeController {

	enum Direction {
		left, right
	}

	record SwipeRequest(@NotNull UUID targetId, @NotNull Direction direction) {
	}

	// matched is what the frontend needs for the "It's a match" screen
	record SwipeResult(boolean matched, Long matchId) {
	}

	// Likes tab only shows name and photo, the rest comes after a match
	record LikeItem(UUID id, String name, String photoUrl, Instant likedAt) {
	}

	private final Roles roles;
	private final SwipeRepository swipes;
	private final TenantRepository tenants;
	private final TenantProfiles profiles;

	public SwipeController(Roles roles, SwipeRepository swipes, TenantRepository tenants, TenantProfiles profiles) {
		this.roles = roles;
		this.swipes = swipes;
		this.tenants = tenants;
		this.profiles = profiles;
	}

	@PostMapping("/swipes")
	@Transactional
	public SwipeResult swipe(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody SwipeRequest req) {
		UUID me = onboardedTenant(jwt);
		if (req.targetId().equals(me)) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "can't swipe on yourself");
		}
		if (!tenants.isOnboarded(req.targetId())) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "roommate not found");
		}

		swipes.swipe(me, req.targetId(), req.direction().name());
		Long matchId = req.direction() == Direction.right ? swipes.matchId(me, req.targetId()).orElse(null) : null;
		return new SwipeResult(matchId != null, matchId);
	}

	@GetMapping("/likes")
	public List<LikeItem> likes(@AuthenticationPrincipal Jwt jwt) {
		UUID me = onboardedTenant(jwt);
		return swipes.pendingLikes(me).stream()
				.map(l -> new LikeItem(l.getId(), l.getName(), profiles.photoUrl(l.getPhotoPath()), l.getLikedAt()))
				.toList();
	}

	private UUID onboardedTenant(Jwt jwt) {
		UUID me = roles.require(jwt, UserRole.tenant);
		if (!tenants.isOnboarded(me)) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "finish onboarding first");
		}
		return me;
	}
}
