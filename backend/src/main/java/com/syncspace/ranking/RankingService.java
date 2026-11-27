package com.syncspace.ranking;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import com.syncspace.ranking.RankingClient.Ranked;
import com.syncspace.ranking.RankingClient.Result;

@Service
public class RankingService {

	private static final Logger log = LoggerFactory.getLogger(RankingService.class);
	// the service handles ~2000 candidates a call, more than we'll have
	private static final int ALL = 2000;

	private final RankingClient client;
	private final RankingRepository rows;
	private final TransactionTemplate tx;

	public RankingService(RankingClient client, RankingRepository rows, TransactionTemplate tx) {
		this.client = client;
		this.rows = rows;
		this.tx = tx;
	}

	// best first, dealbreakers dropped. Null means the service is down and the caller falls back
	public Map<UUID, Integer> roommates(UUID me, int limit) {
		String tenant = rows.tenant(me).orElse(null);
		if (tenant == null) {
			return Map.of();
		}
		String candidates = rows.candidates(me);
		Ranked ranked;
		try {
			// always rank everyone, the saved scores are the fallback and shouldn't shrink to one page
			ranked = client.roommates(tenant, candidates, ALL);
		} catch (RuntimeException e) {
			log.warn("ranking service unavailable for roommates, using saved scores: {}", e.getMessage());
			return null;
		}

		tx.executeWithoutResult(s -> {
			rows.clearRoommateScores(me);
			for (Result r : ranked.results()) {
				rows.saveRoommateScore(me, UUID.fromString(r.id()), r.score() / 100.0);
			}
		});

		Map<UUID, Integer> deck = new LinkedHashMap<>();
		for (Result r : ranked.results().subList(0, Math.min(limit, ranked.results().size()))) {
			deck.put(UUID.fromString(r.id()), r.score());
		}
		return deck;
	}

	// the house grid reads house_recommendations, dealbreakers just get no row and sit unscored at the bottom
	public void refreshHouses(UUID me) {
		String tenant = rows.tenant(me).orElse(null);
		if (tenant == null) {
			return;
		}
		String houses = rows.activeHouses();
		Ranked ranked;
		try {
			ranked = client.houses(tenant, houses, ALL);
		} catch (RuntimeException e) {
			log.warn("ranking service unavailable for houses, keeping old scores: {}", e.getMessage());
			return;
		}
		tx.executeWithoutResult(s -> {
			rows.clearHouseScores(me);
			for (Result r : ranked.results()) {
				rows.saveHouseScore(me, Long.parseLong(r.id()), r.score() / 100.0);
			}
		});
	}

	// after onboarding answers change, so the next deck and grid aren't stale
	@Async
	public void refreshLater(UUID me) {
		refreshHouses(me);
		roommates(me, ALL);
	}

	// new or edited listings only get scores here, the listing endpoints don't call ranking
	@Scheduled(initialDelayString = "${ranking.refresh-delay:60000}", fixedDelayString = "${ranking.refresh-every:900000}")
	public void refreshEveryone() {
		for (UUID id : rows.onboardedTenantIds()) {
			refreshHouses(id);
		}
	}
}
