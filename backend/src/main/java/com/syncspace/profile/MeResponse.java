package com.syncspace.profile;

import java.util.UUID;

public record MeResponse(UUID id, String name, String email, UserRole role, boolean firstLogin) {

	public static MeResponse of(Profile p, String email) {
		return new MeResponse(p.getId(), p.getName(), email, p.getRole(), p.isFirstLogin());
	}
}
