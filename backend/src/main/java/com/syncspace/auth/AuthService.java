package com.syncspace.auth;

import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.syncspace.auth.AuthController.SignupRequest;
import com.syncspace.profile.MeResponse;
import com.syncspace.profile.Profile;
import com.syncspace.profile.ProfileContactRepository;
import com.syncspace.profile.ProfileRepository;

@Service
public class AuthService {

	private final SupabaseAuthClient supabase;
	private final ProfileRepository profiles;
	private final ProfileContactRepository contacts;

	public AuthService(SupabaseAuthClient supabase, ProfileRepository profiles, ProfileContactRepository contacts) {
		this.supabase = supabase;
		this.profiles = profiles;
		this.contacts = contacts;
	}

	// null means supabase wants the email confirmed before the first login
	public AuthResponse signup(SignupRequest req) {
		var metadata = Map.of(
				"name", req.name().trim(),
				"phone", req.phone().trim(),
				"role", req.role().name());
		var session = supabase.signup(req.email().trim(), req.password(), metadata);
		if (session.accessToken() == null) {
			return null;
		}

		// the signup trigger always creates the contact row with phone_visible = false
		if (Boolean.TRUE.equals(req.phoneVisible())) {
			UUID id = UUID.fromString(session.user().id());
			contacts.findById(id).ifPresent(c -> {
				c.setPhoneVisible(true);
				contacts.save(c);
			});
		}
		return toResponse(session);
	}

	public AuthResponse login(String email, String password) {
		return toResponse(supabase.login(email.trim(), password));
	}

	public AuthResponse refresh(String refreshToken) {
		return toResponse(supabase.refresh(refreshToken));
	}

	private AuthResponse toResponse(SupabaseAuthClient.Session session) {
		UUID id = UUID.fromString(session.user().id());
		Profile profile = profiles.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "profile not found"));

		return new AuthResponse(session.accessToken(), session.refreshToken(), session.expiresIn(),
				MeResponse.of(profile, session.user().email()));
	}
}
