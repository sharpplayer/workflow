package uk.co.matchboard.app.service;

import java.util.List;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.LoginOptions;
import uk.co.matchboard.app.model.User;

public interface UserService {

    Result<User> registerUser(String username, String password, List<String> roles);

    Result<Boolean> validatePin(String user, String pin);

    LoginOptions getOptions(String username, boolean loggedInDevice);

    Result<Boolean> login(String user, String password, boolean asAdmin);
}
