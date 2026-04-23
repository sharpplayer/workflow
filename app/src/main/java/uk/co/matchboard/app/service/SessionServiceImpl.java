package uk.co.matchboard.app.service;

import java.time.Instant;
import java.util.Collections;
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

    public static final String ROLE_NONE = "none";

    private final Map<String, Map<String, Session>> sessions = new ConcurrentHashMap<>();

    private final UserService userService;

    private final DatabaseService databaseService;

    public SessionServiceImpl(UserService userService, DatabaseService databaseService) {
        this.userService = userService;
        this.databaseService = databaseService;
    }

    @Override
    public SessionUsers getUsersOn(String id) {
        var sessions = getSessionsOn(id).values();
        if (sessions.isEmpty()) {
            return new SessionUsers(Collections.emptyList(), ROLE_NONE);

        }
        return new SessionUsers(sessions.stream().map(Session::getView).toList(),
                sessions.stream().toList().getFirst().role());

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
                    u.passwordReset(), databaseService.getMachine(role));
            return addSession(deviceId, newSession);
        });
    }

    private Result<Session> addSession(String deviceId, Session session) {
        var sessions = getSessionsOn(deviceId);

        if (UserServiceImpl.LOGIN_ADMIN.equals(session.role())) {
            sessions.clear();
            sessions.put(session.userId(), session);
            return Result.of(session);
        }
        sessions.put(session.userId(), session);
        return Result.of(session);
    }

    @Override
    public OptionalResult<Session> endSession(String deviceId, String user) {
        var deviceSessions = getSessionsOn(deviceId);
        return OptionalResult.of(deviceSessions.remove(user));
    }

    @Override
    public OptionalResult<Session> endSessions(String deviceId) {
        var deviceSessions = getSessionsOn(deviceId).values().stream().toList();
        deviceSessions.forEach(session -> endSession(deviceId, session.userId()));
        return OptionalResult.empty();
    }
}
