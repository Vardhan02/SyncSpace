package com.syncspace.auth;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import com.syncspace.profile.Profile;

interface AccountRepository extends Repository<Profile, UUID> {

	// every photo the account owns, so the files can go once the rows are gone
	@Query(value = """
			select 'tenant-photos' as bucket, photo_url as path from tenants where id = :id and photo_url is not null
			union all
			select 'tenant-photos', photo_url from landlords where id = :id and photo_url is not null
			union all
			select 'house-photos', ph.url from house_photos ph join houses h on h.house_id = ph.house_id
			where h.landlord_id = :id""", nativeQuery = true)
	List<Object[]> photos(UUID id);

	// everything else hangs off auth.users with on delete cascade
	@Modifying
	@Query(value = "delete from auth.users where id = :id", nativeQuery = true)
	int deleteUser(UUID id);
}
