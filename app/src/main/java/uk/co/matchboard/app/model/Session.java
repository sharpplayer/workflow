package uk.co.matchboard.app.model;

import java.time.Instant;

public record Session(String userId, Instant expiration, boolean admin) {}
