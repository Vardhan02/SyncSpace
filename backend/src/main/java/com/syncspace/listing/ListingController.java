package com.syncspace.listing;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.syncspace.listing.HouseRepository.PhotoRow;
import com.syncspace.photo.PhotoStorage;
import com.syncspace.profile.Roles;
import com.syncspace.profile.UserRole;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/listings")
public class ListingController {

	private static final Logger log = LoggerFactory.getLogger(ListingController.class);
	private static final String BUCKET = "house-photos";
	private static final long MAX_PHOTO_BYTES = 5L * 1024 * 1024;

	record Summary(long houseId, String title, String address, String area, int rent, String status,
			boolean verified, String coverPhoto, long likeCount) {
	}

	record Amenity(String name, Boolean vlmVerified) {
	}

	record Photo(long photoId, String url, int position) {
	}

	record Detail(long houseId, String title, String area, String address, int rent, String roomType,
			LocalDate availableFrom, int roomsAvailable, String description, ListingStatus status, boolean verified,
			Instant createdAt,
			Boolean petsAllowed, Boolean smokingAllowed, GuestPolicy guestPolicy,
			// "23:00", not "23:00:00"
			@JsonFormat(pattern = "HH:mm") LocalTime quietHoursStart,
			@JsonFormat(pattern = "HH:mm") LocalTime quietHoursEnd,
			Integer minLeaseMonths, Integer maxOccupants, String extraRules,
			List<Amenity> amenities, List<Photo> photos, long likeCount) {
	}

	record Likes(int count, List<String> names) {
	}

	private final Roles roles;
	private final ListingService service;
	private final HouseRepository houses;
	private final HouseRulesRepository rules;
	private final PhotoStorage photos;

	public ListingController(Roles roles, ListingService service, HouseRepository houses, HouseRulesRepository rules,
			PhotoStorage photos) {
		this.roles = roles;
		this.service = service;
		this.houses = houses;
		this.rules = rules;
		this.photos = photos;
	}

	@PostMapping
	public ResponseEntity<Detail> create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ListingRequest req) {
		UUID me = roles.require(jwt, UserRole.landlord);
		long houseId = service.create(me, req);
		return ResponseEntity.status(HttpStatus.CREATED).body(detail(service.owned(me, houseId)));
	}

	@GetMapping("/mine")
	public List<Summary> mine(@AuthenticationPrincipal Jwt jwt) {
		UUID me = roles.require(jwt, UserRole.landlord);
		return houses.summaries(me).stream()
				.map(s -> new Summary(s.getHouseId(), s.getTitle(), s.getAddress(), s.getArea(), s.getRent(),
						s.getStatus(), s.getVerified(), photos.url(BUCKET, s.getCoverPath()), s.getLikeCount()))
				.toList();
	}

	@GetMapping("/{houseId}")
	@Transactional(readOnly = true)
	public Detail detail(@AuthenticationPrincipal Jwt jwt, @PathVariable long houseId) {
		UUID me = roles.require(jwt, UserRole.landlord);
		return detail(service.owned(me, houseId));
	}

	// returns the saved listing
	@PutMapping("/{houseId}")
	public Detail update(@AuthenticationPrincipal Jwt jwt, @PathVariable long houseId,
			@Valid @RequestBody ListingRequest req) {
		UUID me = roles.require(jwt, UserRole.landlord);
		service.update(me, houseId, req);
		return detail(service.owned(me, houseId));
	}

	@DeleteMapping("/{houseId}")
	public ResponseEntity<Void> delete(@AuthenticationPrincipal Jwt jwt, @PathVariable long houseId) {
		UUID me = roles.require(jwt, UserRole.landlord);
		// rows first, then files
		deleteFiles(service.delete(me, houseId));
		return ResponseEntity.noContent().build();
	}

	@PostMapping("/{houseId}/photos")
	public ResponseEntity<List<Photo>> addPhotos(@AuthenticationPrincipal Jwt jwt, @PathVariable long houseId,
			@RequestParam("files") List<MultipartFile> files) throws IOException {
		UUID me = roles.require(jwt, UserRole.landlord);
		if (files.isEmpty()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "files: add at least one photo");
		}
		service.checkRoomForPhotos(me, houseId, files.size());

		// check all files before uploading any
		List<byte[]> contents = new ArrayList<>();
		List<String> types = new ArrayList<>();
		for (MultipartFile file : files) {
			byte[] bytes = file.getBytes();
			String type = PhotoStorage.imageType(bytes);
			if (type == null) {
				throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
						"files: " + file.getOriginalFilename() + " has to be a jpg or png");
			}
			if (bytes.length > MAX_PHOTO_BYTES) {
				throw new ResponseStatusException(HttpStatus.CONTENT_TOO_LARGE, "file is too big, max 5 MB");
			}
			contents.add(bytes);
			types.add(type);
		}

		// new path each time because of the CDN cache
		List<String> uploaded = new ArrayList<>();
		try {
			for (int i = 0; i < contents.size(); i++) {
				String path = houseId + "/" + UUID.randomUUID() + "." + PhotoStorage.extension(types.get(i));
				uploaded.add(photos.upload(BUCKET, path, contents.get(i), types.get(i)));
			}
			service.addPhotos(me, houseId, uploaded);
		} catch (RuntimeException e) {
			deleteFiles(uploaded);
			throw e;
		}
		return ResponseEntity.status(HttpStatus.CREATED).body(photoList(houseId));
	}

	@DeleteMapping("/{houseId}/photos/{photoId}")
	public ResponseEntity<Void> deletePhoto(@AuthenticationPrincipal Jwt jwt, @PathVariable long houseId,
			@PathVariable long photoId) {
		UUID me = roles.require(jwt, UserRole.landlord);
		deleteFiles(List.of(service.deletePhoto(me, houseId, photoId)));
		return ResponseEntity.noContent().build();
	}

	// names only
	@GetMapping("/{houseId}/likes")
	@Transactional(readOnly = true)
	public Likes likes(@AuthenticationPrincipal Jwt jwt, @PathVariable long houseId) {
		UUID me = roles.require(jwt, UserRole.landlord);
		service.owned(me, houseId);
		List<String> names = houses.likerNames(houseId);
		return new Likes(names.size(), names);
	}

	private Detail detail(House h) {
		HouseRules r = rules.findById(h.getId()).orElse(null);
		List<Amenity> amenities = houses.amenities(h.getId()).stream()
				.map(a -> new Amenity(a.getName(), a.getVlmVerified()))
				.toList();
		return new Detail(h.getId(), h.getTitle(), h.getArea(), h.getAddress(), h.getRent(), h.getRoomType(),
				h.getAvailableFrom(), h.getRoomsAvailable(), h.getDescription(), h.getStatus(), h.isVerified(),
				h.getCreatedAt() == null ? null : h.getCreatedAt().toInstant(),
				r == null ? null : r.isPetsAllowed(),
				r == null ? null : r.isSmokingAllowed(),
				r == null ? null : r.getGuestPolicy(),
				r == null ? null : r.getQuietHoursStart(),
				r == null ? null : r.getQuietHoursEnd(),
				r == null ? null : r.getMinLeaseMonths(),
				r == null ? null : r.getMaxOccupants(),
				r == null ? null : r.getExtraRules(),
				amenities, photoList(h.getId()), houses.likeCount(h.getId()));
	}

	private List<Photo> photoList(long houseId) {
		List<PhotoRow> rows = houses.photos(List.of(houseId));
		return rows.stream().map(p -> new Photo(p.getPhotoId(), photos.url(BUCKET, p.getPath()), p.getPosition())).toList();
	}

	private void deleteFiles(List<String> paths) {
		for (String path : paths) {
			try {
				photos.delete(BUCKET, path);
			} catch (RuntimeException e) {
				log.warn("couldn't delete photo {}: {}", path, e.getMessage());
			}
		}
	}
}
