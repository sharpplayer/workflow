package uk.co.matchboard.app.model.session;

import java.util.List;

public record SessionUsers(List<SessionView> users, String primaryRole) {

}
