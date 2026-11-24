package com.syncspace.profile;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

// rows are created by the on_auth_user_created trigger, not from here
@Entity
@Table(name = "profiles")
public class Profile {

	@Id
	private UUID id;

	private String name;

	@Enumerated(EnumType.STRING)
	@JdbcTypeCode(SqlTypes.NAMED_ENUM)
	private UserRole role;

	@Column(name = "first_login")
	private boolean firstLogin;

	@Column(name = "created_at", insertable = false, updatable = false)
	private OffsetDateTime createdAt;

	protected Profile() {
	}

	public UUID getId() {
		return id;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public UserRole getRole() {
		return role;
	}

	public boolean isFirstLogin() {
		return firstLogin;
	}

	public void setFirstLogin(boolean firstLogin) {
		this.firstLogin = firstLogin;
	}

	public OffsetDateTime getCreatedAt() {
		return createdAt;
	}
}
