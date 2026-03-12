package uk.co.matchboard.app.service;

import java.util.ArrayList;
import java.util.List;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import uk.co.matchboard.app.exception.DisabledUserException;
import uk.co.matchboard.app.exception.DuplicateUserException;
import uk.co.matchboard.app.exception.InvalidUserException;
import uk.co.matchboard.app.functional.OptionalResult;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.LoginOptions;
import uk.co.matchboard.app.model.User;

@Service
public class UserServiceImpl implements UserService {

    private static final String ROLE_ADMIN = "ADMIN";

    private static final String LOGIN_OPT_ADMIN = "admin";
    private static final String LOGIN_OPT_PASSWORD = "password";
    private static final String LOGIN_OPT_PIN = "pin";
    private static final String LOGIN_OPT_RESET = "reset";

    private final PasswordEncoder passwordEncoder;

    private final DatabaseService databaseService;

    public UserServiceImpl(DatabaseService databaseService, PasswordEncoder passwordEncoder) {
        this.databaseService = databaseService;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public Result<User> registerUser(String username, String password, List<String> roles) {
        System.out.println(System.currentTimeMillis());
        OptionalResult<User> userRecord = databaseService.findUser(username);
        System.out.println(System.currentTimeMillis());
        return userRecord.fold(u -> Result.failure(new DuplicateUserException(u.username())),
                Result::failure,
                () -> {
                    System.out.println(System.currentTimeMillis());
                    var passwordHash = passwordEncoder.encode(password);
                    System.out.println(System.currentTimeMillis());
                    return databaseService.addUser(
                            new User(0, username, passwordHash, null, roles, true, true));
                }
        );
    }

    @Override
    public Result<Boolean> login(String user, String password, boolean adminMode) {
        System.out.println("l:" + System.currentTimeMillis());
        OptionalResult<User> userRecord = databaseService.findUser(user);
        System.out.println("l:" + System.currentTimeMillis());
        return userRecord.mapResult(data -> {
            if (data.enabled()) {
                System.out.println("m:" + System.currentTimeMillis());
                if (!passwordEncoder.matches(password, data.passwordHash())) {
                    return Result.failure(new InvalidUserException());
                }
                System.out.println("n:" + System.currentTimeMillis());
                if (adminMode && !data.roles().contains(ROLE_ADMIN)) {
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
    public LoginOptions getOptions(String user, boolean loggedInOnDevice) {
        OptionalResult<User> userRecord = databaseService.findUser(user);
        var x = new LoginOptions(userRecord.fold(data -> {
            List<String> opts = new ArrayList<>();
            if (data.enabled()) {
                opts.add(LOGIN_OPT_PASSWORD);
                if (data.roles().contains(ROLE_ADMIN)) {
                    opts.add(LOGIN_OPT_ADMIN);
                }
                // Only if already logged in on device (probably should check session length)
                if (loggedInOnDevice && data.pinHash() != null) {
                    opts.add(LOGIN_OPT_PIN);
                }
                if (data.passwordReset()) {
                    opts.add(LOGIN_OPT_RESET);
                }
            } else {
                opts.add(LOGIN_OPT_PASSWORD);
            }
            return opts;
        }, _ -> List.of(LOGIN_OPT_PASSWORD), () -> List.of(LOGIN_OPT_PASSWORD)));
        System.out.println(x);
        return x;
    }
}
