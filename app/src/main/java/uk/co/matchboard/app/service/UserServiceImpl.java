package uk.co.matchboard.app.service;

import java.util.ArrayList;
import java.util.List;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import uk.co.matchboard.app.exception.DisabledUserException;
import uk.co.matchboard.app.exception.InvalidUserException;
import uk.co.matchboard.app.functional.OptionalResult;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.User;

@Service
public class UserServiceImpl implements UserService {

    private final String ROLE_ADMIN = "admin";

    private final String LOGIN_OPT_ADMIN = "admin";
    private final String LOGIN_OPT_PASSWORD = "password";
    private final String LOGIN_OPT_PIN = "pin";
    private final String LOGIN_OPT_RESET = "reset";

    private final PasswordEncoder passwordEncoder;

    private final DatabaseService databaseService;

    public UserServiceImpl(DatabaseService databaseService, PasswordEncoder passwordEncoder) {
        this.databaseService = databaseService;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public Result<Boolean> login(String user, String password) {
        OptionalResult<User> userRecord = databaseService.findUser(user);
        return userRecord.mapResult(data -> {
            if (data.enabled()) {
                if (!passwordEncoder.matches(password, data.passwordHash())) {
                    return Result.failure(new InvalidUserException());
                }
                return Result.of(true);
            } else {
                return Result.failure(new DisabledUserException(user));
            }
        });
    }

    @Override
    public Result<Boolean> validatePin(String user, String pin) {
        OptionalResult<User> userRecord = databaseService.findUser(user);
        return userRecord.mapResult(data -> {
            if (data.enabled()) {
                if (!passwordEncoder.matches(pin, data.pinHash())) {
                    return Result.failure(new InvalidUserException());
                }
                return Result.of(true);
            } else {
                return Result.failure(new DisabledUserException(user));
            }
        });
    }

    @Override
    public Result<List<String>> loginOptions(String user) {
        OptionalResult<User> userRecord = databaseService.findUser(user);
        return Result.of(userRecord.fold(data -> {
            List<String> opts = new ArrayList<>();
            if (data.enabled()) {
                if (data.roles().contains(ROLE_ADMIN)) {
                    opts.add(LOGIN_OPT_ADMIN);
                }
                // Only if already logged in
                if (data.pinHash() != null) {
                    opts.add(LOGIN_OPT_PIN);
                }
                if (data.passwordReset()) {
                    opts.add(LOGIN_OPT_RESET);
                }
            } else {
                opts.add(LOGIN_OPT_PASSWORD);
            }
            return opts;
        }, _ -> List.of(LOGIN_OPT_PASSWORD)));
    }
}
