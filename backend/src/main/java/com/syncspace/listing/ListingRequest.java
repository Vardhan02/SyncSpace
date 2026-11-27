package com.syncspace.listing;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonAlias;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ListingRequest(
		@NotBlank @Size(max = 60) String title,
		@NotBlank String area,
		@NotBlank @Size(max = 200) String address,
		@NotNull @Min(300) @Max(3000) Integer rent,
		@NotBlank String roomType,
		@NotNull @FutureOrPresent(message = "can't be in the past") LocalDate availableFrom,
		// 0 only for a filled listing
		@NotNull @Min(0) @Max(10) Integer roomsAvailable,
		@Size(max = 500) String description,

		@NotNull @Size(min = 1, message = "pick at least one amenity") List<@NotBlank String> amenities,

		@NotNull Boolean petsAllowed,
		@NotNull Boolean smokingAllowed,
		@NotNull GuestPolicy guestPolicy,
		LocalTime quietHoursStart,
		LocalTime quietHoursEnd,
		// the frontend sends houseMinLeaseMonths
		@NotNull @JsonAlias("houseMinLeaseMonths") Integer minLeaseMonths,
		@NotNull @Min(1) @Max(12) Integer maxOccupants,
		@Size(max = 300) String extraRules,

		// draft or active, defaults to active
		ListingStatus status) {
}
