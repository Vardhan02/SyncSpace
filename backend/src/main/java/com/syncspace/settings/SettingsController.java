package com.syncspace.settings;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.syncspace.profile.MeResponse;
import com.syncspace.profile.Profile;
import com.syncspace.profile.ProfileContact;
import com.syncspace.profile.ProfileContactRepository;
import com.syncspace.profile.ProfileRepository;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

// PUT /api/me for both roles
@RestController
public class SettingsController {

	// null fields are left unchanged
	record UpdateRequest(
			@Pattern(regexp = ".*\\S.*", message = "can't be blank") @Size(max = 100) String name,
			@Pattern(regexp = "\\+?[\\d\\s]{7,20}", message = "invalid phone number") String phone,
			Boolean phoneVisible) {
	}

	private final ProfileRepository profiles;
	private final ProfileContactRepository contacts;

	public SettingsController(ProfileRepository profiles, ProfileContactRepository contacts) {
		this.profiles = profiles;
		this.contacts = contacts;
	}

	// same response as GET /api/me
	@PutMapping("/api/me")
	@Transactional
	public MeResponse update(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody UpdateRequest req) {
		UUID me = UUID.fromString(jwt.getSubject());
		Profile p = profiles.findById(me)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "profile not found"));
		if (req.name() != null) {
			p.setName(req.name().trim());
		}

		if (req.phone() != null || req.phoneVisible() != null) {
			// created by the signup trigger
			ProfileContact c = contacts.findById(me)
					.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "contact details not found"));
			if (req.phone() != null) {
				c.setPhone(req.phone().trim());
			}
			if (req.phoneVisible() != null) {
				c.setPhoneVisible(req.phoneVisible());
			}
		}
		return MeResponse.of(p, jwt.getClaimAsString("email"));
	}
}
