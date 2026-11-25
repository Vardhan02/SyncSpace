package com.syncspace.tenant;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface TenantRepository extends JpaRepository<Tenant, UUID> {

	interface InterestRow {
		UUID getTenantId();

		String getInterest();
	}

	interface AnswerRow {
		UUID getTenantId();

		Integer getSlot();

		Integer getPromptId();

		String getText();

		String getAnswer();
	}

	// signup only makes the profile, the tenants row comes with the first onboarding save
	@Modifying
	@Query(value = "insert into tenants (id) values (:id) on conflict do nothing", nativeQuery = true)
	void createIfMissing(UUID id);

	@Query(value = """
			select exists (
			    select 1 from tenants t join profiles p on p.id = t.id
			    where t.id = :id and t.onboarding_complete and not p.first_login)""", nativeQuery = true)
	boolean isOnboarded(UUID id);

	@Modifying
	@Query(value = "delete from tenant_interests where tenant_id = :id", nativeQuery = true)
	void clearInterests(UUID id);

	@Modifying
	@Query(value = "insert into tenant_interests (tenant_id, interest) values (:id, :interest)", nativeQuery = true)
	void addInterest(UUID id, String interest);

	@Query(value = """
			select tenant_id as "tenantId", interest
			from tenant_interests
			where tenant_id in (:ids)
			order by interest""", nativeQuery = true)
	List<InterestRow> interests(Collection<UUID> ids);

	@Modifying
	@Query(value = "delete from tenant_prompt_answers where tenant_id = :id", nativeQuery = true)
	void clearAnswers(UUID id);

	@Modifying
	@Query(value = """
			insert into tenant_prompt_answers (tenant_id, slot, prompt_id, answer)
			values (:id, :slot, :promptId, :answer)""", nativeQuery = true)
	void addAnswer(UUID id, int slot, int promptId, String answer);

	@Query(value = """
			select a.tenant_id as "tenantId", a.slot::int as "slot", a.prompt_id::int as "promptId",
			       p.text as "text", a.answer as "answer"
			from tenant_prompt_answers a
			join prompts p on p.prompt_id = a.prompt_id
			where a.tenant_id in (:ids)
			order by a.slot""", nativeQuery = true)
	List<AnswerRow> answers(Collection<UUID> ids);
}
