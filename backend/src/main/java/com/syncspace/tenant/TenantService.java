package com.syncspace.tenant;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.syncspace.profile.ProfileRepository;
import com.syncspace.tenant.OnboardingAnswers.PromptAnswer;

@Service
public class TenantService {

	// same lists as frontend/src/lib/onboardingOptions.ts
	static final Set<String> AREAS = Set.of("Bishopstown", "Blackrock", "College Road", "Douglas", "Shandon",
			"The Lough", "Victoria Cross", "Wilton");
	static final List<String> ROOM_TYPES = List.of("single", "double", "ensuite");
	static final List<Integer> LEASE_MONTHS = List.of(3, 5, 9, 12);

	private final TenantRepository tenants;
	private final HousePreferencesRepository housePrefs;
	private final LifestyleRepository lifestyles;
	private final ProfileRepository profiles;

	public TenantService(TenantRepository tenants, HousePreferencesRepository housePrefs,
			LifestyleRepository lifestyles, ProfileRepository profiles) {
		this.tenants = tenants;
		this.housePrefs = housePrefs;
		this.lifestyles = lifestyles;
		this.profiles = profiles;
	}

	@Transactional
	public void save(UUID me, OnboardingAnswers req) {
		check(req);

		Tenant t = tenantRow(me);
		t.setAge(req.age());
		t.setUniversity(req.university().trim());
		t.setCourse(req.course().trim());
		t.setBio(req.bio().trim());

		HousePreferences h = housePrefs.findById(me).orElseGet(() -> new HousePreferences(me));
		h.setBudget(req.budgetMin(), req.budgetMax());
		h.setPreferredAreas(req.preferredAreas().stream().map(String::trim).distinct().toList());
		h.setRoomType(req.roomType());
		h.setMoveInDate(req.moveInDate());
		h.setLeaseMonths(req.leaseMonths());
		h.setMaxHousemates(req.maxHousemates());
		housePrefs.save(h);

		Lifestyle l = lifestyles.findById(me).orElseGet(() -> new Lifestyle(me));
		l.setSleepSchedule(req.sleepSchedule());
		l.setNoiseTolerance(req.noiseTolerance());
		l.setCleanliness(req.cleanliness());
		l.setWorkSchedule(req.workSchedule());
		l.setSocialLevel(req.socialLevel());
		l.setGuestFrequency(req.guestFrequency());
		l.setSmoker(req.smoker());
		l.setOkWithSmoking(req.okWithSmoking());
		l.setHasPets(req.hasPets());
		l.setOkWithPets(req.okWithPets());
		lifestyles.save(l);

		// "Gym" and "gym " are the same interest, keep the first spelling
		Map<String, String> interests = new LinkedHashMap<>();
		for (String interest : req.interests()) {
			interests.putIfAbsent(interest.trim().toLowerCase(), interest.trim());
		}
		tenants.clearInterests(me);
		interests.values().forEach(interest -> tenants.addInterest(me, interest));

		tenants.clearAnswers(me);
		for (int i = 0; i < req.prompts().size(); i++) {
			PromptAnswer a = req.prompts().get(i);
			tenants.addAnswer(me, i + 1, a.promptId(), a.answer().trim());
		}

		finishIfReady(t);
	}

	// returns the old path so the caller can delete that file once this has committed
	@Transactional
	public String setPhoto(UUID me, String path) {
		Tenant t = tenantRow(me);
		String old = t.getPhotoUrl();
		t.setPhotoUrl(path);
		finishIfReady(t);
		return old;
	}

	// Onboarding is done once both the answers (PUT) and the photo are in, whichever comes last
	private void finishIfReady(Tenant t) {
		if (t.isOnboardingComplete() || t.getPhotoUrl() == null || !housePrefs.existsById(t.getId())) {
			return;
		}
		t.setOnboardingComplete(true);
		profiles.findById(t.getId()).ifPresent(p -> p.setFirstLogin(false));
	}

	private void check(OnboardingAnswers req) {
		if (req.budgetMax() < req.budgetMin()) {
			throw bad("budgetMax: can't be lower than budgetMin");
		}
		for (String area : req.preferredAreas()) {
			if (!AREAS.contains(area.trim())) {
				throw bad("preferredAreas: unknown area " + area);
			}
		}
		if (!ROOM_TYPES.contains(req.roomType())) {
			throw bad("roomType: must be one of " + ROOM_TYPES);
		}
		if (!LEASE_MONTHS.contains(req.leaseMonths())) {
			throw bad("leaseMonths: must be one of " + LEASE_MONTHS);
		}

		List<Integer> promptIds = req.prompts().stream().map(PromptAnswer::promptId).toList();
		if (promptIds.stream().distinct().count() != promptIds.size()) {
			throw bad("prompts: pick 3 different prompts");
		}
		if (promptIds.stream().anyMatch(id -> id < 1 || id > 10)) {
			throw bad("prompts: promptId must be 1 to 10");
		}
	}

	private Tenant tenantRow(UUID me) {
		tenants.createIfMissing(me);
		return tenants.findById(me).orElseThrow();
	}

	private static ResponseStatusException bad(String message) {
		return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
	}
}
