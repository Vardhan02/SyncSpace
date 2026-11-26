package com.syncspace.tenant;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.syncspace.profile.Profile;
import com.syncspace.profile.ProfileRepository;
import com.syncspace.photo.PhotoStorage;

// one query per table for the whole batch, not per tenant
@Component
public class TenantProfiles {

	private final ProfileRepository profiles;
	private final TenantRepository tenants;
	private final HousePreferencesRepository housePrefs;
	private final LifestyleRepository lifestyles;
	private final PhotoStorage photos;

	public TenantProfiles(ProfileRepository profiles, TenantRepository tenants, HousePreferencesRepository housePrefs,
			LifestyleRepository lifestyles, PhotoStorage photos) {
		this.profiles = profiles;
		this.tenants = tenants;
		this.housePrefs = housePrefs;
		this.lifestyles = lifestyles;
		this.photos = photos;
	}

	public String photoUrl(String path) {
		return photos.url("tenant-photos", path);
	}

	// keeps the order of ids, drops any id that isn't a tenant
	@Transactional(readOnly = true)
	public List<TenantCard> cards(List<UUID> ids, Map<UUID, Integer> scores) {
		if (ids.isEmpty()) {
			return List.of();
		}
		Map<UUID, Tenant> tenantById = byId(tenants.findAllById(ids), Tenant::getId);
		Map<UUID, Profile> profileById = byId(profiles.findAllById(ids), Profile::getId);
		Map<UUID, HousePreferences> prefsById = byId(housePrefs.findAllById(ids), HousePreferences::getTenantId);
		Map<UUID, Lifestyle> lifestyleById = byId(lifestyles.findAllById(ids), Lifestyle::getTenantId);

		Map<UUID, List<String>> interests = tenants.interests(ids).stream()
				.collect(Collectors.groupingBy(TenantRepository.InterestRow::getTenantId,
						Collectors.mapping(TenantRepository.InterestRow::getInterest, Collectors.toList())));
		Map<UUID, List<TenantCard.Answer>> answers = tenants.answers(ids).stream()
				.collect(Collectors.groupingBy(TenantRepository.AnswerRow::getTenantId,
						Collectors.mapping(a -> new TenantCard.Answer(a.getPromptId(), a.getText(), a.getAnswer()),
								Collectors.toList())));

		List<TenantCard> cards = new ArrayList<>();
		for (UUID id : ids) {
			Tenant t = tenantById.get(id);
			Profile p = profileById.get(id);
			if (t == null || p == null) {
				continue;
			}
			HousePreferences h = prefsById.get(id);
			Lifestyle l = lifestyleById.get(id);
			cards.add(new TenantCard(
					id, p.getName(), t.getAge(), photoUrl(t.getPhotoUrl()), t.getUniversity(), t.getCourse(), t.getBio(),
					h == null ? null : h.getBudgetMin(),
					h == null ? null : h.getBudgetMax(),
					h == null ? null : h.getPreferredAreas(),
					h == null ? null : h.getRoomType(),
					h == null ? null : h.getMoveInDate(),
					h == null ? null : h.getLeaseMonths(),
					h == null ? null : h.getMaxHousemates(),
					l == null ? null : l.getSleepSchedule(),
					l == null ? null : l.getNoiseTolerance(),
					l == null ? null : l.getCleanliness(),
					l == null ? null : l.getWorkSchedule(),
					l == null ? null : l.getSocialLevel(),
					l == null ? null : l.getGuestFrequency(),
					l == null ? null : l.isSmoker(),
					l == null ? null : l.isOkWithSmoking(),
					l == null ? null : l.isHasPets(),
					l == null ? null : l.isOkWithPets(),
					interests.getOrDefault(id, List.of()),
					answers.getOrDefault(id, List.of()),
					scores.get(id)));
		}
		return cards;
	}

	public TenantCard card(UUID id) {
		List<TenantCard> one = cards(List.of(id), Map.of());
		return one.isEmpty() ? null : one.get(0);
	}

	private static <T> Map<UUID, T> byId(Collection<T> rows, Function<T, UUID> id) {
		return rows.stream().collect(Collectors.toMap(id, Function.identity()));
	}
}
