package uk.co.matchboard.app.service;

import jakarta.annotation.Nonnull;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.function.Function;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import uk.co.matchboard.app.exception.DisabledUserException;
import uk.co.matchboard.app.exception.DuplicateUserException;
import uk.co.matchboard.app.exception.InvalidUserException;
import uk.co.matchboard.app.functional.OptionalResult;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.config.ConfigResponse;
import uk.co.matchboard.app.model.user.LoginOptions;
import uk.co.matchboard.app.model.user.User;
import uk.co.matchboard.app.model.user.UserView;
import uk.co.matchboard.app.model.user.Users;

@Service
public class UserServiceImpl implements UserService {

    public static final String LOGIN_ADMIN = "ADMIN";
    public static final String CONFIG_OPERATOR = "OPERATOR";

    private static final String LOGIN_OPT_PASSWORD = "password";
    private static final String LOGIN_OPT_PIN = "pin";
    private static final String LOGIN_OPT_RESET = "reset";
    private static final String LOGIN_OPT_PIN_RESET = "pinreset";

    private final PasswordEncoder passwordEncoder;

    private final DatabaseService databaseService;

    public UserServiceImpl(DatabaseService databaseService, PasswordEncoder passwordEncoder) {
        this.databaseService = databaseService;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public Result<User> registerUser(String username, String password, List<String> roles) {
        OptionalResult<User> userRecord = databaseService.findUser(username);
        return userRecord.fold(u -> Result.failure(new DuplicateUserException(u.username())),
                Result::failure,
                () -> {
                    var passwordHash = passwordEncoder.encode(password);
                    return databaseService.createUser(
                            new User(0, username, passwordHash, null, roles, true, true, true));
                }
        );
    }

    @Override
    public Result<User> login(String user, String password, String role) {
        OptionalResult<User> userRecord = databaseService.findUser(user);
        return userRecord.flatMapResult(data -> {
            if (data == null) {
                return Result.failure(new InvalidUserException());
            }
            if (data.enabled()) {
                if (!passwordEncoder.matches(password, data.passwordHash())) {
                    return Result.failure(new InvalidUserException());
                }
                if (!data.roles().contains(role)) {
                    return Result.failure(new InvalidUserException());
                }
                return Result.of(data);
            } else {
                return Result.failure(new DisabledUserException(user));
            }
        });
    }

    @Override
    public Result<User> updatePassword(String username, String password) {
        OptionalResult<User> userRecord = databaseService.findUser(username);
        return userRecord.fold(u -> {
                    var passwordHash = passwordEncoder.encode(password);
                    return databaseService.updateUser(
                            new User(u.id(), username, passwordHash, u.pinHash(), u.roles(), false,
                                    u.pinReset(),
                                    u.enabled()));
                },
                Result::failure,
                () -> Result.failure(new InvalidUserException())
        );
    }

    @Override
    public Result<User> updatePin(String username, String pin) {
        OptionalResult<User> userRecord = databaseService.findUser(username);
        return userRecord.fold(u -> {
                    var pinHash = passwordEncoder.encode(pin);
                    return databaseService.updateUser(
                            new User(u.id(), username, u.passwordHash(), pinHash, u.roles(),
                                    u.passwordReset(),
                                    false,
                                    u.enabled()));
                },
                Result::failure,
                () -> Result.failure(new InvalidUserException())
        );
    }

    @Override
    public Result<Users> getUsers() {
        return databaseService.getUsers().map(list -> list.stream()
                        .map(user -> new UserView(user.username(), user.roles(), user.enabled())))
                .map(list -> new Users(
                        list.sorted(Comparator.comparing(UserView::username)).toList()));
    }

    @Override
    public Result<User> updateUser(String username, String password, List<String> roles,
            boolean pinReset, boolean enabled) {
        return databaseService.findUser(username).fold(
                user -> {
                    String passwordHash = user.passwordHash();
                    boolean passwordReset = user.passwordReset();
                    if (password != null && !password.isEmpty()) {
                        passwordHash = passwordEncoder.encode(password);
                        passwordReset = true;
                    }
                    String pinHash = user.pinHash();
                    boolean pinResetFlag = user.pinReset();
                    if (pinReset) {
                        pinHash = null;
                        pinResetFlag = true;
                    }
                    return databaseService.updateUser(
                            new User(user.id(), user.username(), passwordHash, pinHash, roles,
                                    passwordReset, pinResetFlag, enabled));
                },
                Result::failure,
                () -> Result.failure(new InvalidUserException())
        );
    }

    @Override
    public Result<ConfigResponse> getOperators() {
        return getUsers().map(userList -> new ConfigResponse("OPERATOR",
                userList.users(), "user[]"));
    }

    @Override
    public OptionalResult<User> findUser(String user) {
        return databaseService.findUser(user);
    }

    @Override
    public Result<Boolean> validatePin(String user, String pin) {
        OptionalResult<User> userRecord = databaseService.findUser(user);
        return userRecord.flatMapResult(data -> {
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
        return userRecord.fold(getUserLoginOptionsFunction(loggedInOnDevice),
                _ -> new LoginOptions(List.of(LOGIN_OPT_PASSWORD), List.of(LOGIN_ADMIN)),
                () -> new LoginOptions(List.of(LOGIN_OPT_PASSWORD), List.of(LOGIN_ADMIN)));
    }

    @Nonnull
    private static Function<User, LoginOptions> getUserLoginOptionsFunction(
            boolean loggedInOnDevice) {
        return data -> getLoginOptions(loggedInOnDevice, data);
    }

    @Nonnull
    private static LoginOptions getLoginOptions(boolean loggedInOnDevice, User data) {
        List<String> opts = new ArrayList<>();
        if (data.enabled()) {
            opts.add(LOGIN_OPT_PASSWORD);
            // Only if already logged in on device (probably should check session length)
            if (loggedInOnDevice && data.pinHash() != null) {
                opts.add(LOGIN_OPT_PIN);
            }
            if (data.pinReset()) {
                opts.add(LOGIN_OPT_PIN_RESET);
            }
            if (data.passwordReset()) {
                opts.add(LOGIN_OPT_RESET);
            }
        } else {
            opts.add(LOGIN_OPT_PASSWORD);
        }
        return new LoginOptions(opts, data.roles());
    }
}
