package uk.co.matchboard.app.model.session;

import java.time.Instant;

public record Session(String userId, Instant expiration, String role, boolean passwordReset) {

    public SessionView getView() {
        return new SessionView(userId, role);
    }
}
