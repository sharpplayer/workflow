package uk.co.matchboard.app.model;

import java.util.List;

public record UserView(String username, List<String> roles, boolean enabled) {

}
