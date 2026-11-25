package com.syncspace.auth;

import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.server.ResponseStatusException;

import com.syncspace.photo.PhotoStorage;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@RestController
public class AccountController {

	private static final Logger log = LoggerFactory.getLogger(AccountController.class);

	record ChangePasswordRequest(
			@NotBlank String currentPassword,
			@NotBlank @Size(min = 8, message = "password needs at least 8 characters") String newPassword) {
	}

	record DeleteRequest(@NotBlank(message = "enter your password to delete the account") String password) {
	}

	private final SupabaseAuthClient supabase;
	private final AccountRepository accounts;
	private final PhotoStorage photos;
	private final TransactionTemplate tx;

	public AccountController(SupabaseAuthClient supabase, AccountRepository accounts, PhotoStorage photos,
			TransactionTemplate tx) {
		this.supabase = supabase;
		this.accounts = accounts;
		this.photos = photos;
		this.tx = tx;
	}

	@PostMapping("/api/auth/change-password")
	public ResponseEntity<Void> changePassword(@AuthenticationPrincipal Jwt jwt,
			@Valid @RequestBody ChangePasswordRequest req) {
		checkPassword(jwt, req.currentPassword(), "current password is wrong");
		supabase.updatePassword(jwt.getTokenValue(), req.newPassword());
		return ResponseEntity.noContent().build();
	}

	// no undo, this takes every row and photo the account owns with it
	@DeleteMapping("/api/me")
	public ResponseEntity<Void> delete(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody DeleteRequest req) {
		checkPassword(jwt, req.password(), "wrong password");
		UUID me = UUID.fromString(jwt.getSubject());

		List<Object[]> files = tx.execute(status -> {
			List<Object[]> owned = accounts.photos(me);
			accounts.deleteUser(me);
			return owned;
		});

		// rows first, then files: a leftover file is better than a row pointing at nothing
		for (Object[] f : files) {
			try {
				photos.delete((String) f[0], (String) f[1]);
			} catch (RuntimeException e) {
				log.warn("couldn't delete {}/{} for removed account: {}", f[0], f[1], e.getMessage());
			}
		}
		return ResponseEntity.noContent().build();
	}

	// Supabase has no "check password" call, so log in with it and drop that extra session again
	private void checkPassword(Jwt jwt, String password, String message) {
		SupabaseAuthClient.Session check;
		try {
			check = supabase.login(jwt.getClaimAsString("email"), password);
		} catch (HttpClientErrorException e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
		}
		try {
			supabase.logout(check.accessToken());
		} catch (RuntimeException e) {
			log.warn("couldn't close the password check session: {}", e.getMessage());
		}
	}
}
