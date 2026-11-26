package com.syncspace.application;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import com.syncspace.listing.House;

// replaces decide_application, which needs auth.uid()
interface ApplicationRepository extends Repository<House, Long> {

	interface ApplicationRow {
		Long getApplicationId();

		String getStatus();

		Instant getCreatedAt();

		Instant getDecidedAt();

		Long getHouseId();

		String getHouseTitle();

		UUID getLandlordId();

		UUID getTenantAId();

		String getTenantAName();

		String getTenantAPhoto();

		UUID getTenantBId();

		String getTenantBName();

		String getTenantBPhoto();
	}

	String APPLICATIONS = """
			select a.application_id as "applicationId", a.status::text as "status",
			       a.created_at as "createdAt", a.decided_at as "decidedAt",
			       h.house_id as "houseId", h.title as "houseTitle", h.landlord_id as "landlordId",
			       m.tenant_a_id as "tenantAId", pa.name as "tenantAName", ta.photo_url as "tenantAPhoto",
			       m.tenant_b_id as "tenantBId", pb.name as "tenantBName", tb.photo_url as "tenantBPhoto"
			from applications a
			join houses h on h.house_id = a.house_id
			join matches m on m.match_id = a.match_id
			join profiles pa on pa.id = m.tenant_a_id
			join tenants ta on ta.id = m.tenant_a_id
			join profiles pb on pb.id = m.tenant_b_id
			join tenants tb on tb.id = m.tenant_b_id""";

	@Query(value = APPLICATIONS + """

			where h.landlord_id = :me and a.status = 'pending'
			order by a.created_at desc, a.application_id desc""", nativeQuery = true)
	List<ApplicationRow> pending(UUID me);

	@Query(value = APPLICATIONS + " where a.application_id = :applicationId", nativeQuery = true)
	Optional<ApplicationRow> find(long applicationId);

	@Modifying
	@Query(value = """
			update applications set status = cast(:status as application_status), decided_at = now()
			where application_id = :applicationId and status = 'pending'""", nativeQuery = true)
	int decide(long applicationId, String status);

	// locks the house row
	@Query(value = "select rooms_available from houses where house_id = :houseId for update", nativeQuery = true)
	int lockRooms(long houseId);

	// fills the listing when the last room goes
	@Modifying
	@Query(value = """
			update houses set rooms_available = rooms_available - 1,
			       status = case when rooms_available = 1 then cast('filled' as listing_status) else status end
			where house_id = :houseId and rooms_available > 0""", nativeQuery = true)
	int takeRoom(long houseId);

	@Modifying
	@Query(value = """
			update applications set status = 'ignored', decided_at = now()
			where house_id = :houseId and status = 'pending'""", nativeQuery = true)
	int ignorePending(long houseId);
}
