package uk.co.matchboard.app.service;

import uk.co.matchboard.app.functional.OptionalResult;
import uk.co.matchboard.app.model.User;

public interface DatabaseService {
    OptionalResult<User> findUser(String user);
}
