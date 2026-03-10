package uk.co.matchboard.app.service;

import uk.co.matchboard.app.functional.OptionalResult;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.Session;

import java.util.List;

public interface SessionService {
    List<String> getUsersOn(String id);

    Result<Session> startSession(String deviceId, String user, String password);

    OptionalResult<Session> endSession(String deviceId, String user);
}
