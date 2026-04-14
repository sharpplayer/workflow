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
import java.util.Objects;
import java.util.Optional;
import java.util.function.BiFunction;
import java.util.function.Function;
import java.util.stream.IntStream;
import org.jooq.Condition;
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
import uk.co.matchboard.app.model.job.JobWithOnePart;
import uk.co.matchboard.app.model.job.SchedulableJobPart;
import uk.co.matchboard.app.model.job.ScheduledJobPartParam;
import uk.co.matchboard.app.model.product.CreatePhase;
import uk.co.matchboard.app.model.product.Phase;
import uk.co.matchboard.app.model.product.PhaseParam;
import uk.co.matchboard.app.model.product.PhaseParamData;
import uk.co.matchboard.app.model.product.PhaseParamEvaluatorInput;
import uk.co.matchboard.app.model.product.PhasesUpdate;
import uk.co.matchboard.app.model.product.Product;
import uk.co.matchboard.app.model.user.User;
import uk.co.matchboard.generated.tables.records.CarrierRecord;
import uk.co.matchboard.generated.tables.records.CustomerRecord;
import uk.co.matchboard.generated.tables.records.JobPartRecord;
import uk.co.matchboard.generated.tables.records.ProductsRecord;
import uk.co.matchboard.generated.tables.records.UsersRecord;

@Service
public class DatabaseServiceImpl implements DatabaseService {

    private record JobWithOnePartSelection(int jobId, int jobPartId) {

    }

    private record PartWithIndex(JobPart part, int index) {

    }

    private final DSLContext outerDsl;

    public DatabaseServiceImpl(DSLContext dsl) {
        this.outerDsl = dsl;
    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public OptionalResult<User> findUser(String user) {
        return Result.toOptionalResult(TryUtils.tryCatch(() ->
                outerDsl.selectFrom(USERS).where(USERS.USERNAME.eq(user))
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
        return TryUtils.tryCatch(() -> outerDsl.insertInto(USERS)
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
        return TryUtils.tryCatch(() -> outerDsl.update(USERS)
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
                outerDsl.selectFrom(USERS)
                        .fetch(DatabaseServiceImpl::getUser));

    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public Result<List<Product>> getProducts() {
        return TryUtils.tryCatch(() ->
                outerDsl.selectFrom(PRODUCTS)
                        .fetch(DatabaseServiceImpl::getProduct));

    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public Result<Product> createProduct(Product product) {
        return TryUtils.tryCatch(() -> outerDsl.insertInto(PRODUCTS)
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
            outerDsl.transaction(configuration -> {
                DSLContext innerDsl = configuration.dsl();
                innerDsl.deleteFrom(PRODUCT_PHASE)
                        .where(PRODUCT_PHASE.PRODUCT_ID.eq(phasesUpdate.productId()))
                        .execute();

                List<Integer> phaseIds = phasesUpdate.phaseIds();
                for (int i = 0; i < phaseIds.size(); i++) {
                    Integer phaseId = phaseIds.get(i);
                    int index = i + 1;
                    innerDsl.insertInto(PRODUCT_PHASE)
                            .set(PRODUCT_PHASE.PRODUCT_ID, phasesUpdate.productId())
                            .set(PRODUCT_PHASE.PHASE_ID, phaseId)
                            .set(PRODUCT_PHASE.ORDER, index)
                            .execute();
                }
            });

            return getPhases(phasesUpdate.productId());
        });
    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public Result<Product> updateProduct(Product product) {
        return TryUtils.tryCatch(() -> outerDsl.update(PRODUCTS)
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
                outerDsl.select(PHASE.ID, PHASE.DESCRIPTION)
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
                outerDsl.select(PHASE.fields())
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
                outerDsl.selectFrom(PRODUCTS).where(PRODUCTS.ID.eq(productId))
                        .fetchOptional(DatabaseServiceImpl::getProduct)));
    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public Result<String> getPhaseName(int phaseId) {
        return TryUtils.tryCatch(() -> {
            String desc = outerDsl.select(PHASE.DESCRIPTION)
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
        return TryUtils.tryCatch(() -> outerDsl.selectFrom(PHASE_PARAM)
                .where(PHASE_PARAM.PHASE_ID.eq(phaseId))
                .orderBy(PHASE_PARAM.ORDER).fetch(r -> getPhaseParam(phaseName, r)));

    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public Result<Phase> createPhase(CreatePhase phase) {
        return TryUtils.tryCatch(() ->
                outerDsl.transactionResult(connection -> {
                    DSLContext innerDsl = connection.dsl();

                    Integer id = innerDsl.insertInto(PHASE)
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
                        Integer paramId = innerDsl.insertInto(PHASE_PARAM)
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
                outerDsl.selectFrom(CUSTOMER)
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
                outerDsl.selectFrom(CARRIER)
                        .orderBy(CARRIER.NAME.asc())
                        .fetch(DatabaseServiceImpl::getCarrier));
    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public Result<Customer> createCustomer(CreateCustomer customer) {
        return TryUtils.tryCatch(() -> outerDsl.insertInto(CUSTOMER)
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
        return TryUtils.tryCatch(() -> outerDsl.insertInto(CARRIER)
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
                outerDsl.transactionResult(connection -> {
                    OffsetDateTime now = OffsetDateTime.now();
                    DSLContext innerDsl = connection.dsl();
                    long jobNumber = getNextJobNumber(innerDsl);

                    Integer jobId = innerDsl.insertInto(JOB)
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
                        Integer partId = innerDsl.insertInto(JOB_PART)
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
                            Integer partPhaseId = innerDsl.insertInto(JOB_PART_PHASES)
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
                                    phaseNo, phase.specialInstructions(), status, "()"));
                            partParams.addAll(
                                    addParams(innerDsl, phase.phaseId(), partPhaseId, phaseNo,
                                            part.params(),
                                            now));
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

    private List<JobPartParam> addParams(DSLContext innerDsl, int phaseId, int jobPartPhaseId,
            int phaseNo,
            List<CreateJobPartParam> params,
            OffsetDateTime now) {
        List<JobPartParam> partParams = new ArrayList<>();
        for (CreateJobPartParam param : params) {
            if (param.phaseNumber() == phaseNo) {

                var paramData = innerDsl.selectFrom(PHASE_PARAM)
                        .where(PHASE_PARAM.ID.eq(param.paramId())).fetchOne();
                if (paramData == null) {
                    throw new DataAccessException(
                            "Failed to find Param, for id " + param.paramId()) {
                    };
                }

                OffsetDateTime valueTime = param.value() == null ? null : now;
                int partPhaseId = param.jobPartPhaseId() == 0 ? jobPartPhaseId
                        : param.jobPartPhaseId();
                Integer paramId = innerDsl.insertInto(JOB_PART_PARAMS)
                        .set(JOB_PART_PARAMS.JOB_PART_PHASE_ID, partPhaseId
                        )
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
                                phaseId,
                                partPhaseId, paramData.getName(),
                                param.value(), valueTime));
            }
        }

        return partParams;
    }

    private static CreateJobPartParam getCreateJobPartParam(Record phaseParamRecord,
            int phaseNumber, String value) {
        return new CreateJobPartParam(phaseParamRecord.get(PHASE_PARAM.ID), phaseNumber, value,
                phaseParamRecord.get(JOB_PART_PHASES.ID));
    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public Result<List<OffsetDateTime>> getScheduleDates() {
        return TryUtils.tryCatch(() ->
                outerDsl.selectDistinct(JOB_PART.SCHEDULE_FOR).from(JOB_PART)
                        .where(JOB_PART.STATUS.in(JobStatus.SCHEDULABLE.getCode(),
                                JobStatus.SCHEDULED.getCode(), JobStatus.STARTED.getCode()))
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
                jobPartRecord.get(JOB_PART.RUN_ORDER),
                jobPartRecord.get(JOB.DUE)
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
                                JobStatus.SCHEDULED.getCode(), JobStatus.STARTED.getCode()
                        ))
                        .and(JOB_PART.SCHEDULE_FOR.eq(date))
                        .orderBy(JOB_PART.RUN_ORDER)
                        .fetch(DatabaseServiceImpl::getSchedulableJobPart));
    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public Result<List<ScheduledJobPartParam>> getScheduleForRole(OffsetDateTime from,
            OffsetDateTime to) {
        return TryUtils.tryCatch(() -> {
            Condition condition = DSL.trueCondition();
            if (from != null) {
                condition = condition.and(JOB_PART.RUN_ON.ge(from));
            }
            if (to != null) {
                condition = condition.and(JOB_PART.RUN_ON.le(to));
            }

            return outerDsl.select(
                            JOB.ID,
                            JOB.NUMBER,
                            JOB.PARTS,

                            JOB_PART.ID,
                            JOB_PART.PART_NUMBER,
                            PRODUCTS.NAME,
                            PRODUCTS.OLD_NAME,
                            JOB_PART.QUANTITY,
                            JOB_PART.STATUS,

                            PHASE.DESCRIPTION,
                            JOB_PART_PHASES.ID,
                            JOB_PART_PHASES.PHASE_ID,
                            JOB_PART_PHASES.PHASE_NUMBER,
                            JOB_PART_PHASES.SPECIAL_INSTRUCTION,
                            JOB_PART_PHASES.STATUS,

                            JOB_PART_PARAMS.ID,
                            JOB_PART_PARAMS.NAME,
                            JOB_PART_PARAMS.CONFIG,
                            JOB_PART_PARAMS.INPUT
                    )
                    .from(JOB_PART)
                    .join(JOB).on(JOB.ID.eq(JOB_PART.JOB_ID))
                    .join(PRODUCTS).on(PRODUCTS.ID.eq(JOB_PART.PRODUCT_ID))
                    .join(JOB_PART_PHASES).on(JOB_PART_PHASES.JOB_PART_ID.eq(JOB_PART.ID))
                    .join(PHASE).on(PHASE.ID.eq(JOB_PART_PHASES.PHASE_ID))
                    .leftJoin(JOB_PART_PARAMS)
                    .on(JOB_PART_PARAMS.JOB_PART_PHASE_ID.eq(JOB_PART_PHASES.ID))
                    .where(JOB_PART.STATUS.in(
                            JobStatus.SCHEDULED.getCode(),
                            JobStatus.STARTED.getCode()
                    ))
                    .and(condition)
                    .orderBy(
                            JOB_PART.RUN_ON,
                            JOB_PART.RUN_ORDER,
                            JOB_PART_PHASES.PHASE_NUMBER,
                            JOB_PART_PARAMS.ORDER.nullsLast(),
                            JOB_PART_PARAMS.ID
                    )
                    .fetch(DatabaseServiceImpl::getScheduledJobPartParam);
        });
    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public OptionalResult<JobWithOnePart> completePhasesAndStart(
            List<Integer> phasesToMarkDone,
            Integer jobPartPhaseId) {

        return Result.toOptionalResult(
                        TryUtils.tryCatch(() -> outerDsl.transactionResult(configuration -> {
                            OffsetDateTime now = OffsetDateTime.now();
                            DSLContext innerDsl = configuration.dsl();

                            if (!phasesToMarkDone.isEmpty()) {
                                Integer completedStatus = JobStatus.COMPLETED.getCode();

                                List<Integer> updatedJobPartIds =
                                        innerDsl.update(JOB_PART_PHASES)
                                                .set(JOB_PART_PHASES.COMPLETED_AT, now)
                                                .set(JOB_PART_PHASES.STATUS, completedStatus)
                                                .set(JOB_PART_PHASES.STARTED_AT,
                                                        DSL.coalesce(JOB_PART_PHASES.STARTED_AT, now))
                                                .where(JOB_PART_PHASES.PHASE_ID.in(phasesToMarkDone))
                                                .and(JOB_PART_PHASES.STATUS.ne(completedStatus))
                                                .returningResult(JOB_PART_PHASES.JOB_PART_ID)
                                                .fetch(JOB_PART_PHASES.JOB_PART_ID);

                                if (!updatedJobPartIds.isEmpty()) {
                                    List<Integer> updatedJobIds =
                                            innerDsl.update(JOB_PART)
                                                    .set(JOB_PART.STATUS, completedStatus)
                                                    .set(JOB_PART.COMPLETED_AT, now)
                                                    .set(JOB_PART.STARTED_AT,
                                                            DSL.coalesce(JOB_PART.STARTED_AT, now))
                                                    .where(JOB_PART.ID.in(updatedJobPartIds))
                                                    .and(JOB_PART.STATUS.ne(completedStatus))
                                                    .andExists(
                                                            DSL.selectOne()
                                                                    .from(JOB_PART_PHASES)
                                                                    .where(JOB_PART_PHASES.JOB_PART_ID.eq(
                                                                            JOB_PART.ID))
                                                    )
                                                    .andNotExists(
                                                            DSL.selectOne()
                                                                    .from(JOB_PART_PHASES)
                                                                    .where(JOB_PART_PHASES.JOB_PART_ID.eq(
                                                                            JOB_PART.ID))
                                                                    .and(JOB_PART_PHASES.STATUS.ne(
                                                                            completedStatus))
                                                    )
                                                    .returningResult(JOB_PART.JOB_ID)
                                                    .fetch(JOB_PART.JOB_ID);

                                    if (!updatedJobIds.isEmpty()) {
                                        innerDsl.update(JOB)
                                                .set(JOB.STATUS, completedStatus)
                                                .set(JOB.COMPLETED_AT, now)
                                                .set(JOB.STARTED_AT,
                                                        DSL.coalesce(JOB.STARTED_AT, now))
                                                .where(JOB.ID.in(updatedJobIds))
                                                .and(JOB.STATUS.ne(completedStatus))
                                                .andExists(
                                                        DSL.selectOne()
                                                                .from(JOB_PART)
                                                                .where(JOB_PART.JOB_ID.eq(JOB.ID))
                                                )
                                                .andNotExists(
                                                        DSL.selectOne()
                                                                .from(JOB_PART)
                                                                .where(JOB_PART.JOB_ID.eq(JOB.ID))
                                                                .and(JOB_PART.STATUS.ne(completedStatus))
                                                )
                                                .execute();
                                    }
                                }
                            }

                            if (jobPartPhaseId != null) {
                                Integer jobPartId =
                                        innerDsl.update(JOB_PART_PHASES)
                                                .set(JOB_PART_PHASES.STARTED_AT,
                                                        DSL.coalesce(JOB_PART_PHASES.STARTED_AT, now))
                                                .set(JOB_PART_PHASES.STATUS, JobStatus.STARTED.getCode())
                                                .where(JOB_PART_PHASES.ID.eq(jobPartPhaseId))
                                                .and(JOB_PART_PHASES.STATUS.ne(
                                                        JobStatus.COMPLETED.getCode()))
                                                .returningResult(JOB_PART_PHASES.JOB_PART_ID)
                                                .fetchOne(JOB_PART_PHASES.JOB_PART_ID);

                                if (jobPartId != null) {
                                    Integer jobId = innerDsl
                                            .select(JOB_PART.JOB_ID)
                                            .from(JOB_PART)
                                            .where(JOB_PART.ID.eq(jobPartId))
                                            .fetchOne(JOB_PART.JOB_ID);

                                    if (jobId == null) {
                                        throw new DataAccessException(
                                                "Failed to find Job with part id " + jobPartId) {
                                        };
                                    }

                                    innerDsl.update(JOB_PART)
                                            .set(JOB_PART.STARTED_AT,
                                                    DSL.coalesce(JOB_PART.STARTED_AT, now))
                                            .set(JOB_PART.STATUS, JobStatus.STARTED.getCode())
                                            .where(JOB_PART.ID.eq(jobPartId))
                                            .and(JOB_PART.STATUS.ne(JobStatus.COMPLETED.getCode()))
                                            .execute();

                                    innerDsl.update(JOB)
                                            .set(JOB.STARTED_AT,
                                                    DSL.coalesce(JOB.STARTED_AT, now))
                                            .set(JOB.STATUS, JobStatus.STARTED.getCode())
                                            .where(JOB.ID.eq(jobId))
                                            .and(JOB.STATUS.ne(JobStatus.COMPLETED.getCode()))
                                            .execute();

                                    return Optional.of(new JobWithOnePartSelection(jobId, jobPartId));
                                }
                            }

                            return Optional.empty();
                        })))
                .flatMapOptional(selected ->
                        findJob(selected.jobId()).fold(j -> {
                                    PartWithIndex part = IntStream.range(0, j.parts().size())
                                            .filter(i -> Objects.equals(
                                                    j.parts().get(i).jobPartId(),
                                                    selected.jobPartId()
                                            ))
                                            .mapToObj(i -> new PartWithIndex(j.parts().get(i), i))
                                            .findFirst().orElse(new PartWithIndex(null, -1));

                                    return findProduct(part.part.productId()).map(p -> new JobWithOnePart(
                                            j.id(),
                                            j.number(),
                                            j.due(),
                                            j.customer(),
                                            j.carrier(),
                                            j.callOff(),
                                            part.part,
                                            j.status(),
                                            j.paymentReceived(), part.index + 1, j.parts().size(), p
                                    ));
                                },
                                OptionalResult::failure,
                                OptionalResult::<JobWithOnePart>empty
                        ));
    }

    private static ScheduledJobPartParam getScheduledJobPartParam(Record record) {
        return new ScheduledJobPartParam(
                record.get(JOB.ID),
                record.get(JOB.NUMBER),
                record.get(JOB.PARTS),
                record.get(JOB_PART.ID),
                record.get(JOB_PART.PART_NUMBER),
                record.get(PRODUCTS.NAME),
                record.get(PRODUCTS.OLD_NAME),
                record.get(JOB_PART.QUANTITY),
                record.get(JOB_PART.STATUS),
                record.get(PHASE.DESCRIPTION),
                record.get(JOB_PART_PHASES.ID),
                record.get(JOB_PART_PHASES.PHASE_ID),
                record.get(JOB_PART_PHASES.PHASE_NUMBER),
                record.get(JOB_PART_PHASES.SPECIAL_INSTRUCTION),
                record.get(JOB_PART_PHASES.STATUS),
                record.get(JOB_PART_PARAMS.ID),
                record.get(JOB_PART_PARAMS.NAME),
                record.get(JOB_PART_PARAMS.CONFIG),
                record.get(JOB_PART_PARAMS.INPUT)
        );
    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public Result<Boolean> updateSchedule(OffsetDateTime date, List<Integer> jobPartIds,
            Function<PhaseParamEvaluatorInput, String> evaluator) {
        if (jobPartIds == null || jobPartIds.isEmpty()) {
            return Result.of(false);
        }

        return TryUtils.tryCatch(() -> outerDsl.transactionResult(configuration -> {
            DSLContext innerDsl = configuration.dsl();

            Integer maxRunOrder = innerDsl
                    .select(DSL.max(JOB_PART.RUN_ORDER))
                    .from(JOB_PART)
                    .where(JOB_PART.STATUS.eq(JobStatus.SCHEDULED.getCode()))
                    .and(JOB_PART.RUN_ON.eq(date))
                    .fetchOne(0, Integer.class);

            int nextRunOrder = maxRunOrder == null ? 1 : maxRunOrder + 1;

            int updatedCount = 0;

            for (Integer jobPartId : jobPartIds) {
                int rows = innerDsl
                        .update(JOB_PART)
                        .set(JOB_PART.STATUS, JobStatus.SCHEDULED.getCode())
                        .set(JOB_PART.SCHEDULE_FOR, date)
                        .set(JOB_PART.RUN_ON, date)
                        .set(JOB_PART.RUN_ORDER, nextRunOrder++)
                        .where(JOB_PART.ID.eq(jobPartId))
                        .and(JOB_PART.STATUS.eq(JobStatus.SCHEDULABLE.getCode()))
                        .execute();

                if (rows > 0) {
                    Integer productId = innerDsl.select(JOB_PART.PRODUCT_ID).from(JOB_PART)
                            .where(JOB_PART.ID.eq(jobPartId)).fetchOne(JOB_PART.PRODUCT_ID);

                    if (productId == null) {
                        throw new DataAccessException(
                                "Failed to find product, no product id on job part "
                                        + jobPartId) {
                        };
                    }

                    var product = findProduct(productId);

                    var phases = innerDsl.selectFrom(JOB_PART_PHASES)
                            .where(JOB_PART_PHASES.JOB_PART_ID.eq(jobPartId)).fetch();
                    for (var phase : phases) {
                        var phaseRunData = innerDsl.select(
                                        PHASE_PARAM.fields())
                                .select(JOB_PART_PHASES.ID)
                                .from(PHASE_PARAM)
                                .join(JOB_PART_PHASES)
                                .on(JOB_PART_PHASES.PHASE_ID.eq(PHASE_PARAM.PHASE_ID))
                                .and(JOB_PART_PHASES.JOB_PART_ID.eq(jobPartId))
                                .and(JOB_PART_PHASES.PHASE_ID.eq(phase.getPhaseId()))
                                .where(PHASE_PARAM.PHASE_ID.eq(phase.getPhaseId()))
                                .and(PHASE_PARAM.INPUT.in(ConfigurationServiceImpl.INPUT_PHASE_RUN,
                                        ConfigurationServiceImpl.INPUT_JOB_CREATE))
                                .orderBy(PHASE_PARAM.ORDER.asc())
                                .fetch(r -> getCreateJobPartParam(r, phase.getPhaseNumber(),
                                        evaluator.apply(new PhaseParamEvaluatorInput(
                                                product,
                                                r.get(PHASE_PARAM.CONFIG),
                                                r.get(PHASE_PARAM.INPUT)))));
                        addParams(innerDsl, phase.getPhaseId(), 0, phase.getPhaseNumber(),
                                phaseRunData, null);
                    }
                }
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
                outerDsl.transactionResult(connection -> {
                    DSLContext innerDsl = connection.dsl();

                    var jobRecord = innerDsl.selectFrom(JOB)
                            .where(JOB.ID.eq(jobId))
                            .fetchOne();

                    if (jobRecord == null) {
                        return Optional.empty();
                    }

                    List<JobPart> jobParts = new ArrayList<>();

                    var partRecords = innerDsl.selectFrom(JOB_PART)
                            .where(JOB_PART.JOB_ID.eq(jobId))
                            .orderBy(JOB_PART.PART_NUMBER.asc())
                            .fetch();

                    for (var partRecord : partRecords) {
                        jobParts.add(getJobPart(innerDsl, partRecord));
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

    private JobPart getJobPart(DSLContext innerDsl, JobPartRecord partRecord) {
        List<JobPartPhase> jobPartPhases = new ArrayList<>();
        List<JobPartParam> partParams = new ArrayList<>();

        var product = innerDsl.selectFrom(PRODUCTS)
                .where(PRODUCTS.ID.eq(partRecord.getProductId())).fetchOne();
        if (product == null) {
            throw new DataAccessException(
                    "Failed to find Job, no product found with id "
                            + partRecord.getProductId()) {
            };
        }

        var phaseRecords = innerDsl
                .select(JOB_PART_PHASES.fields())
                .select(PHASE.DESCRIPTION)
                .from(JOB_PART_PHASES)
                .join(PHASE)
                .on(JOB_PART_PHASES.PHASE_ID.eq(PHASE.ID))
                .where(JOB_PART_PHASES.JOB_PART_ID.eq(partRecord.getId()))
                .orderBy(JOB_PART_PHASES.PHASE_NUMBER.asc())
                .fetch();

        for (var phaseRecord : phaseRecords) {
            Integer partPhaseId = phaseRecord.get(JOB_PART_PHASES.ID);
            Integer phaseNumber = phaseRecord.get(JOB_PART_PHASES.PHASE_NUMBER);

            jobPartPhases.add(new JobPartPhase(
                    partPhaseId,
                    partRecord.getId(),
                    phaseNumber,
                    phaseRecord.get(JOB_PART_PHASES.SPECIAL_INSTRUCTION),
                    phaseRecord.get(JOB_PART_PHASES.STATUS),
                    phaseRecord.get(PHASE.DESCRIPTION)
            ));

            var records = innerDsl
                    .select(JOB_PART_PARAMS.ID,
                            JOB_PART_PARAMS.INPUT,
                            JOB_PART_PHASES.PHASE_ID,
                            JOB_PART_PARAMS.NAME,
                            JOB_PART_PARAMS.VALUE,
                            JOB_PART_PARAMS.VALUED_AT,
                            JOB_PART_PHASES.PHASE_ID)
                    .from(JOB_PART_PARAMS)
                    .join(JOB_PART_PHASES)
                    .on(JOB_PART_PARAMS.JOB_PART_PHASE_ID.eq(JOB_PART_PHASES.ID))
                    .where(JOB_PART_PARAMS.JOB_PART_PHASE_ID.eq(partPhaseId))
                    .fetch();

            for (var record : records) {
                partParams.add(new JobPartParam(
                        record.get(JOB_PART_PARAMS.ID),
                        phaseNumber,
                        record.get(JOB_PART_PARAMS.INPUT),
                        record.get(JOB_PART_PHASES.PHASE_ID),
                        partPhaseId,
                        record.get(JOB_PART_PARAMS.NAME),
                        record.get(JOB_PART_PARAMS.VALUE),
                        record.get(JOB_PART_PARAMS.VALUED_AT)
                ));
            }
        }

        return new JobPart(
                partRecord.getId(),
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
        );
    }

    @Nonnull
    private SelectOnConditionStep<Record> getSchedulableQuery() {
        return outerDsl.select(JOB_PART.fields())
                .select(JOB.ID, JOB.NUMBER, JOB.STATUS, JOB.PARTS, JOB.DUE)
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
                outerDsl.selectFrom(CONFIGURATION).where(CONFIGURATION.ID.eq(config))
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

