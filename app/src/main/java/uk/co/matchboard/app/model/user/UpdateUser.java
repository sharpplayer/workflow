package uk.co.matchboard.app.model.user;

import java.util.List;

public record UpdateUser(String username, String password, List<String> roles, boolean pinReset, boolean enabled) {}
