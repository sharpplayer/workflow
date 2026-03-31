package uk.co.matchboard.app.service;

import static uk.co.matchboard.generated.Tables.CARRIER;
import static uk.co.matchboard.generated.Tables.CONFIGURATION;
import static uk.co.matchboard.generated.Tables.CUSTOMER;
import static uk.co.matchboard.generated.Tables.PHASE;
import static uk.co.matchboard.generated.Tables.PHASE_PARAM;
import static uk.co.matchboard.generated.Tables.PRODUCTS;
import static uk.co.matchboard.generated.Tables.PRODUCT_PHASE;
import static uk.co.matchboard.generated.Tables.USERS;

import java.util.ArrayList;
import java.util.List;
import org.jooq.DSLContext;
import org.jooq.Record;
import org.jooq.impl.DSL;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.TransientDataAccessException;
import org.springframework.lang.NonNull;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import uk.co.matchboard.app.functional.OptionalResult;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.functional.TryUtils;
import uk.co.matchboard.app.model.config.Carrier;
import uk.co.matchboard.app.model.config.Config;
import uk.co.matchboard.app.model.config.CreateCarrier;
import uk.co.matchboard.app.model.config.CreateCustomer;
import uk.co.matchboard.app.model.config.Customer;
import uk.co.matchboard.app.model.product.CreatePhase;
import uk.co.matchboard.app.model.product.Phase;
import uk.co.matchboard.app.model.product.PhaseParam;
import uk.co.matchboard.app.model.product.PhaseParamData;
import uk.co.matchboard.app.model.product.PhasesUpdate;
import uk.co.matchboard.app.model.product.Product;
import uk.co.matchboard.app.model.user.User;
import uk.co.matchboard.generated.tables.records.CarrierRecord;
import uk.co.matchboard.generated.tables.records.CustomerRecord;
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

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
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

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
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

    @NonNull
    private static PhaseParam getPhaseParamWithPhase(Record record, int productPhaseOrder) {
        return new PhaseParam(record.get(PHASE.ID), record.get(PHASE.DESCRIPTION),
                record.get(PHASE_PARAM.ID), record.get(PHASE_PARAM.NAME),
                record.get(PHASE_PARAM.CONFIG), record.get(PHASE_PARAM.INPUT), productPhaseOrder,
                record.get(PHASE_PARAM.ORDER));
    }

    private static PhaseParam getPhaseParam(String description, Record record) {
        return new PhaseParam(record.get(PHASE_PARAM.PHASE_ID), description,
                record.get(PHASE_PARAM.ID), record.get(PHASE_PARAM.NAME),
                record.get(PHASE_PARAM.CONFIG), record.get(PHASE_PARAM.INPUT), 0,
                record.get(PHASE_PARAM.ORDER));
    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
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

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
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

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public Result<List<User>> getUsers() {
        return TryUtils.tryCatch(() ->
                dsl.selectFrom(USERS)
                        .fetch(DatabaseServiceImpl::getUser));

    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public Result<List<Product>> getProducts() {
        return TryUtils.tryCatch(() ->
                dsl.selectFrom(PRODUCTS)
                        .fetch(DatabaseServiceImpl::getProduct));

    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
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
                        .set(PRODUCTS.ENABLED, product.enabled())
                        .returning(PRODUCTS.ID)
                        .fetchOne(PRODUCTS.ID))
                .map(id -> new Product(id, product.name(), product.oldName(),
                        product.width(), product.length(), product.thickness(), product.pitch(),
                        product.edge(), product.finish(), product.profile(), product.material(),
                        product.owner(), product.rackType(), product.machinery(),
                        product.enabled()));
    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public Result<List<PhaseParam>> updatePhases(PhasesUpdate phasesUpdate) {
        return TryUtils.tryCatchResult(() -> {
            dsl.transaction(configuration -> {
                DSLContext dsl = DSL.using(configuration);
                dsl.deleteFrom(PRODUCT_PHASE)
                        .where(PRODUCT_PHASE.PRODUCT_ID.eq(phasesUpdate.productId()))
                        .execute();

                List<Integer> phaseIds = phasesUpdate.phaseIds();
                for (int i = 0; i < phaseIds.size(); i++) {
                    Integer phaseId = phaseIds.get(i);
                    int index = i + 1; // 1-based index
                    dsl.insertInto(PRODUCT_PHASE)
                            .set(PRODUCT_PHASE.PRODUCT_ID, phasesUpdate.productId())
                            .set(PRODUCT_PHASE.PHASE_ID, phaseId)
                            .set(PRODUCT_PHASE.ORDER, index)
                            .execute();
                }
            });

            return getPhases(phasesUpdate.productId()); // required by TryUtils.tryCatch
        });
    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public Result<Product> updateProduct(Product product) {
        return TryUtils.tryCatch(() -> dsl.update(PRODUCTS)
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
                        .where(PRODUCTS.NAME.eq(product.name()))
                        .execute())
                .map(_ -> product);
    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public Result<List<PhaseParam>> getPhases(int productId) {
        return TryUtils.tryCatch(() ->
                dsl.select(PHASE.ID, PHASE.DESCRIPTION)
                        .select(PRODUCT_PHASE.ORDER)
                        .select(PHASE_PARAM.fields())
                        .from(PRODUCT_PHASE)
                        .join(PHASE).on(PHASE.ID.eq(PRODUCT_PHASE.PHASE_ID))
                        .join(PHASE_PARAM).on(PHASE_PARAM.PHASE_ID.eq(PHASE.ID))
                        .where(PRODUCT_PHASE.PRODUCT_ID.eq(productId)
                                .and(PHASE.ENABLED.eq(true)))
                        .orderBy(PRODUCT_PHASE.ORDER.asc())
                        .fetch(r -> getPhaseParamWithPhase(r, r.get(PRODUCT_PHASE.ORDER))));
    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public Result<List<PhaseParam>> getPhases() {
        return TryUtils.tryCatch(() ->
                dsl.select(PHASE.fields())
                        .select(PHASE_PARAM.fields())
                        .from(PHASE)
                        .join(PHASE_PARAM).on(PHASE_PARAM.PHASE_ID.eq(PHASE.ID))
                        .where(PHASE.ENABLED.eq(true))
                        .orderBy(PHASE.DESCRIPTION.asc())
                        .fetch(r -> getPhaseParamWithPhase(r, 0)));
    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public OptionalResult<Product> findProduct(int productId) {
        return Result.toOptionalResult(TryUtils.tryCatch(() ->
                dsl.selectFrom(PRODUCTS).where(PRODUCTS.ID.eq(productId))
                        .fetchOptional(DatabaseServiceImpl::getProduct)));
    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public Result<String> getPhaseName(int phaseId) {
        return TryUtils.tryCatch(() -> {
            String desc = dsl.select(PHASE.DESCRIPTION)
                    .from(PHASE)
                    .where(PHASE.ID.eq(phaseId)).fetchOne(PHASE.DESCRIPTION);
            if (desc == null) {
                throw new DataAccessException("Failed to insert Phase, no ID returned") {
                };
            }
            return desc;
        });
    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public Result<List<PhaseParam>> getPhaseParams(int phaseId, String phaseName) {
        return TryUtils.tryCatch(() -> dsl.selectFrom(PHASE_PARAM)
                .where(PHASE_PARAM.PHASE_ID.eq(phaseId))
                .orderBy(PHASE_PARAM.ORDER).fetch(r -> getPhaseParam(phaseName, r)));

    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public Result<Phase> createPhase(CreatePhase phase) {
        return TryUtils.tryCatch(() ->
                dsl.transactionResult(connection -> {
                    DSLContext dsl = DSL.using(connection);

                    Integer id = dsl.insertInto(PHASE)
                            .set(PHASE.DESCRIPTION, phase.description())
                            .set(PHASE.ENABLED, true)
                            .returning(PHASE.ID)
                            .fetchOne(PHASE.ID);
                    if (id == null) {
                        throw new DataAccessException("Failed to insert Phase, no ID returned") {
                        };
                    }

                    List<PhaseParamData> params = new ArrayList<>();
                    for (int i = 0; i < phase.params().size(); i++) {
                        PhaseParamData phaseParam = phase.params().get(i);
                        int index = i + 1; // 1-based index
                        Integer paramId = dsl.insertInto(PHASE_PARAM)
                                .set(PHASE_PARAM.PHASE_ID, id)
                                .set(PHASE_PARAM.INPUT, phaseParam.input())
                                .set(PHASE_PARAM.CONFIG, phaseParam.paramConfig())
                                .set(PHASE_PARAM.NAME, phaseParam.paramName())
                                .set(PHASE_PARAM.ORDER, index)
                                .returning(PHASE_PARAM.ID)
                                .fetchOne(PHASE_PARAM.ID);
                        if (paramId == null) {
                            throw new DataAccessException(
                                    "Failed to insert phase parameter, no ID returned") {
                            };
                        }
                        params.add(new PhaseParamData(paramId, phaseParam.paramName(),
                                phaseParam.paramConfig(), phaseParam.input(), ""));
                    }
                    return new Phase(id, phase.description(), params, 0);
                }));
    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public Result<List<Customer>> getCustomers() {
        return TryUtils.tryCatch(() ->
                dsl.selectFrom(CUSTOMER)
                        .orderBy(CUSTOMER.NAME.asc())
                        .fetch(DatabaseServiceImpl::getCustomer));

    }

    private static Customer getCustomer(CustomerRecord customerRecord) {
        return new Customer(customerRecord.getId(),
                customerRecord.getCode(),
                customerRecord.getName(),
                customerRecord.getZone(),
                customerRecord.getContact(),
                customerRecord.getContactNumber(),
                customerRecord.getEnabled());
    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public Result<List<Carrier>> getCarriers() {
        return TryUtils.tryCatch(() ->
                dsl.selectFrom(CARRIER)
                        .orderBy(CARRIER.NAME.asc())
                        .fetch(DatabaseServiceImpl::getCarrier));
    }

    @Override
    public Result<Customer> createCustomer(CreateCustomer customer) {
        return TryUtils.tryCatch(() -> dsl.insertInto(CUSTOMER)
                        .set(CUSTOMER.CODE, customer.code())
                        .set(CUSTOMER.NAME, customer.name())
                        .set(CUSTOMER.ZONE, customer.zone())
                        .set(CUSTOMER.CONTACT, customer.contact())
                        .set(CUSTOMER.CONTACT_NUMBER, customer.contactNumber())
                        .set(CUSTOMER.ENABLED, true)
                        .returning(CUSTOMER.ID)
                        .fetchOne(CUSTOMER.ID))
                .map(id -> new Customer(id, customer.code(), customer.name(), customer.zone(),
                        customer.contact(),
                        customer.contactNumber(), true));

    }

    @Override
    public Result<Carrier> createCarrier(CreateCarrier carrier) {
        return TryUtils.tryCatch(() -> dsl.insertInto(CARRIER)
                        .set(CARRIER.CODE, carrier.code())
                        .set(CARRIER.NAME, carrier.name())
                        .set(CARRIER.ENABLED, true)
                        .returning(CARRIER.ID)
                        .fetchOne(CARRIER.ID))
                .map(id -> new Carrier(id, carrier.code(), carrier.name(), true));
    }

    private static Carrier getCarrier(CarrierRecord carrierRecord) {
        return new Carrier(carrierRecord.getId(),
                carrierRecord.getCode(),
                carrierRecord.getName(),
                carrierRecord.getEnabled());

    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
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
