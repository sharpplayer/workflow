package uk.co.matchboard.app.model;

import java.util.List;

public record CreateUser(String username, String password, List<String> roles){}
