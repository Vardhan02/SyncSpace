package com.syncspace.profile;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfileContactRepository extends JpaRepository<ProfileContact, UUID> {
}
