package com.syncspace.landlord;

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

import com.syncspace.landlord.LandlordRepository.PreferencesRow;
import com.syncspace.photo.PhotoStorage;
import com.syncspace.profile.Profile;
import com.syncspace.profile.ProfileContact;
import com.syncspace.profile.ProfileContactRepository;
import com.syncspace.profile.ProfileRepository;
import com.syncspace.profile.Roles;
import com.syncspace.profile.UserRole;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

@RestController
@RequestMapping("/api/landlords/me")
public class LandlordController {

	private static final Logger log = LoggerFactory.getLogger(LandlordController.class);
	private static final String BUCKET = "tenant-photos";

	record PreferencesRequest(@NotNull TenantType preferredTenants, @NotNull Integer minLeaseMonths,
			@NotNull Boolean referencesRequired) {
	}

	// preferences are null until step 1 is saved
	record MyLandlordProfile(UUID id, String name, String photoUrl, String email, String phone, boolean phoneVisible,
			boolean onboardingComplete, String preferredTenants, Integer minLeaseMonths, Boolean referencesRequired) {
	}

	private final Roles roles;
	private final LandlordService service;
	private final LandlordRepository landlords;
	private final ProfileRepository profiles;
	private final ProfileContactRepository contacts;
	private final PhotoStorage photos;

	public LandlordController(Roles roles, LandlordService service, LandlordRepository landlords,
			ProfileRepository profiles, ProfileContactRepository contacts, PhotoStorage photos) {
		this.roles = roles;
		this.service = service;
		this.landlords = landlords;
		this.profiles = profiles;
		this.contacts = contacts;
		this.photos = photos;
	}

	@GetMapping
	public MyLandlordProfile me(@AuthenticationPrincipal Jwt jwt) {
		UUID me = roles.require(jwt, UserRole.landlord);
		return myProfile(me, jwt);
	}

	@PutMapping("/preferences")
	public MyLandlordProfile savePreferences(@AuthenticationPrincipal Jwt jwt,
			@Valid @RequestBody PreferencesRequest req) {
		UUID me = roles.require(jwt, UserRole.landlord);
		service.savePreferences(me, req.preferredTenants(), req.minLeaseMonths(), req.referencesRequired());
		return myProfile(me, jwt);
	}

	@PostMapping("/photo")
	public Map<String, String> photo(@AuthenticationPrincipal Jwt jwt, @RequestParam("file") MultipartFile file)
			throws IOException {
		UUID me = roles.require(jwt, UserRole.landlord);
		byte[] bytes = file.getBytes();
		String type = PhotoStorage.imageType(bytes);
		if (type == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "photo has to be a jpg or png");
		}

		// new path each time because of the CDN cache
		String path = photos.upload(BUCKET, "landlords/" + me + "/" + UUID.randomUUID() + "." + PhotoStorage.extension(type),
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
		return Map.of("photoUrl", photos.url(BUCKET, path));
	}

	private MyLandlordProfile myProfile(UUID me, Jwt jwt) {
		Profile p = profiles.findById(me).orElseThrow();
		ProfileContact c = contacts.findById(me).orElse(null);
		PreferencesRow prefs = landlords.preferences(me).orElse(null);
		return new MyLandlordProfile(me, p.getName(), photos.url(BUCKET, landlords.photoPath(me).orElse(null)),
				jwt.getClaimAsString("email"), c == null ? null : c.getPhone(), c != null && c.isPhoneVisible(),
				!p.isFirstLogin(),
				prefs == null ? null : prefs.getPreferredTenants(),
				prefs == null ? null : prefs.getMinLeaseMonths(),
				prefs == null ? null : prefs.getReferencesRequired());
	}
}
