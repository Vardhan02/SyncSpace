package com.syncspace.tenant;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.syncspace.photo.PhotoStorage;
import com.syncspace.profile.ProfileContact;
import com.syncspace.profile.ProfileContactRepository;
import com.syncspace.profile.Roles;
import com.syncspace.profile.UserRole;
import com.syncspace.ranking.RankingService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/tenants/me")
public class TenantController {

	private static final Logger log = LoggerFactory.getLogger(TenantController.class);
	private static final String BUCKET = "tenant-photos";

	// your own profile: the card plus the things only you see
	record MyProfile(@JsonUnwrapped TenantCard card, String email, String phone, boolean phoneVisible,
			boolean onboardingComplete) {
	}

	private final Roles roles;
	private final TenantService service;
	private final TenantProfiles profiles;
	private final TenantRepository tenants;
	private final ProfileContactRepository contacts;
	private final PhotoStorage photos;
	private final RankingService ranking;

	public TenantController(Roles roles, TenantService service, TenantProfiles profiles, TenantRepository tenants,
			ProfileContactRepository contacts, PhotoStorage photos, RankingService ranking) {
		this.roles = roles;
		this.service = service;
		this.profiles = profiles;
		this.tenants = tenants;
		this.contacts = contacts;
		this.photos = photos;
		this.ranking = ranking;
	}

	@GetMapping
	public MyProfile me(@AuthenticationPrincipal Jwt jwt) {
		UUID me = roles.require(jwt, UserRole.tenant);
		return myProfile(me, jwt);
	}

	@PutMapping
	public MyProfile save(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody OnboardingAnswers req) {
		UUID me = roles.require(jwt, UserRole.tenant);
		service.save(me, req);
		ranking.refreshLater(me);
		return myProfile(me, jwt);
	}

	@PostMapping("/photo")
	public Map<String, String> photo(@AuthenticationPrincipal Jwt jwt, @RequestParam("file") MultipartFile file)
			throws IOException {
		UUID me = roles.require(jwt, UserRole.tenant);
		byte[] bytes = file.getBytes();
		String type = PhotoStorage.imageType(bytes);
		if (type == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "photo has to be a jpg or png");
		}

		// new path every time, the CDN would keep serving an overwritten file
		String path = photos.upload(BUCKET, "tenants/" + me + "/" + UUID.randomUUID() + "." + PhotoStorage.extension(type),
				bytes, type);
		String old;
		try {
			old = service.setPhoto(me, path);
		} catch (RuntimeException e) {
			photos.delete(BUCKET, path);
			throw e;
		}

		if (old != null) {
			try {
				photos.delete(BUCKET, old);
			} catch (RuntimeException e) {
				log.warn("couldn't delete old photo {}: {}", old, e.getMessage());
			}
		}
		// the photo can be what finishes onboarding
		ranking.refreshLater(me);
		return Map.of("photoUrl", photos.url(BUCKET, path));
	}

	private MyProfile myProfile(UUID me, Jwt jwt) {
		ProfileContact c = contacts.findById(me).orElse(null);
		boolean complete = tenants.findById(me).map(Tenant::isOnboardingComplete).orElse(false);
		return new MyProfile(profiles.card(me), jwt.getClaimAsString("email"),
				c == null ? null : c.getPhone(), c != null && c.isPhoneVisible(), complete);
	}
}
