package com.syncspace.landlord;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class LandlordService {

	// same as onboardingOptions.ts
	static final List<Integer> MIN_LEASE_MONTHS = List.of(1, 3, 5, 9, 12);

	private final LandlordRepository landlords;

	public LandlordService(LandlordRepository landlords) {
		this.landlords = landlords;
	}

	@Transactional
	public void savePreferences(UUID me, TenantType preferredTenants, int minLeaseMonths, boolean referencesRequired) {
		if (!MIN_LEASE_MONTHS.contains(minLeaseMonths)) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "minLeaseMonths: must be one of " + MIN_LEASE_MONTHS);
		}
		landlords.createIfMissing(me);
		landlords.savePreferences(me, preferredTenants.name(), minLeaseMonths, referencesRequired);
		landlords.finishOnboardingIfReady(me);
	}

	// returns the old path to delete
	@Transactional
	public String setPhoto(UUID me, String path) {
		landlords.createIfMissing(me);
		String old = landlords.photoPath(me).orElse(null);
		landlords.setPhoto(me, path);
		return old;
	}
}
