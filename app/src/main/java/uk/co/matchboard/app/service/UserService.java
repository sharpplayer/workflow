package uk.co.matchboard.app.service;

import java.util.List;
import uk.co.matchboard.app.functional.Result;

public interface UserService {
    Result<Boolean> login(String user, String password);

    Result<Boolean> validatePin(String user, String pin);

    Result<List<String>> loginOptions(String user);
}
