package com.syncspace.verification;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import com.syncspace.listing.House;

interface VerificationRepository extends Repository<House, Long> {

	interface Listing {
		UUID getLandlordId();

		String getDescription();
	}

	interface Photo {
		Long getPhotoId();

		Integer getPosition();

		String getPath();
	}

	interface Waiting {
		Long getHouseId();

		Instant getRequestedAt();

		String getJobIds();
	}

	@Query(value = "select landlord_id as \"landlordId\", description as \"description\" from houses where house_id = :id",
			nativeQuery = true)
	Optional<Listing> listing(long id);

	@Query(value = """
			select a.name from house_amenities ha join amenities a on a.amenity_id = ha.amenity_id
			where ha.house_id = :id order by a.name""", nativeQuery = true)
	List<String> amenities(long id);

	@Query(value = """
			select photo_id as "photoId", position::int as "position", url as "path"
			from house_photos where house_id = :id order by position""", nativeQuery = true)
	List<Photo> photos(long id);

	// verified is left alone: a listing that already has the badge keeps it while it's re-checked
	@Modifying
	@Query(value = """
			update houses set verification_status = 'pending', verification_note = null,
			       verification_requested_at = :at, verification_job_ids = null
			where house_id = :id""", nativeQuery = true)
	int markPending(long id, Instant at);

	@Modifying
	@Query(value = """
			update houses set verification_job_ids = string_to_array(:jobIds, ',')
			where house_id = :id and verification_requested_at = :at""", nativeQuery = true)
	int saveJobs(long id, Instant at, String jobIds);

	// back to "not sent yet", so the resend pass picks it up
	@Modifying
	@Query(value = """
			update houses set verification_job_ids = null
			where house_id = :id and verification_requested_at = :at""", nativeQuery = true)
	int clearJobs(long id, Instant at);

	// only saves if no newer check was asked for in the meantime
	@Modifying
	@Query(value = """
			update houses
			set verified = :verified, verification_status = cast(:status as verification_status), verification_note = :note
			where house_id = :id and verification_requested_at = :at""", nativeQuery = true)
	int saveResult(long id, Instant at, boolean verified, String status, String note);

	@Modifying
	@Query(value = """
			update house_amenities ha set vlm_verified = :verified
			from amenities a
			where a.amenity_id = ha.amenity_id and ha.house_id = :id and a.name = :name""", nativeQuery = true)
	int saveAmenity(long id, String name, boolean verified);

	@Query(value = """
			select house_id as "houseId", verification_requested_at as "requestedAt",
			       array_to_string(verification_job_ids, ',') as "jobIds"
			from houses where verification_status = 'pending' and verification_job_ids is not null""", nativeQuery = true)
	List<Waiting> sent();

	// pending but never reached the service, or the service lost it
	@Query(value = """
			select house_id from houses
			where verification_status = 'pending'
			  and ((verification_job_ids is null and verification_requested_at < :notSentBefore)
			    or verification_requested_at < :lostBefore)""", nativeQuery = true)
	List<Long> toResend(Instant notSentBefore, Instant lostBefore);
}
