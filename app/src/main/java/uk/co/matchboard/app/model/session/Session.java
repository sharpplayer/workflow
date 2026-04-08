package uk.co.matchboard.app.model.session;

import java.time.Instant;

public record Session(String userId, Instant expiration, String role, boolean passwordReset) {}
