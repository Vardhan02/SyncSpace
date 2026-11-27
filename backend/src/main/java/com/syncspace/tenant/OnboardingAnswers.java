package com.syncspace.tenant;

import java.time.LocalDate;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

// PUT /api/tenants/me, steps 1-4 at once. Field names as TenantOnboarding in frontend/src/types
public record OnboardingAnswers(
		@NotNull @Min(16) @Max(100) Integer age,
		@NotBlank @Size(max = 100) String university,
		@NotBlank @Size(max = 100) String course,
		@NotBlank @Size(max = 300) String bio,

		@NotNull @Min(300) @Max(1500) Integer budgetMin,
		@NotNull @Min(300) @Max(1500) Integer budgetMax,
		@NotEmpty List<@NotBlank String> preferredAreas,
		@NotBlank String roomType,
		@NotNull @FutureOrPresent(message = "can't be in the past") LocalDate moveInDate,
		@NotNull Integer leaseMonths,
		@NotNull @Min(1) @Max(5) Integer maxHousemates,

		@NotNull SleepSchedule sleepSchedule,
		@NotNull @Min(1) @Max(5) Integer noiseTolerance,
		@NotNull Cleanliness cleanliness,
		@NotNull WorkSchedule workSchedule,
		@NotNull SocialLevel socialLevel,
		@NotNull GuestFrequency guestFrequency,
		@NotNull Boolean smoker,
		@NotNull Boolean okWithSmoking,
		@NotNull Boolean hasPets,
		@NotNull Boolean okWithPets,
		@NotNull @Size(min = 1, max = 6) List<@NotBlank @Size(max = 30) String> interests,

		@NotNull @Size(min = 3, max = 3, message = "answer exactly 3 prompts") List<@Valid PromptAnswer> prompts) {

	public record PromptAnswer(@NotNull Integer promptId, @NotBlank @Size(max = 150) String answer) {
	}
}
