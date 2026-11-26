package com.syncspace.tenant;

import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "tenant_lifestyle_preferences")
public class Lifestyle {

	@Id
	@Column(name = "tenant_id")
	private UUID tenantId;

	@Enumerated(EnumType.STRING)
	@JdbcTypeCode(SqlTypes.NAMED_ENUM)
	@Column(name = "sleep_schedule")
	private SleepSchedule sleepSchedule;

	@Column(name = "noise_tolerance")
	private int noiseTolerance;

	@Enumerated(EnumType.STRING)
	@JdbcTypeCode(SqlTypes.NAMED_ENUM)
	private Cleanliness cleanliness;

	@Enumerated(EnumType.STRING)
	@JdbcTypeCode(SqlTypes.NAMED_ENUM)
	@Column(name = "work_schedule")
	private WorkSchedule workSchedule;

	@Enumerated(EnumType.STRING)
	@JdbcTypeCode(SqlTypes.NAMED_ENUM)
	@Column(name = "social_level")
	private SocialLevel socialLevel;

	@Enumerated(EnumType.STRING)
	@JdbcTypeCode(SqlTypes.NAMED_ENUM)
	@Column(name = "guest_frequency")
	private GuestFrequency guestFrequency;

	private boolean smoker;

	@Column(name = "ok_with_smoking")
	private boolean okWithSmoking;

	@Column(name = "has_pets")
	private boolean hasPets;

	@Column(name = "ok_with_pets")
	private boolean okWithPets;

	protected Lifestyle() {
	}

	public Lifestyle(UUID tenantId) {
		this.tenantId = tenantId;
	}

	public UUID getTenantId() {
		return tenantId;
	}

	public SleepSchedule getSleepSchedule() {
		return sleepSchedule;
	}

	public void setSleepSchedule(SleepSchedule sleepSchedule) {
		this.sleepSchedule = sleepSchedule;
	}

	public int getNoiseTolerance() {
		return noiseTolerance;
	}

	public void setNoiseTolerance(int noiseTolerance) {
		this.noiseTolerance = noiseTolerance;
	}

	public Cleanliness getCleanliness() {
		return cleanliness;
	}

	public void setCleanliness(Cleanliness cleanliness) {
		this.cleanliness = cleanliness;
	}

	public WorkSchedule getWorkSchedule() {
		return workSchedule;
	}

	public void setWorkSchedule(WorkSchedule workSchedule) {
		this.workSchedule = workSchedule;
	}

	public SocialLevel getSocialLevel() {
		return socialLevel;
	}

	public void setSocialLevel(SocialLevel socialLevel) {
		this.socialLevel = socialLevel;
	}

	public GuestFrequency getGuestFrequency() {
		return guestFrequency;
	}

	public void setGuestFrequency(GuestFrequency guestFrequency) {
		this.guestFrequency = guestFrequency;
	}

	public boolean isSmoker() {
		return smoker;
	}

	public void setSmoker(boolean smoker) {
		this.smoker = smoker;
	}

	public boolean isOkWithSmoking() {
		return okWithSmoking;
	}

	public void setOkWithSmoking(boolean okWithSmoking) {
		this.okWithSmoking = okWithSmoking;
	}

	public boolean isHasPets() {
		return hasPets;
	}

	public void setHasPets(boolean hasPets) {
		this.hasPets = hasPets;
	}

	public boolean isOkWithPets() {
		return okWithPets;
	}

	public void setOkWithPets(boolean okWithPets) {
		this.okWithPets = okWithPets;
	}
}
