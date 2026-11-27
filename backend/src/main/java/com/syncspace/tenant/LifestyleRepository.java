package com.syncspace.tenant;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface LifestyleRepository extends JpaRepository<Lifestyle, UUID> {
}
