package com.syncspace.house;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.syncspace.house.HouseBrowseRepository.HouseRow;
import com.syncspace.house.HouseBrowseRepository.MatchLikeRow;
import com.syncspace.house.HouseBrowseRepository.PhotoRow;
import com.syncspace.house.HouseBrowseRepository.RulesRow;
import com.syncspace.listing.ListingService;
import com.syncspace.photo.PhotoStorage;
import com.syncspace.profile.Roles;
import com.syncspace.profile.UserRole;

@RestController
@RequestMapping("/api/houses")
public class HouseController {

	private static final String BUCKET = "house-photos";

	// matches the frontend House type
	record HouseCard(long id, UUID landlordId, String title, String area, String address, int rent, String roomType,
			String availableFrom, int rooms, Integer matchScore, String coverPhoto, int photoCount, boolean verified,
			boolean likedByMe, List<String> likedByMatches) {
	}

	record Rules(Boolean petsAllowed, Boolean smokingAllowed, String guestPolicy, String quietHoursStart,
			String quietHoursEnd, Integer minLeaseMonths, Integer maxOccupants, String extraRules) {
	}

	// no landlord contact details
	record HouseDetail(@JsonUnwrapped HouseCard card, String description, List<String> photos,
			List<String> amenities, @JsonUnwrapped Rules rules) {
	}

	private final Roles roles;
	private final HouseBrowseRepository houses;
	private final PhotoStorage photos;

	public HouseController(Roles roles, HouseBrowseRepository houses, PhotoStorage photos) {
		this.roles = roles;
		this.houses = houses;
		this.photos = photos;
	}

	@GetMapping
	@Transactional(readOnly = true)
	public List<HouseCard> list(@AuthenticationPrincipal Jwt jwt,
			@RequestParam(required = false) String area,
			@RequestParam(required = false) Integer maxRent) {
		UUID me = onboardedTenant(jwt);
		if (area != null && !area.isBlank() && !ListingService.AREAS.contains(area.trim())) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "area: unknown area " + area);
		}
		if (maxRent != null && maxRent < 1) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "maxRent: must be more than 0");
		}
		List<HouseRow> rows = houses.active(me, area == null ? "" : area.trim(), maxRent == null ? 0 : maxRent);
		return cards(me, rows);
	}

	@GetMapping("/{houseId}")
	@Transactional(readOnly = true)
	public HouseDetail detail(@AuthenticationPrincipal Jwt jwt, @PathVariable long houseId) {
		UUID me = onboardedTenant(jwt);
		HouseRow row = houses.visible(me, houseId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "house not found"));
		HouseCard card = cards(me, List.of(row)).get(0);
		List<String> photoUrls = houses.photos(List.of(houseId)).stream()
				.map(p -> photos.url(BUCKET, p.getPath()))
				.toList();
		RulesRow r = houses.rules(houseId).orElse(null);
		Rules rules = r == null
				? new Rules(null, null, null, null, null, null, null, null)
				: new Rules(r.getPetsAllowed(), r.getSmokingAllowed(), r.getGuestPolicy(), r.getQuietHoursStart(),
						r.getQuietHoursEnd(), r.getMinLeaseMonths(), r.getMaxOccupants(), r.getExtraRules());
		return new HouseDetail(card, row.getDescription(), photoUrls, houses.amenities(houseId), rules);
	}

	@PostMapping("/{houseId}/like")
	@Transactional
	public ResponseEntity<Void> like(@AuthenticationPrincipal Jwt jwt, @PathVariable long houseId) {
		UUID me = onboardedTenant(jwt);
		if (!houses.isVisible(houseId)) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "house not found");
		}
		houses.like(me, houseId);
		return ResponseEntity.noContent().build();
	}

	// also works on hidden listings
	@DeleteMapping("/{houseId}/like")
	@Transactional
	public ResponseEntity<Void> unlike(@AuthenticationPrincipal Jwt jwt, @PathVariable long houseId) {
		UUID me = onboardedTenant(jwt);
		if (!houses.exists(houseId)) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "house not found");
		}
		houses.unlike(me, houseId);
		return ResponseEntity.noContent().build();
	}

	private UUID onboardedTenant(Jwt jwt) {
		UUID me = roles.require(jwt, UserRole.tenant);
		if (!houses.isOnboarded(me)) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "finish onboarding first");
		}
		return me;
	}

	// batch queries for all houses
	private List<HouseCard> cards(UUID me, List<HouseRow> rows) {
		if (rows.isEmpty()) {
			return List.of();
		}
		List<Long> ids = rows.stream().map(HouseRow::getId).toList();

		Map<Long, List<String>> photoPaths = houses.photos(ids).stream()
				.collect(Collectors.groupingBy(PhotoRow::getHouseId,
						Collectors.mapping(PhotoRow::getPath, Collectors.toList())));
		Set<Long> liked = new HashSet<>(houses.likedByMe(me, ids));
		Map<Long, List<String>> matchLikes = houses.likedByMatches(me, ids).stream()
				.collect(Collectors.groupingBy(MatchLikeRow::getHouseId,
						Collectors.mapping(MatchLikeRow::getName, Collectors.toList())));

		return rows.stream().map(h -> {
			List<String> paths = photoPaths.getOrDefault(h.getId(), List.of());
			return new HouseCard(h.getId(), h.getLandlordId(), h.getTitle(), h.getArea(), h.getAddress(), h.getRent(),
					h.getRoomType(), h.getAvailableFrom(), h.getRooms(),
					h.getScore() == null ? null : (int) Math.round(h.getScore() * 100),
					paths.isEmpty() ? null : photos.url(BUCKET, paths.get(0)), paths.size(), h.getVerified(),
					liked.contains(h.getId()), matchLikes.getOrDefault(h.getId(), List.of()));
		}).toList();
	}
}
