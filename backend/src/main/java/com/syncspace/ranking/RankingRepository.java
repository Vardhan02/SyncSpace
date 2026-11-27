package com.syncspace.ranking;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import com.syncspace.tenant.Tenant;

// Builds the request rows as JSON straight in Postgres, field names are the column names (matching/API.md)
interface RankingRepository extends Repository<Tenant, UUID> {

	String TENANT_JSON = """
			jsonb_build_object(
			    'tenant_id', t.id, 'age', t.age, 'university', t.university, 'course', t.course, 'bio', t.bio,
			    'budget_min', h.budget_min, 'budget_max', h.budget_max, 'preferred_areas', h.preferred_areas,
			    'room_type', h.room_type, 'move_in_date', h.move_in_date, 'lease_months', h.lease_months,
			    'max_housemates', h.max_housemates,
			    'sleep_schedule', l.sleep_schedule, 'noise_tolerance', l.noise_tolerance, 'cleanliness', l.cleanliness,
			    'work_schedule', l.work_schedule, 'social_level', l.social_level, 'guest_frequency', l.guest_frequency,
			    'smoker', l.smoker, 'ok_with_smoking', l.ok_with_smoking, 'has_pets', l.has_pets, 'ok_with_pets', l.ok_with_pets,
			    'interests', coalesce((select jsonb_agg(i.interest) from tenant_interests i where i.tenant_id = t.id), '[]'),
			    'prompt_answers', coalesce((select jsonb_agg(jsonb_build_object('prompt_id', a.prompt_id, 'answer', a.answer, 'slot', a.slot))
			                                from tenant_prompt_answers a where a.tenant_id = t.id), '[]'))""";

	String ONBOARDED_TENANTS = """
			from tenants t
			join profiles p on p.id = t.id
			join tenant_house_preferences h on h.tenant_id = t.id
			join tenant_lifestyle_preferences l on l.tenant_id = t.id
			where t.onboarding_complete and not p.first_login""";

	@Query(value = "select " + TENANT_JSON + "::text " + ONBOARDED_TENANTS + " and t.id = :me", nativeQuery = true)
	Optional<String> tenant(UUID me);

	// same people the deck shows: onboarded, not me, not swiped on yet
	@Query(value = "select coalesce(jsonb_agg(" + TENANT_JSON + "), '[]')::text " + ONBOARDED_TENANTS + "\n" + """
			  and t.id <> :me
			  and not exists (select 1 from swipes s where s.swiper_id = :me and s.target_id = t.id)""", nativeQuery = true)
	String candidates(UUID me);

	@Query(value = """
			select coalesce(jsonb_agg(jsonb_build_object(
			    'house_id', h.house_id, 'area', h.area, 'rent', h.rent, 'rooms_available', h.rooms_available,
			    'room_type', h.room_type, 'available_from', h.available_from,
			    'amenities', coalesce((select jsonb_agg(a.name) from house_amenities ha join amenities a on a.amenity_id = ha.amenity_id
			                           where ha.house_id = h.house_id), '[]'),
			    'pets_allowed', r.pets_allowed, 'smoking_allowed', r.smoking_allowed, 'guest_policy', r.guest_policy,
			    'quiet_hours_start', to_char(r.quiet_hours_start, 'HH24:MI'), 'min_lease_months', r.min_lease_months,
			    'max_occupants', r.max_occupants, 'preferred_tenants', coalesce(lp.preferred_tenants::text, 'any'))), '[]')::text
			from houses h
			join house_preferences r on r.house_id = h.house_id
			left join landlord_preferences lp on lp.landlord_id = h.landlord_id
			where h.status = 'active' and h.verified""", nativeQuery = true)
	String activeHouses();

	@Query(value = "select t.id from tenants t join profiles p on p.id = t.id where t.onboarding_complete and not p.first_login",
			nativeQuery = true)
	List<UUID> onboardedTenantIds();

	@Modifying
	@Query(value = "delete from profile_recommendations where tenant_id = :me", nativeQuery = true)
	void clearRoommateScores(UUID me);

	@Modifying
	@Query(value = """
			insert into profile_recommendations (tenant_id, candidate_id, score, source)
			values (:me, :candidate, :score, 'model')""", nativeQuery = true)
	void saveRoommateScore(UUID me, UUID candidate, double score);

	@Modifying
	@Query(value = "delete from house_recommendations where tenant_id = :me", nativeQuery = true)
	void clearHouseScores(UUID me);

	@Modifying
	@Query(value = """
			insert into house_recommendations (tenant_id, house_id, score, source)
			values (:me, :house, :score, 'model')""", nativeQuery = true)
	void saveHouseScore(UUID me, long house, double score);
}
