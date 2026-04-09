package uk.co.matchboard.app.service;

import static uk.co.matchboard.generated.Sequences.JOB_NUMBER_SEQ;
import static uk.co.matchboard.generated.Tables.CARRIER;
import static uk.co.matchboard.generated.Tables.CONFIGURATION;
import static uk.co.matchboard.generated.Tables.CUSTOMER;
import static uk.co.matchboard.generated.Tables.JOB;
import static uk.co.matchboard.generated.Tables.JOB_PART;
import static uk.co.matchboard.generated.Tables.JOB_PART_PARAMS;
import static uk.co.matchboard.generated.Tables.JOB_PART_PHASES;
import static uk.co.matchboard.generated.Tables.PHASE;
import static uk.co.matchboard.generated.Tables.PHASE_PARAM;
import static uk.co.matchboard.generated.Tables.PRODUCTS;
import static uk.co.matchboard.generated.Tables.PRODUCT_PHASE;
import static uk.co.matchboard.generated.Tables.USERS;

import jakarta.annotation.Nonnull;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.function.BiFunction;
import java.util.function.Function;
import org.jooq.DSLContext;
import org.jooq.Record;
import org.jooq.SelectOnConditionStep;
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
import uk.co.matchboard.app.model.job.CreateJob;
import uk.co.matchboard.app.model.job.CreateJobPart;
import uk.co.matchboard.app.model.job.CreateJobPartParam;
import uk.co.matchboard.app.model.job.CreateJobPartPhase;
import uk.co.matchboard.app.model.job.Job;
import uk.co.matchboard.app.model.job.JobPart;
import uk.co.matchboard.app.model.job.JobPartParam;
import uk.co.matchboard.app.model.job.JobPartPhase;
import uk.co.matchboard.app.model.job.JobStatus;
import uk.co.matchboard.app.model.job.SchedulableJobPart;
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

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
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

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
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

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public Result<Job> createJob(CreateJob job, Function<CreateJobPart, Integer> partStatusProvider,
            BiFunction<CreateJobPartPhase, Integer, Integer> phaseStatusProvider, int jobStatus) {

        return TryUtils.tryCatch(() ->
                dsl.transactionResult(connection -> {
                    OffsetDateTime now = OffsetDateTime.now();
                    DSLContext dsl = DSL.using(connection);
                    long jobNumber = getNextJobNumber(dsl);

                    Integer jobId = dsl.insertInto(JOB)
                            .set(JOB.NUMBER, jobNumber)
                            .set(JOB.PARTS, job.parts().size())
                            .set(JOB.DUE, job.due())
                            .set(JOB.CUSTOMER_ID, job.customer())
                            .set(JOB.CARRIER_ID, job.carrier())
                            .set(JOB.CALL_OFF, job.callOff())
                            .set(JOB.PAYMENT_RECEIVED, job.paymentReceived())
                            .set(JOB.STATUS, jobStatus)
                            .returning(JOB.ID)
                            .fetchOne(JOB.ID);

                    if (jobId == null) {
                        throw new DataAccessException("Failed to insert Job, no ID returned") {
                        };
                    }

                    int partNo = 1;
                    List<JobPart> jobParts = new ArrayList<>();
                    for (CreateJobPart part : job.parts()) {
                        int partStatus = partStatusProvider.apply(part);
                        Integer partId = dsl.insertInto(JOB_PART)
                                .set(JOB_PART.JOB_ID, jobId)
                                .set(JOB_PART.PART_NUMBER, partNo)
                                .set(JOB_PART.PRODUCT_ID, part.productId())
                                .set(JOB_PART.QUANTITY, part.quantity())
                                .set(JOB_PART.FROM_CALL_OFF, part.fromCallOff())
                                .set(JOB_PART.MATERIAL_AVAILABLE, part.materialAvailable())
                                .set(JOB_PART.SCHEDULE_FOR, part.scheduleFor())
                                .set(JOB_PART.STATUS, partStatus)
                                .returning(JOB_PART.ID)
                                .fetchOne(JOB_PART.ID);
                        if (partId == null) {
                            throw new DataAccessException(
                                    "Failed to insert Job Part, no ID returned") {
                            };
                        }

                        int phaseNo = 1;
                        List<JobPartPhase> jobPartPhases = new ArrayList<>();
                        List<JobPartParam> partParams = new ArrayList<>();
                        Integer status = -1;
                        for (CreateJobPartPhase phase : part.phases()) {
                            status = phaseStatusProvider.apply(phase, status);
                            Integer partPhaseId = dsl.insertInto(JOB_PART_PHASES)
                                    .set(JOB_PART_PHASES.JOB_PART_ID, partId)
                                    .set(JOB_PART_PHASES.PHASE_ID, phase.phaseId())
                                    .set(JOB_PART_PHASES.PHASE_NUMBER, phaseNo)
                                    .set(JOB_PART_PHASES.SPECIAL_INSTRUCTION,
                                            phase.specialInstructions())
                                    .set(JOB_PART_PHASES.STATUS, status)
                                    .returning(JOB_PART_PHASES.ID)
                                    .fetchOne(JOB_PART_PHASES.ID);
                            if (partPhaseId == null) {
                                throw new DataAccessException(
                                        "Failed to insert Job Part Phase, no ID returned") {
                                };
                            }
                            jobPartPhases.add(new JobPartPhase(partPhaseId, partId,
                                    phaseNo, phase.specialInstructions(), status));

                            for (CreateJobPartParam param : part.params()) {
                                if (param.phaseNumber() == phaseNo) {

                                    var paramData = dsl.selectFrom(PHASE_PARAM)
                                            .where(PHASE_PARAM.ID.eq(param.paramId())).fetchOne();
                                    if (paramData == null) {
                                        throw new DataAccessException(
                                                "Failed to find Param, for id " + param.paramId()) {
                                        };
                                    }

                                    OffsetDateTime valueTime = param.value() == null ? null : now;
                                    Integer paramId = dsl.insertInto(JOB_PART_PARAMS)
                                            .set(JOB_PART_PARAMS.JOB_PART_PHASE_ID, partPhaseId)
                                            .set(JOB_PART_PARAMS.NAME, paramData.getName())
                                            .set(JOB_PART_PARAMS.INPUT, paramData.getInput())
                                            .set(JOB_PART_PARAMS.CONFIG, paramData.getConfig())
                                            .set(JOB_PART_PARAMS.ORDER, paramData.getOrder())
                                            .set(JOB_PART_PARAMS.VALUE, param.value())
                                            .set(JOB_PART_PARAMS.VALUED_AT, valueTime)
                                            .returning(JOB_PART_PARAMS.ID)
                                            .fetchOne(JOB_PART_PARAMS.ID);
                                    if (paramId == null) {
                                        throw new DataAccessException(
                                                "Failed to insert Job Part Param, no ID returned") {
                                        };
                                    }
                                    partParams.add(
                                            new JobPartParam(paramId,
                                                    param.phaseNumber(), paramData.getInput(),
                                                    partPhaseId, paramData.getName(),
                                                    param.value(), valueTime));
                                }
                            }
                            phaseNo++;
                        }
                        partNo++;
                        jobParts.add(
                                new JobPart(partId, part.productId(), "()", "()", part.quantity(),
                                        part.fromCallOff(), part.materialAvailable(),
                                        part.scheduleFor(),
                                        jobPartPhases,
                                        partParams,
                                        partStatus));
                    }
                    return new Job(jobId, jobNumber, job.due(), job.customer(), job.carrier(),
                            job.callOff(), jobParts, jobStatus, job.paymentReceived());
                }));
    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public Result<List<OffsetDateTime>> getScheduleDates() {
        return TryUtils.tryCatch(() ->
                dsl.selectDistinct(JOB_PART.SCHEDULE_FOR).from(JOB_PART)
                        .where(JOB_PART.STATUS.in(JobStatus.SCHEDULABLE.getCode(),
                                JobStatus.SCHEDULED.getCode()))
                        .fetch(JOB_PART.SCHEDULE_FOR)
        );
    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public Result<List<SchedulableJobPart>> getUnscheduled() {
        return TryUtils.tryCatch(() ->
                getSchedulableQuery()
                        .where(JOB_PART.STATUS.eq(JobStatus.SAVED.getCode()))
                        .fetch(DatabaseServiceImpl::getSchedulableJobPart));
    }

    private static SchedulableJobPart getSchedulableJobPart(Record jobPartRecord) {
        return new SchedulableJobPart(jobPartRecord.get(JOB_PART.ID),
                jobPartRecord.get(PRODUCTS.NAME),
                jobPartRecord.get(PRODUCTS.OLD_NAME),
                jobPartRecord.get(JOB_PART.QUANTITY),
                jobPartRecord.get(JOB_PART.FROM_CALL_OFF),
                jobPartRecord.get(JOB.ID),
                jobPartRecord.get(JOB.NUMBER),
                jobPartRecord.get(JOB_PART.STATUS),
                jobPartRecord.get(JOB.STATUS),
                jobPartRecord.get(JOB_PART.PART_NUMBER),
                jobPartRecord.get(JOB.PARTS),
                jobPartRecord.get(JOB_PART.RUN_ORDER)
        );
    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public Result<List<SchedulableJobPart>> getScheduleFor(OffsetDateTime date) {
        return TryUtils.tryCatch(() ->
                getSchedulableQuery()
                        .where(JOB_PART.STATUS.in(
                                JobStatus.SCHEDULABLE.getCode(),
                                JobStatus.SCHEDULED.getCode()
                        ))
                        .and(JOB_PART.SCHEDULE_FOR.eq(date))
                        .orderBy(JOB_PART.RUN_ORDER)
                        .fetch(DatabaseServiceImpl::getSchedulableJobPart));
    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public Result<Boolean> updateSchedule(OffsetDateTime date, List<Integer> jobPartIds) {
        if (jobPartIds == null || jobPartIds.isEmpty()) {
            return Result.of(false);
        }

        return TryUtils.tryCatch(() -> dsl.transactionResult(configuration -> {
            DSLContext ctx = configuration.dsl();

            Integer maxRunOrder = ctx
                    .select(DSL.max(JOB_PART.RUN_ORDER))
                    .from(JOB_PART)
                    .where(JOB_PART.STATUS.eq(JobStatus.SCHEDULED.getCode()))
                    .and(JOB_PART.RUN_ON.eq(date))
                    .fetchOne(0, Integer.class);

            int nextRunOrder = maxRunOrder == null ? 1 : maxRunOrder + 1;

            int updatedCount = 0;

            for (Integer jobPartId : jobPartIds) {
                int rows = ctx
                        .update(JOB_PART)
                        .set(JOB_PART.STATUS, JobStatus.SCHEDULED.getCode())
                        .set(JOB_PART.SCHEDULE_FOR, date)
                        .set(JOB_PART.RUN_ON, date)
                        .set(JOB_PART.RUN_ORDER, nextRunOrder++)
                        .where(JOB_PART.ID.eq(jobPartId))
                        .and(JOB_PART.STATUS.eq(JobStatus.SCHEDULABLE.getCode()))
                        .execute();

                updatedCount += rows;
            }

            return updatedCount > 0;
        }));
    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public OptionalResult<Job> findJob(int jobId) {
        return Result.toOptionalResult(TryUtils.tryCatch(() ->
                dsl.transactionResult(connection -> {
                    DSLContext dsl = DSL.using(connection);

                    var jobRecord = dsl.selectFrom(JOB)
                            .where(JOB.ID.eq(jobId))
                            .fetchOne();

                    if (jobRecord == null) {
                        return Optional.empty();
                    }

                    List<JobPart> jobParts = new ArrayList<>();

                    var partRecords = dsl.selectFrom(JOB_PART)
                            .where(JOB_PART.JOB_ID.eq(jobId))
                            .orderBy(JOB_PART.PART_NUMBER.asc())
                            .fetch();

                    for (var partRecord : partRecords) {
                        Integer partId = partRecord.getId();

                        List<JobPartPhase> jobPartPhases = new ArrayList<>();
                        List<JobPartParam> partParams = new ArrayList<>();

                        var product = dsl.selectFrom(PRODUCTS)
                                .where(PRODUCTS.ID.eq(partRecord.getProductId())).fetchOne();
                        if (product == null) {
                            throw new DataAccessException(
                                    "Failed to find Job, no product found with id "
                                            + partRecord.getProductId()) {
                            };
                        }

                        var phaseRecords = dsl.selectFrom(JOB_PART_PHASES)
                                .where(JOB_PART_PHASES.JOB_PART_ID.eq(partId))
                                .orderBy(JOB_PART_PHASES.PHASE_NUMBER.asc())
                                .fetch();

                        for (var phaseRecord : phaseRecords) {
                            Integer partPhaseId = phaseRecord.getId();
                            Integer phaseNumber = phaseRecord.getPhaseNumber();

                            jobPartPhases.add(new JobPartPhase(
                                    partPhaseId,
                                    partId,
                                    phaseNumber,
                                    phaseRecord.getSpecialInstruction(),
                                    phaseRecord.getStatus()
                            ));

                            var records = dsl.selectFrom(JOB_PART_PARAMS)
                                    .where(JOB_PART_PARAMS.JOB_PART_PHASE_ID.eq(partPhaseId))
                                    .fetch();

                            for (var record : records) {
                                partParams.add(new JobPartParam(
                                        record.get(JOB_PART_PARAMS.ID),
                                        phaseNumber,
                                        record.get(JOB_PART_PARAMS.INPUT),
                                        partPhaseId,
                                        record.get(JOB_PART_PARAMS.NAME),
                                        record.get(JOB_PART_PARAMS.VALUE),
                                        record.get(JOB_PART_PARAMS.VALUED_AT)
                                ));
                            }
                        }

                        jobParts.add(new JobPart(
                                partId,
                                partRecord.getProductId(),
                                product.getName(),
                                product.getOldName(),
                                partRecord.getQuantity(),
                                partRecord.getFromCallOff(),
                                partRecord.getMaterialAvailable(),
                                partRecord.getScheduleFor(),
                                jobPartPhases,
                                partParams,
                                partRecord.getStatus()
                        ));
                    }

                    return Optional.of(new Job(
                            jobRecord.getId(),
                            jobRecord.getNumber(),
                            jobRecord.getDue(),
                            jobRecord.getCustomerId(),
                            jobRecord.getCarrierId(),
                            jobRecord.getCallOff(),
                            jobParts,
                            jobRecord.getStatus(),
                            jobRecord.getPaymentReceived()
                    ));
                })));
    }

    @Nonnull
    private SelectOnConditionStep<Record> getSchedulableQuery() {
        return dsl.select(JOB_PART.fields())
                .select(JOB.ID, JOB.NUMBER, JOB.STATUS, JOB.PARTS)
                .select(PRODUCTS.NAME, PRODUCTS.OLD_NAME)
                .from(JOB_PART)
                .join(JOB).on(JOB_PART.JOB_ID.eq(JOB.ID))
                .join(PRODUCTS).on(JOB_PART.PRODUCT_ID.eq(PRODUCTS.ID));
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

    private static long getNextJobNumber(DSLContext dsl) {

        String nextJob = dsl.select(CONFIGURATION.VALUE)
                .from(CONFIGURATION)
                .where(CONFIGURATION.ID.eq("NEXTJOB"))
                .fetchOne(CONFIGURATION.VALUE);

        long configuredNext = 1L;
        if (nextJob != null && !nextJob.isBlank()) {
            configuredNext = Long.parseLong(nextJob);
        }

        Long maxJobNumber = dsl
                .select(DSL.max(JOB.NUMBER))
                .from(JOB)
                .fetchOne(0, Long.class);

        long sequenceFloor = Math.max(
                maxJobNumber == null ? 1L : maxJobNumber + 1L,
                configuredNext
        );

        dsl.execute(
                """
                select setval(
                    'job_number_seq',
                    greatest(?, (select last_value from job_number_seq)),
                    false
                )
                """, sequenceFloor);

        return dsl.nextval(JOB_NUMBER_SEQ);
    }
}

