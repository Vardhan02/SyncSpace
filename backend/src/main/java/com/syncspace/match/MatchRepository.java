package com.syncspace.match;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import com.syncspace.tenant.Tenant;

// Replaces get_my_matches, apply_to_shared_house and get_my_landlord_contacts from the migration,
// those use auth.uid() which is empty on the backend's connection
interface MatchRepository extends Repository<Tenant, UUID> {

	interface MatchRow {
		Long getMatchId();

		UUID getOtherId();

		String getName();

		String getPhotoPath();

		String getEmail();

		String getPhone();

		Instant getMatchedAt();

		Boolean getIAmA();
	}

	interface SharedRow {
		Long getHouseId();

		String getTitle();

		String getArea();

		Integer getRent();

		String getStatus();

		String getCoverPath();

		UUID getSharedBy();

		Instant getSharedAt();

		Instant getAAppliedAt();

		Instant getBAppliedAt();

		Boolean getLikedByMe();

		Boolean getLikedByThem();

		String getApplicationStatus();
	}

	interface ApplicationRow {
		Long getApplicationId();

		Long getMatchId();

		String getPartnerName();

		Long getHouseId();

		String getHouseTitle();

		String getStatus();

		Instant getCreatedAt();

		Instant getDecidedAt();
	}

	interface ContactRow {
		Long getApplicationId();

		Long getHouseId();

		String getHouseTitle();

		String getLandlordName();

		String getEmail();

		String getPhone();
	}

	String MATCHES = """
			select m.match_id as "matchId", o.id as "otherId", p.name as "name", t.photo_url as "photoPath",
			       u.email::text as "email", case when c.phone_visible then c.phone end as "phone",
			       m.created_at as "matchedAt", m.tenant_a_id = :me as "iAmA"
			from matches m
			cross join lateral (
			    select case when m.tenant_a_id = :me then m.tenant_b_id else m.tenant_a_id end as id) o
			join profiles p on p.id = o.id
			join tenants t on t.id = o.id
			join auth.users u on u.id = o.id
			left join profile_contacts c on c.user_id = o.id
			where :me in (m.tenant_a_id, m.tenant_b_id)""";

	@Query(value = MATCHES + " order by m.created_at desc", nativeQuery = true)
	List<MatchRow> matches(UUID me);

	@Query(value = MATCHES + " and m.match_id = :matchId", nativeQuery = true)
	Optional<MatchRow> match(UUID me, long matchId);

	@Query(value = """
			select mh.house_id as "houseId", h.title as "title", h.area as "area", h.rent as "rent",
			       h.status::text as "status",
			       (select ph.url from house_photos ph where ph.house_id = h.house_id order by ph.position limit 1) as "coverPath",
			       mh.shared_by as "sharedBy", mh.shared_at as "sharedAt",
			       mh.a_applied_at as "aAppliedAt", mh.b_applied_at as "bAppliedAt",
			       exists (select 1 from house_likes l where l.house_id = h.house_id and l.tenant_id = :me) as "likedByMe",
			       exists (select 1 from house_likes l where l.house_id = h.house_id and l.tenant_id = :other) as "likedByThem",
			       a.status::text as "applicationStatus"
			from match_houses mh
			join houses h on h.house_id = mh.house_id
			left join applications a on a.match_id = mh.match_id and a.house_id = mh.house_id
			where mh.match_id = :matchId
			order by mh.shared_at desc""", nativeQuery = true)
	List<SharedRow> sharedHouses(long matchId, UUID me, UUID other);

	@Query(value = "select exists (select 1 from houses where house_id = :houseId and status = 'active')", nativeQuery = true)
	boolean isListed(long houseId);

	@Query(value = "select exists (select 1 from match_houses where match_id = :matchId and house_id = :houseId)", nativeQuery = true)
	boolean isShared(long matchId, long houseId);

	@Modifying
	@Query(value = "insert into match_houses (match_id, house_id, shared_by) values (:matchId, :houseId, :me)", nativeQuery = true)
	void share(long matchId, long houseId, UUID me);

	// only touches the caller's side. Once both are set the trigger creates the application
	@Modifying
	@Query(value = """
			update match_houses set
			    a_applied_at = case when :iAmA then coalesce(a_applied_at, now()) else a_applied_at end,
			    b_applied_at = case when :iAmA then b_applied_at else coalesce(b_applied_at, now()) end
			where match_id = :matchId and house_id = :houseId""", nativeQuery = true)
	int apply(long matchId, long houseId, boolean iAmA);

	@Query(value = "select status::text from applications where match_id = :matchId and house_id = :houseId", nativeQuery = true)
	Optional<String> applicationStatus(long matchId, long houseId);

	@Query(value = """
			select a.application_id as "applicationId", a.match_id as "matchId", p.name as "partnerName",
			       h.house_id as "houseId", h.title as "houseTitle", a.status::text as "status",
			       a.created_at as "createdAt", a.decided_at as "decidedAt"
			from applications a
			join matches m on m.match_id = a.match_id
			join houses h on h.house_id = a.house_id
			join profiles p on p.id = case when m.tenant_a_id = :me then m.tenant_b_id else m.tenant_a_id end
			where :me in (m.tenant_a_id, m.tenant_b_id)
			order by a.created_at desc""", nativeQuery = true)
	List<ApplicationRow> applications(UUID me);

	@Query(value = """
			select a.application_id as "applicationId", h.house_id as "houseId", h.title as "houseTitle",
			       p.name as "landlordName", u.email::text as "email",
			       case when c.phone_visible then c.phone end as "phone"
			from applications a
			join matches m on m.match_id = a.match_id
			join houses h on h.house_id = a.house_id
			join profiles p on p.id = h.landlord_id
			join auth.users u on u.id = h.landlord_id
			left join profile_contacts c on c.user_id = h.landlord_id
			where a.status = 'confirmed' and :me in (m.tenant_a_id, m.tenant_b_id)
			order by a.decided_at desc""", nativeQuery = true)
	List<ContactRow> landlordContacts(UUID me);
}
