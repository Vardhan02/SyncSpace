package com.syncspace.swipe;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import com.syncspace.tenant.Tenant;

interface SwipeRepository extends Repository<Tenant, UUID> {

	interface Like {
		UUID getId();

		String getName();

		String getPhotoPath();

		Instant getLikedAt();
	}

	// changing your mind later is allowed, the match trigger fires on update too
	@Modifying
	@Query(value = """
			insert into swipes (swiper_id, target_id, direction)
			values (:me, :target, cast(:direction as swipe_direction))
			on conflict (swiper_id, target_id) do update set direction = excluded.direction""", nativeQuery = true)
	void swipe(UUID me, UUID target, String direction);

	@Query(value = """
			select match_id from matches
			where tenant_a_id = least(:a, :b) and tenant_b_id = greatest(:a, :b)""", nativeQuery = true)
	Optional<Long> matchId(UUID a, UUID b);

	@Query(value = """
			select pl.liked_by_id as "id", p.name as "name", t.photo_url as "photoPath", pl.created_at as "likedAt"
			from pending_likes pl
			join profiles p on p.id = pl.liked_by_id
			join tenants t on t.id = pl.liked_by_id
			where pl.tenant_id = :me
			order by pl.created_at desc""", nativeQuery = true)
	List<Like> pendingLikes(UUID me);
}
