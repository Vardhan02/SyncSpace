package com.syncspace.house;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import com.syncspace.listing.House;

interface HouseBrowseRepository extends Repository<House, Long> {

	interface HouseRow {
		Long getId();

		UUID getLandlordId();

		String getTitle();

		String getArea();

		String getAddress();

		Integer getRent();

		String getRoomType();

		String getAvailableFrom();

		Integer getRooms();

		Boolean getVerified();

		String getDescription();

		Double getScore();
	}

	interface PhotoRow {
		Long getHouseId();

		String getPath();
	}

	interface MatchLikeRow {
		Long getHouseId();

		String getName();
	}

	interface RulesRow {
		Boolean getPetsAllowed();

		Boolean getSmokingAllowed();

		String getGuestPolicy();

		String getQuietHoursStart();

		String getQuietHoursEnd();

		Integer getMinLeaseMonths();

		Integer getMaxOccupants();

		String getExtraRules();
	}

	String HOUSE = """
			select h.house_id as "id", h.landlord_id as "landlordId", h.title as "title", h.area as "area",
			       h.address as "address", h.rent as "rent", h.room_type::text as "roomType",
			       h.available_from::text as "availableFrom", h.rooms_available::int as "rooms",
			       h.verified as "verified", h.description as "description", r.score::float8 as "score"
			from houses h
			left join house_recommendations r on r.tenant_id = :me and r.house_id = h.house_id""";

	// empty area or 0 maxRent means no filter
	@Query(value = HOUSE + """

			where h.status = 'active'
			  and (:area = '' or h.area = :area)
			  and (:maxRent = 0 or h.rent <= :maxRent)
			order by r.score desc nulls last, h.created_at desc, h.house_id desc""", nativeQuery = true)
	List<HouseRow> active(UUID me, String area, int maxRent);

	// everything except drafts
	@Query(value = HOUSE + " where h.house_id = :houseId and h.status <> 'draft'", nativeQuery = true)
	Optional<HouseRow> visible(UUID me, long houseId);

	@Query(value = "select exists (select 1 from houses where house_id = :houseId and status <> 'draft')", nativeQuery = true)
	boolean isVisible(long houseId);

	@Query(value = "select exists (select 1 from houses where house_id = :houseId)", nativeQuery = true)
	boolean exists(long houseId);

	@Query(value = """
			select house_id as "houseId", url as "path"
			from house_photos
			where house_id in (:houseIds)
			order by house_id, position""", nativeQuery = true)
	List<PhotoRow> photos(Collection<Long> houseIds);

	@Query(value = "select house_id from house_likes where tenant_id = :me and house_id in (:houseIds)", nativeQuery = true)
	List<Long> likedByMe(UUID me, Collection<Long> houseIds);

	@Query(value = """
			select v.house_id as "houseId", p.name as "name"
			from house_likes_by_matches v
			join profiles p on p.id = v.liked_by_id
			where v.tenant_id = :me and v.house_id in (:houseIds)
			order by p.name""", nativeQuery = true)
	List<MatchLikeRow> likedByMatches(UUID me, Collection<Long> houseIds);

	@Query(value = """
			select a.name
			from house_amenities ha join amenities a on a.amenity_id = ha.amenity_id
			where ha.house_id = :houseId
			order by a.name""", nativeQuery = true)
	List<String> amenities(long houseId);

	@Query(value = """
			select pets_allowed as "petsAllowed", smoking_allowed as "smokingAllowed",
			       guest_policy::text as "guestPolicy",
			       to_char(quiet_hours_start, 'HH24:MI') as "quietHoursStart",
			       to_char(quiet_hours_end, 'HH24:MI') as "quietHoursEnd",
			       min_lease_months::int as "minLeaseMonths", max_occupants::int as "maxOccupants",
			       extra_rules as "extraRules"
			from house_preferences where house_id = :houseId""", nativeQuery = true)
	Optional<RulesRow> rules(long houseId);

	// same rule as the roommate deck
	@Query(value = """
			select exists (
			    select 1 from tenants t join profiles p on p.id = t.id
			    where t.id = :me and t.onboarding_complete and not p.first_login)""", nativeQuery = true)
	boolean isOnboarded(UUID me);

	@Modifying
	@Query(value = "insert into house_likes (tenant_id, house_id) values (:me, :houseId) on conflict do nothing", nativeQuery = true)
	void like(UUID me, long houseId);

	@Modifying
	@Query(value = "delete from house_likes where tenant_id = :me and house_id = :houseId", nativeQuery = true)
	void unlike(UUID me, long houseId);
}
