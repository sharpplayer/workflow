package uk.co.matchboard.app.service;

import static uk.co.matchboard.generated.Tables.CONFIGURATION;
import static uk.co.matchboard.generated.Tables.PRODUCTS;
import static uk.co.matchboard.generated.Tables.USERS;

import java.util.List;
import org.jooq.DSLContext;
import org.springframework.dao.TransientDataAccessException;
import org.springframework.lang.NonNull;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import uk.co.matchboard.app.functional.OptionalResult;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.functional.TryUtils;
import uk.co.matchboard.app.model.config.Config;
import uk.co.matchboard.app.model.product.Product;
import uk.co.matchboard.app.model.user.User;
import uk.co.matchboard.generated.tables.records.ProductsRecord;
import uk.co.matchboard.generated.tables.records.UsersRecord;

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
                        .fetchOptional(DatabaseServiceImpl::getUser)));
    }

    @NonNull
    private static User getUser(UsersRecord rec) {
        return new User(rec.getId(),
                rec.getUsername(),
                rec.getPasswordHash(),
                rec.getPinHash(),
                List.of(rec.getRoles()),
                rec.getPasswordReset(),
                rec.getPinReset(),
                rec.getEnabled());
    }

    @NonNull
    private static Product getProduct(ProductsRecord rec) {
        return new Product(rec.getId(),
                rec.getName(),
                rec.getOldName(),
                rec.getWidth(),
                rec.getLength(),
                rec.getThickness(),
                rec.getPitch(),
                rec.getEdge(),
                rec.getFinish(),
                rec.getProfile(),
                rec.getMaterial(),
                rec.getOwner(),
                rec.getRackType(),
                List.of(rec.getMachinery()),
                rec.getEnabled());
    }

    @Override
    public Result<User> createUser(User user) {
        return TryUtils.tryCatch(() -> dsl.insertInto(USERS)
                        .set(USERS.USERNAME, user.username())
                        .set(USERS.PASSWORD_HASH, user.passwordHash())
                        .set(USERS.PIN_HASH, user.pinHash())
                        .set(USERS.ROLES, user.roles().toArray(new String[0]))
                        .set(USERS.PASSWORD_RESET, user.passwordReset())
                        .set(USERS.PIN_RESET, user.pinReset())
                        .set(USERS.ENABLED, user.enabled())
                        .returning(USERS.ID)
                        .fetchOne(USERS.ID))
                .map(id -> new User(id, user.username(), user.passwordHash(), user.pinHash(),
                        user.roles(), user.passwordReset(), user.pinReset(), user.enabled()));
    }

    @Override
    public Result<User> updateUser(User user) {
        return TryUtils.tryCatch(() -> dsl.update(USERS)
                        .set(USERS.USERNAME, user.username())
                        .set(USERS.PASSWORD_HASH, user.passwordHash())
                        .set(USERS.PIN_HASH, user.pinHash())
                        .set(USERS.ROLES, user.roles().toArray(new String[0]))
                        .set(USERS.PASSWORD_RESET, user.passwordReset())
                        .set(USERS.PIN_RESET, user.pinReset())
                        .set(USERS.ENABLED, user.enabled())
                        .where(USERS.ID.eq(user.id()))
                        .execute())
                .map(_ -> user);
    }

    @Override
    public Result<List<User>> getUsers() {
        return TryUtils.tryCatch(() ->
                dsl.selectFrom(USERS)
                        .fetch(DatabaseServiceImpl::getUser));

    }

    @Override
    public Result<List<Product>> getProducts() {
        return TryUtils.tryCatch(() ->
                dsl.selectFrom(PRODUCTS)
                        .fetch(DatabaseServiceImpl::getProduct));

    }

    @Override
    public Result<Product> createProduct(Product product) {
        return TryUtils.tryCatch(() -> dsl.insertInto(PRODUCTS)
                        .set(PRODUCTS.NAME, product.name())
                        .set(PRODUCTS.OLD_NAME, product.oldName())
                        .set(PRODUCTS.WIDTH, product.width())
                        .set(PRODUCTS.LENGTH, product.length())
                        .set(PRODUCTS.THICKNESS, product.thickness())
                        .set(PRODUCTS.PROFILE, product.profile())
                        .set(PRODUCTS.MATERIAL, product.material())
                        .set(PRODUCTS.OWNER, product.owner())
                        .set(PRODUCTS.EDGE, product.edge())
                        .set(PRODUCTS.PITCH, product.pitch())
                        .set(PRODUCTS.RACK_TYPE, product.rackType())
                        .set(PRODUCTS.FINISH, product.finish())
                        .set(PRODUCTS.MACHINERY, product.machinery().toArray(new String[0]))
                        .set(USERS.ENABLED, product.enabled())
                        .returning(PRODUCTS.ID)
                        .fetchOne(PRODUCTS.ID))
                .map(id -> new Product(id, product.name(), product.oldName(),
                        product.width(), product.length(), product.thickness(), product.pitch(),
                        product.edge(), product.finish(), product.profile(), product.material(),
                        product.owner(), product.rackType(), product.machinery(),
                        product.enabled()));
    }

    @Override
    public OptionalResult<Config> findConfig(String config) {
        return Result.toOptionalResult(TryUtils.tryCatch(() ->
                dsl.selectFrom(CONFIGURATION).where(CONFIGURATION.ID.eq(config))
                        .fetchOptional(rec ->
                                new Config(rec.getId(),
                                        rec.getType(),
                                        rec.getValue()))));
    }
}
