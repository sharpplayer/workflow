package uk.co.matchboard.app.model;

import java.util.List;

public record User(int id, String username, String passwordHash, String pinHash, List<String> roles, boolean passwordReset, boolean enabled) {
}
