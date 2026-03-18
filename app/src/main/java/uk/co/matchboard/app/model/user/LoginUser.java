package uk.co.matchboard.app.model.user;

public record LoginUser(String username, String password, boolean admin, boolean pin){}
