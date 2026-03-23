package uk.co.matchboard.app.service;

import java.util.List;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.user.LoginOptions;
import uk.co.matchboard.app.model.user.User;
import uk.co.matchboard.app.model.user.Users;

public interface UserService {

    Result<User> registerUser(String username, String password, List<String> roles);

    Result<Boolean> validatePin(String user, String pin);

    LoginOptions getOptions(String username, boolean loggedInDevice);

    Result<User> login(String user, String password, boolean asAdmin);

    Result<User> updatePassword(String username, String password);

    Result<User> updatePin(String username, String pin);

    Result<Users> getUsers();

    Result<User> updateUser(String username, String password, List<String> roles, boolean pinReset, boolean enabled);
}
