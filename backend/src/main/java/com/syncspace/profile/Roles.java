package com.syncspace.profile;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

// The token only proves who you are, the role lives in profiles
@Component
public class Roles {

	private final ProfileRepository profiles;

	public Roles(ProfileRepository profiles) {
		this.profiles = profiles;
	}

	public UUID require(Jwt jwt, UserRole role) {
		UUID id = UUID.fromString(jwt.getSubject());
		Profile p = profiles.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "no profile for this account"));
		if (p.getRole() != role) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "only for " + role + "s");
		}
		return id;
	}
}
