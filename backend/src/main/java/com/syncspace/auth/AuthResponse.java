package com.syncspace.auth;

import com.syncspace.profile.MeResponse;

public record AuthResponse(String accessToken, String refreshToken, long expiresIn, MeResponse user) {
}
