package uk.co.matchboard.app.service;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;
import uk.co.matchboard.app.functional.OptionalResult;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.session.Session;
import uk.co.matchboard.app.model.session.SessionUsers;

@Service
public class SessionServiceImpl implements SessionService {

    public static final String MODE_NONE = "none";

    private final Map<String, Map<String, Session>> sessions = new ConcurrentHashMap<>();

    private final UserService userService;

    public SessionServiceImpl(UserService userService) {
        this.userService = userService;
    }

    @Override
    public SessionUsers getUsersOn(String id) {
        var sessions = getSessionsOn(id).values();
        String mode;
        if (sessions.isEmpty()) {
            mode = MODE_NONE;
        } else if (sessions.size() == 1 && sessions.iterator().next().role()
                .equals(UserServiceImpl.LOGIN_ADMIN)) {
            mode = "admin";
        } else {
            mode = "job";
        }
        return new SessionUsers(sessions.stream().map(Session::userId).toList(), mode);
    }

    private Map<String, Session> getSessionsOn(String id) {
        return sessions.computeIfAbsent(id, _ -> new HashMap<>());
    }

    @Override
    public Result<Session> startSession(String deviceId, String user, String password,
            String role) {
        endSession(deviceId, user);
        return userService.login(user, password, role).flatMap(u -> {
            var newSession = new Session(user, Instant.now().plusSeconds(60 * 30), role,
                    u.passwordReset());
            addSession(deviceId, newSession);
            return Result.of(newSession);
        });
    }

    private void addSession(String deviceId, Session session) {
        var sessions = getSessionsOn(deviceId);
        if (session.role().equals(UserServiceImpl.LOGIN_ADMIN)) {
            sessions.clear();
        }
        getSessionsOn(deviceId).put(session.userId(), session);
    }

    @Override
    public OptionalResult<Session> endSession(String deviceId, String user) {
        var deviceSessions = getSessionsOn(deviceId);
        return OptionalResult.of(deviceSessions.remove(user));
    }
}
