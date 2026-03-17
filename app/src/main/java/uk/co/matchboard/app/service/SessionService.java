package uk.co.matchboard.app.service;

import uk.co.matchboard.app.functional.OptionalResult;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.Session;
import uk.co.matchboard.app.model.SessionUsers;

public interface SessionService {
    SessionUsers getUsersOn(String id);

    Result<Session> startSession(String deviceId, String user, String password, boolean asAdmin);

    OptionalResult<Session> endSession(String deviceId, String user);

}
