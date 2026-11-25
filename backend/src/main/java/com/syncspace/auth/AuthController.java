package com.syncspace.auth;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.syncspace.profile.UserRole;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

	public record SignupRequest(
			@NotBlank(message = "name is required") String name,
			@NotBlank(message = "email is required") @Email(message = "invalid email") String email,
			@NotBlank(message = "phone is required")
			@Pattern(regexp = "\\+?[\\d\\s]{7,20}", message = "invalid phone number") String phone,
			@NotBlank @Size(min = 8, message = "password needs at least 8 characters") String password,
			@NotNull(message = "pick tenant or landlord") UserRole role,
			Boolean phoneVisible) {
	}

	public record LoginRequest(@NotBlank String email, @NotBlank String password) {
	}

	public record RefreshRequest(@NotBlank String refreshToken) {
	}

	public record EmailRequest(@NotBlank @Email(message = "invalid email") String email) {
	}

	public record PasswordRequest(@NotBlank @Size(min = 8, message = "password needs at least 8 characters") String password) {
	}

	private final AuthService auth;
	private final SupabaseAuthClient supabase;

	public AuthController(AuthService auth, SupabaseAuthClient supabase) {
		this.auth = auth;
		this.supabase = supabase;
	}

	@PostMapping("/signup")
	public ResponseEntity<?> signup(@Valid @RequestBody SignupRequest req) {
		AuthResponse res = auth.signup(req);
		if (res == null) {
			return ResponseEntity.accepted().body(Map.of("message", "check your email to confirm your account"));
		}
		return ResponseEntity.status(HttpStatus.CREATED).body(res);
	}

	@PostMapping("/login")
	public AuthResponse login(@Valid @RequestBody LoginRequest req) {
		return auth.login(req.email(), req.password());
	}

	@PostMapping("/refresh")
	public AuthResponse refresh(@Valid @RequestBody RefreshRequest req) {
		return auth.refresh(req.refreshToken());
	}

	@PostMapping("/logout")
	public ResponseEntity<Void> logout(@AuthenticationPrincipal Jwt jwt) {
		supabase.logout(jwt.getTokenValue());
		return ResponseEntity.noContent().build();
	}

	// always 204 so nobody can use this to check which emails have accounts
	@PostMapping("/forgot-password")
	public ResponseEntity<Void> forgotPassword(@Valid @RequestBody EmailRequest req) {
		supabase.sendPasswordReset(req.email().trim());
		return ResponseEntity.noContent().build();
	}

	// called with the token from the reset email link
	@PostMapping("/reset-password")
	public ResponseEntity<Void> resetPassword(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody PasswordRequest req) {
		supabase.updatePassword(jwt.getTokenValue(), req.password());
		return ResponseEntity.noContent().build();
	}
}
