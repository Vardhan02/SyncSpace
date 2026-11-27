package com.syncspace.tenant;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.hibernate.annotations.ColumnTransformer;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "tenant_house_preferences")
public class HousePreferences {

	@Id
	@Column(name = "tenant_id")
	private UUID tenantId;

	@Column(name = "budget_min")
	private int budgetMin;

	@Column(name = "budget_max")
	private int budgetMax;

	@JdbcTypeCode(SqlTypes.ARRAY)
	@Column(name = "preferred_areas")
	private List<String> preferredAreas;

	// String because one of the labels is "double"
	@ColumnTransformer(write = "?::room_type")
	@Column(name = "room_type")
	private String roomType;

	@Column(name = "move_in_date")
	private LocalDate moveInDate;

	@Column(name = "lease_months")
	private int leaseMonths;

	@Column(name = "max_housemates")
	private int maxHousemates;

	protected HousePreferences() {
	}

	public HousePreferences(UUID tenantId) {
		this.tenantId = tenantId;
	}

	public UUID getTenantId() {
		return tenantId;
	}

	public int getBudgetMin() {
		return budgetMin;
	}

	public int getBudgetMax() {
		return budgetMax;
	}

	public void setBudget(int min, int max) {
		this.budgetMin = min;
		this.budgetMax = max;
	}

	public List<String> getPreferredAreas() {
		return preferredAreas;
	}

	public void setPreferredAreas(List<String> preferredAreas) {
		this.preferredAreas = preferredAreas;
	}

	public String getRoomType() {
		return roomType;
	}

	public void setRoomType(String roomType) {
		this.roomType = roomType;
	}

	public LocalDate getMoveInDate() {
		return moveInDate;
	}

	public void setMoveInDate(LocalDate moveInDate) {
		this.moveInDate = moveInDate;
	}

	public int getLeaseMonths() {
		return leaseMonths;
	}

	public void setLeaseMonths(int leaseMonths) {
		this.leaseMonths = leaseMonths;
	}

	public int getMaxHousemates() {
		return maxHousemates;
	}

	public void setMaxHousemates(int maxHousemates) {
		this.maxHousemates = maxHousemates;
	}
}
