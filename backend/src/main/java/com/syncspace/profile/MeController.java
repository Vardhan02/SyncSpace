package com.syncspace.profile;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class MeController {

	private final ProfileRepository profiles;

	public MeController(ProfileRepository profiles) {
		this.profiles = profiles;
	}

	@GetMapping("/api/me")
	public MeResponse me(@AuthenticationPrincipal Jwt jwt) {
		Profile p = profiles.findById(UUID.fromString(jwt.getSubject()))
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "profile not found"));
		return MeResponse.of(p, jwt.getClaimAsString("email"));
	}
}
