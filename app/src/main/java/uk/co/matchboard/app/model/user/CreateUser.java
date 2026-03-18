package uk.co.matchboard.app.model.user;

import java.util.List;

public record CreateUser(String username, String password, List<String> roles){}
