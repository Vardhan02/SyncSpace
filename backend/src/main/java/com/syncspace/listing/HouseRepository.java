package com.syncspace.listing;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface HouseRepository extends JpaRepository<House, Long> {

	interface SummaryRow {
		Long getHouseId();

		String getTitle();

		String getAddress();

		String getArea();

		Integer getRent();

		String getStatus();

		Boolean getVerified();

		String getVerificationStatus();

		String getVerificationNote();

		String getCoverPath();

		Long getLikeCount();
	}

	interface AmenityRow {
		String getName();

		Boolean getVlmVerified();
	}

	interface PhotoRow {
		Long getPhotoId();

		Long getHouseId();

		String getPath();

		Integer getPosition();
	}

	@Query(value = """
			select h.house_id as "houseId", h.title as "title", h.address as "address", h.area as "area",
			       h.rent as "rent", h.status::text as "status", h.verified as "verified",
			       h.verification_status::text as "verificationStatus", h.verification_note as "verificationNote",
			       (select ph.url from house_photos ph where ph.house_id = h.house_id
			        order by ph.position limit 1) as "coverPath",
			       (select count(*) from house_likes l where l.house_id = h.house_id) as "likeCount"
			from houses h
			where h.landlord_id = :landlordId
			order by h.created_at desc, h.house_id desc""", nativeQuery = true)
	List<SummaryRow> summaries(UUID landlordId);

	// locks the house row for photo positions
	@Query(value = "select house_id from houses where house_id = :houseId for update", nativeQuery = true)
	Optional<Long> lock(long houseId);

	// ---- amenities

	@Query(value = "select name from amenities where name in (:names)", nativeQuery = true)
	List<String> knownAmenities(Collection<String> names);

	@Query(value = """
			select a.name as "name", ha.vlm_verified as "vlmVerified"
			from house_amenities ha
			join amenities a on a.amenity_id = ha.amenity_id
			where ha.house_id = :houseId
			order by a.name""", nativeQuery = true)
	List<AmenityRow> amenities(long houseId);

	// keeps vlm_verified on the ones that stay
	@Modifying
	@Query(value = """
			delete from house_amenities ha
			using amenities a
			where a.amenity_id = ha.amenity_id and ha.house_id = :houseId and a.name not in (:names)""", nativeQuery = true)
	void removeAmenitiesExcept(long houseId, Collection<String> names);

	@Modifying
	@Query(value = """
			insert into house_amenities (house_id, amenity_id)
			select :houseId, amenity_id from amenities where name in (:names)
			on conflict do nothing""", nativeQuery = true)
	void addAmenities(long houseId, Collection<String> names);

	// ---- photos

	@Query(value = """
			select photo_id as "photoId", house_id as "houseId", url as "path", position::int as "position"
			from house_photos
			where house_id in (:houseIds)
			order by house_id, position""", nativeQuery = true)
	List<PhotoRow> photos(Collection<Long> houseIds);

	@Query(value = "select coalesce(max(position) + 1, 0) from house_photos where house_id = :houseId", nativeQuery = true)
	int nextPosition(long houseId);

	@Modifying
	@Query(value = "insert into house_photos (house_id, url, position) values (:houseId, :path, :position)", nativeQuery = true)
	void addPhoto(long houseId, String path, int position);

	@Modifying
	@Query(value = "delete from house_photos where photo_id = :photoId", nativeQuery = true)
	void deletePhoto(long photoId);

	// ---- likes

	@Query(value = "select count(*) from house_likes where house_id = :houseId", nativeQuery = true)
	long likeCount(long houseId);

	@Query(value = """
			select p.name
			from house_likes hl
			join profiles p on p.id = hl.tenant_id
			where hl.house_id = :houseId
			order by hl.created_at desc""", nativeQuery = true)
	List<String> likerNames(long houseId);
}
