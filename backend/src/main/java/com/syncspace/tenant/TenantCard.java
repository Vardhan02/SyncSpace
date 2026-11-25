package com.syncspace.tenant;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

// what other people see, so no contact details. Field names follow TenantOnboarding in frontend/src/types
public record TenantCard(
		UUID id,
		String name,
		Integer age,
		String photoUrl,
		String university,
		String course,
		String bio,
		Integer budgetMin,
		Integer budgetMax,
		List<String> preferredAreas,
		String roomType,
		LocalDate moveInDate,
		Integer leaseMonths,
		Integer maxHousemates,
		SleepSchedule sleepSchedule,
		Integer noiseTolerance,
		Cleanliness cleanliness,
		WorkSchedule workSchedule,
		SocialLevel socialLevel,
		GuestFrequency guestFrequency,
		Boolean smoker,
		Boolean okWithSmoking,
		Boolean hasPets,
		Boolean okWithPets,
		List<String> interests,
		List<Answer> prompts,
		Integer matchScore) {

	public record Answer(int promptId, String text, String answer) {
	}
}
