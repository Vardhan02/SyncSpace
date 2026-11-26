package com.syncspace.tenant;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "tenants")
public class Tenant {

	@Id
	private UUID id;

	private Integer age;
	private String university;
	private String course;
	private String bio;

	// path inside the tenant-photos bucket
	@Column(name = "photo_url")
	private String photoUrl;

	@Column(name = "onboarding_complete")
	private boolean onboardingComplete;

	protected Tenant() {
	}

	public UUID getId() {
		return id;
	}

	public Integer getAge() {
		return age;
	}

	public void setAge(Integer age) {
		this.age = age;
	}

	public String getUniversity() {
		return university;
	}

	public void setUniversity(String university) {
		this.university = university;
	}

	public String getCourse() {
		return course;
	}

	public void setCourse(String course) {
		this.course = course;
	}

	public String getBio() {
		return bio;
	}

	public void setBio(String bio) {
		this.bio = bio;
	}

	public String getPhotoUrl() {
		return photoUrl;
	}

	public void setPhotoUrl(String photoUrl) {
		this.photoUrl = photoUrl;
	}

	public boolean isOnboardingComplete() {
		return onboardingComplete;
	}

	public void setOnboardingComplete(boolean onboardingComplete) {
		this.onboardingComplete = onboardingComplete;
	}
}
