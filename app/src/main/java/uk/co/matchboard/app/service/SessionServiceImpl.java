package uk.co.matchboard.app.service;

import org.springframework.stereotype.Service;
import uk.co.matchboard.app.functional.OptionalResult;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.Session;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SessionServiceImpl implements SessionService {

    private final Map<String, Map<String, Session>> sessions = new ConcurrentHashMap<>();

    @Override
    public List<String> getUsersOn(String id) {
        return getSessionsOn(id).values().stream().map(Session::userId).toList();
    }

    private Map<String, Session> getSessionsOn(String id) {
        return sessions.computeIfAbsent(id, _ -> new HashMap<>());
    }

    @Override
    public Result<Session> startSession(String deviceId, String user, String password) {
        endSession(deviceId, user);
        // query db session for user
        // check password hash
        var newSession = new Session(user, Instant.now().plusSeconds(60 * 30));
        getSessionsOn(deviceId).put(user, newSession);
        return new Result<>(newSession);
    }

    @Override
    public OptionalResult<Session> endSession(String deviceId, String user) {
        var deviceSessions = getSessionsOn(deviceId);
        return new OptionalResult<>(deviceSessions.remove(user));
    }
}
