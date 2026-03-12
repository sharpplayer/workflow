package uk.co.matchboard.app.service;

import static uk.co.matchboard.generated.Tables.USERS;

import java.util.Arrays;
import java.util.List;
import org.jooq.DSLContext;
import org.springframework.dao.TransientDataAccessException;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import uk.co.matchboard.app.functional.OptionalResult;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.functional.TryUtils;
import uk.co.matchboard.app.model.User;

@Service
public class DatabaseServiceImpl implements DatabaseService {
    private final DSLContext dsl;

    public DatabaseServiceImpl(DSLContext dsl) {
        this.dsl = dsl;
    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public OptionalResult<User> findUser(String user) {
        return Result.toOptionalResult(TryUtils.tryCatch(() ->
                dsl.selectFrom(USERS).where(USERS.USERNAME.eq(user))
                        .fetchOptional(rec ->
                                new User(rec.getId(),
                                        rec.getUsername(),
                                        rec.getPasswordHash(),
                                        rec.getPinHash(),
                                        List.of(rec.getRoles()),
                                        rec.getPasswordReset(),
                                        rec.getEnabled()))));
    }
}
