package com.syncspace.listing;

import java.time.LocalTime;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

// house_preferences table
@Entity
@Table(name = "house_preferences")
public class HouseRules {

	@Id
	@Column(name = "house_id")
	private Long houseId;

	@Column(name = "pets_allowed")
	private boolean petsAllowed;

	@Column(name = "smoking_allowed")
	private boolean smokingAllowed;

	@Enumerated(EnumType.STRING)
	@JdbcTypeCode(SqlTypes.NAMED_ENUM)
	@Column(name = "guest_policy")
	private GuestPolicy guestPolicy;

	@Column(name = "quiet_hours_start")
	private LocalTime quietHoursStart;

	@Column(name = "quiet_hours_end")
	private LocalTime quietHoursEnd;

	@Column(name = "min_lease_months", columnDefinition = "smallint")
	private int minLeaseMonths;

	@Column(name = "max_occupants", columnDefinition = "smallint")
	private int maxOccupants;

	@Column(name = "extra_rules")
	private String extraRules;

	protected HouseRules() {
	}

	public HouseRules(Long houseId) {
		this.houseId = houseId;
	}

	public Long getHouseId() {
		return houseId;
	}

	public boolean isPetsAllowed() {
		return petsAllowed;
	}

	public void setPetsAllowed(boolean petsAllowed) {
		this.petsAllowed = petsAllowed;
	}

	public boolean isSmokingAllowed() {
		return smokingAllowed;
	}

	public void setSmokingAllowed(boolean smokingAllowed) {
		this.smokingAllowed = smokingAllowed;
	}

	public GuestPolicy getGuestPolicy() {
		return guestPolicy;
	}

	public void setGuestPolicy(GuestPolicy guestPolicy) {
		this.guestPolicy = guestPolicy;
	}

	public LocalTime getQuietHoursStart() {
		return quietHoursStart;
	}

	public LocalTime getQuietHoursEnd() {
		return quietHoursEnd;
	}

	public void setQuietHours(LocalTime start, LocalTime end) {
		this.quietHoursStart = start;
		this.quietHoursEnd = end;
	}

	public int getMinLeaseMonths() {
		return minLeaseMonths;
	}

	public void setMinLeaseMonths(int minLeaseMonths) {
		this.minLeaseMonths = minLeaseMonths;
	}

	public int getMaxOccupants() {
		return maxOccupants;
	}

	public void setMaxOccupants(int maxOccupants) {
		this.maxOccupants = maxOccupants;
	}

	public String getExtraRules() {
		return extraRules;
	}

	public void setExtraRules(String extraRules) {
		this.extraRules = extraRules;
	}
}
