package com.syncspace.roommate;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import com.syncspace.tenant.Tenant;

interface RoommateRepository extends Repository<Tenant, UUID> {

	interface Candidate {
		UUID getId();

		Double getScore();
	}

	// TODO: only the seed tenant has scores until the ranking job exists, everyone else is sorted newest first
	@Query(value = """
			select t.id as "id", r.score::float8 as "score"
			from tenants t
			join profiles p on p.id = t.id
			left join profile_recommendations r on r.tenant_id = :me and r.candidate_id = t.id
			where t.id <> :me
			  and t.onboarding_complete
			  and not p.first_login
			  and not exists (select 1 from swipes s where s.swiper_id = :me and s.target_id = t.id)
			order by r.score desc nulls last, p.created_at desc
			limit :limit""", nativeQuery = true)
	List<Candidate> deck(UUID me, int limit);

	@Query(value = """
			select score::float8 from profile_recommendations
			where tenant_id = :me and candidate_id = :other""", nativeQuery = true)
	Optional<Double> score(UUID me, UUID other);
}
