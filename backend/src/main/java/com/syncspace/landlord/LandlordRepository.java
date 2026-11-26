package com.syncspace.landlord;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import com.syncspace.profile.Profile;

public interface LandlordRepository extends Repository<Profile, UUID> {

	interface PreferencesRow {
		String getPreferredTenants();

		Integer getMinLeaseMonths();

		Boolean getReferencesRequired();
	}

	// signup does not create the landlords row
	@Modifying
	@Query(value = "insert into landlords (id) values (:id) on conflict do nothing", nativeQuery = true)
	void createIfMissing(UUID id);

	@Modifying
	@Query(value = """
			insert into landlord_preferences (landlord_id, preferred_tenants, min_lease_months, references_required)
			values (:id, cast(:preferredTenants as tenant_type), :minLeaseMonths, :referencesRequired)
			on conflict (landlord_id) do update set
			    preferred_tenants = excluded.preferred_tenants,
			    min_lease_months = excluded.min_lease_months,
			    references_required = excluded.references_required""", nativeQuery = true)
	void savePreferences(UUID id, String preferredTenants, int minLeaseMonths, boolean referencesRequired);

	@Query(value = """
			select preferred_tenants::text as "preferredTenants", min_lease_months::int as "minLeaseMonths",
			       references_required as "referencesRequired"
			from landlord_preferences where landlord_id = :id""", nativeQuery = true)
	Optional<PreferencesRow> preferences(UUID id);

	@Query(value = "select photo_url from landlords where id = :id", nativeQuery = true)
	Optional<String> photoPath(UUID id);

	@Modifying
	@Query(value = "update landlords set photo_url = :path where id = :id", nativeQuery = true)
	void setPhoto(UUID id, String path);

	// done once preferences and a listing with a photo exist
	@Modifying
	@Query(value = """
			update profiles set first_login = false
			where id = :id and first_login
			  and exists (select 1 from landlord_preferences where landlord_id = :id)
			  and exists (select 1 from houses h join house_photos ph on ph.house_id = h.house_id
			              where h.landlord_id = :id)""", nativeQuery = true)
	void finishOnboardingIfReady(UUID id);
}
