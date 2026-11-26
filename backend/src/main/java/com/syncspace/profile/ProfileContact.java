package com.syncspace.profile;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "profile_contacts")
public class ProfileContact {

	@Id
	@Column(name = "user_id")
	private UUID userId;

	private String phone;

	@Column(name = "phone_visible")
	private boolean phoneVisible;

	protected ProfileContact() {
	}

	public UUID getUserId() {
		return userId;
	}

	public String getPhone() {
		return phone;
	}

	public void setPhone(String phone) {
		this.phone = phone;
	}

	public boolean isPhoneVisible() {
		return phoneVisible;
	}

	public void setPhoneVisible(boolean phoneVisible) {
		this.phoneVisible = phoneVisible;
	}
}
