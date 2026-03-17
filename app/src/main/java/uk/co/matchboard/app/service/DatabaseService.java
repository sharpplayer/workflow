package uk.co.matchboard.app.service;

import uk.co.matchboard.app.functional.OptionalResult;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.Config;
import uk.co.matchboard.app.model.User;
import uk.co.matchboard.app.model.Users;

public interface DatabaseService {
    OptionalResult<User> findUser(String user);

    Result<User> addUser(User user);

    OptionalResult<Config> findConfig(String config);

    Result<User> updateUser(User user);

    Result<Users> getUsers();
}
