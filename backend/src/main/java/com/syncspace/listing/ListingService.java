package com.syncspace.listing;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.syncspace.landlord.LandlordRepository;
import com.syncspace.listing.HouseRepository.PhotoRow;

@Service
public class ListingService {

	// same as onboardingOptions.ts
	public static final Set<String> AREAS = Set.of("Bishopstown", "Blackrock", "College Road", "Douglas", "Shandon",
			"The Lough", "Victoria Cross", "Wilton");
	static final List<String> ROOM_TYPES = List.of("single", "double", "ensuite");
	static final List<Integer> MIN_LEASE_MONTHS = List.of(1, 3, 5, 9, 12);
	public static final int MAX_PHOTOS = 6;

	private final HouseRepository houses;
	private final HouseRulesRepository rules;
	private final LandlordRepository landlords;

	public ListingService(HouseRepository houses, HouseRulesRepository rules, LandlordRepository landlords) {
		this.houses = houses;
		this.rules = rules;
		this.landlords = landlords;
	}

	@Transactional
	public long create(UUID me, ListingRequest req) {
		Set<String> amenities = check(req);
		if (req.status() == ListingStatus.pending || req.status() == ListingStatus.filled) {
			throw bad("status: a new listing can only be draft or active");
		}
		if (req.roomsAvailable() == 0) {
			throw bad("roomsAvailable: must be at least 1");
		}

		landlords.createIfMissing(me);
		House h = new House(me);
		apply(h, req);
		h.setStatus(req.status() == null ? ListingStatus.active : req.status());
		h = houses.saveAndFlush(h);

		HouseRules r = new HouseRules(h.getId());
		apply(r, req);
		rules.save(r);

		houses.addAmenities(h.getId(), amenities);
		return h.getId();
	}

	@Transactional
	public void update(UUID me, long houseId, ListingRequest req) {
		Set<String> amenities = check(req);
		House h = owned(me, houseId);
		apply(h, req);

		// landlords can only set draft or active
		if (req.status() != null) {
			if (req.status() != ListingStatus.draft && req.status() != ListingStatus.active) {
				throw bad("status: can only be set to draft or active");
			}
			h.setStatus(req.status());
		}
		// active needs at least 1 room
		if (h.getStatus() == ListingStatus.active && h.getRoomsAvailable() == 0) {
			throw bad("roomsAvailable: an active listing needs at least 1 room");
		}

		HouseRules r = rules.findById(houseId).orElseGet(() -> new HouseRules(houseId));
		apply(r, req);
		rules.save(r);

		houses.removeAmenitiesExcept(houseId, amenities);
		houses.addAmenities(houseId, amenities);
	}

	// returns the photo paths to delete
	@Transactional
	public List<String> delete(UUID me, long houseId) {
		House h = owned(me, houseId);
		List<String> paths = houses.photos(List.of(houseId)).stream().map(PhotoRow::getPath).toList();
		// everything else is deleted by cascade
		houses.delete(h);
		return paths;
	}

	// checked again in addPhotos
	@Transactional(readOnly = true)
	public void checkRoomForPhotos(UUID me, long houseId, int adding) {
		owned(me, houseId);
		int existing = houses.photos(List.of(houseId)).size();
		if (existing + adding > MAX_PHOTOS) {
			throw new ResponseStatusException(HttpStatus.CONFLICT,
					"a listing can have at most " + MAX_PHOTOS + " photos, it has " + existing);
		}
	}

	@Transactional
	public void addPhotos(UUID me, long houseId, List<String> paths) {
		owned(me, houseId);
		houses.lock(houseId);
		int position = houses.nextPosition(houseId);
		int existing = houses.photos(List.of(houseId)).size();
		if (existing + paths.size() > MAX_PHOTOS) {
			throw new ResponseStatusException(HttpStatus.CONFLICT,
					"a listing can have at most " + MAX_PHOTOS + " photos, it has " + existing);
		}
		for (String path : paths) {
			houses.addPhoto(houseId, path, position++);
		}
		landlords.finishOnboardingIfReady(me);
	}

	// returns the path to delete
	@Transactional
	public String deletePhoto(UUID me, long houseId, long photoId) {
		owned(me, houseId);
		houses.lock(houseId);
		List<PhotoRow> photos = houses.photos(List.of(houseId));
		PhotoRow photo = photos.stream().filter(p -> p.getPhotoId() == photoId).findFirst()
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "photo not found"));
		if (photos.size() == 1) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "a listing needs at least one photo");
		}
		houses.deletePhoto(photoId);
		return photo.getPath();
	}

	// 404 for someone else's listing
	public House owned(UUID me, long houseId) {
		return houses.findById(houseId)
				.filter(h -> h.getLandlordId().equals(me))
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "listing not found"));
	}

	private static void apply(House h, ListingRequest req) {
		h.setTitle(req.title().trim());
		h.setArea(req.area().trim());
		h.setAddress(req.address().trim());
		h.setRent(req.rent());
		h.setRoomType(req.roomType());
		h.setAvailableFrom(req.availableFrom());
		h.setRoomsAvailable(req.roomsAvailable());
		h.setDescription(blankToNull(req.description()));
	}

	private static void apply(HouseRules r, ListingRequest req) {
		r.setPetsAllowed(req.petsAllowed());
		r.setSmokingAllowed(req.smokingAllowed());
		r.setGuestPolicy(req.guestPolicy());
		// no start means no quiet hours
		r.setQuietHours(req.quietHoursStart(), req.quietHoursStart() == null ? null : req.quietHoursEnd());
		r.setMinLeaseMonths(req.minLeaseMonths());
		r.setMaxOccupants(req.maxOccupants());
		r.setExtraRules(blankToNull(req.extraRules()));
	}

	// trimmed and deduplicated
	private Set<String> check(ListingRequest req) {
		if (!AREAS.contains(req.area().trim())) {
			throw bad("area: must be one of " + AREAS.stream().sorted().toList());
		}
		if (!ROOM_TYPES.contains(req.roomType())) {
			throw bad("roomType: must be one of " + ROOM_TYPES);
		}
		if (!MIN_LEASE_MONTHS.contains(req.minLeaseMonths())) {
			throw bad("minLeaseMonths: must be one of " + MIN_LEASE_MONTHS);
		}
		if (req.quietHoursStart() != null && req.quietHoursEnd() == null) {
			throw bad("quietHoursEnd: needed when quietHoursStart is set");
		}

		Set<String> amenities = new LinkedHashSet<>();
		req.amenities().forEach(a -> amenities.add(a.trim()));
		List<String> known = houses.knownAmenities(amenities);
		for (String a : amenities) {
			if (!known.contains(a)) {
				throw bad("amenities: unknown amenity " + a);
			}
		}
		return amenities;
	}

	private static String blankToNull(String s) {
		return s == null || s.isBlank() ? null : s.trim();
	}

	private static ResponseStatusException bad(String message) {
		return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
	}
}
