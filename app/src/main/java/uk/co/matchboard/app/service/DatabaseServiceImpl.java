package uk.co.matchboard.app.service;

import static org.jooq.impl.DSL.condition;
import static org.jooq.impl.DSL.field;
import static org.jooq.impl.DSL.inline;
import static org.jooq.impl.DSL.max;
import static org.jooq.impl.DSL.min;
import static org.jooq.impl.DSL.name;
import static org.jooq.impl.DSL.row;
import static org.jooq.impl.DSL.trueCondition;
import static org.jooq.impl.DSL.val;
import static org.jooq.impl.DSL.values;
import static uk.co.matchboard.generated.Sequences.JOB_NUMBER_SEQ;
import static uk.co.matchboard.generated.Tables.CARRIER;
import static uk.co.matchboard.generated.Tables.CONFIGURATION;
import static uk.co.matchboard.generated.Tables.CUSTOMER;
import static uk.co.matchboard.generated.Tables.JOB;
import static uk.co.matchboard.generated.Tables.JOB_PART;
import static uk.co.matchboard.generated.Tables.JOB_PART_OPERATION;
import static uk.co.matchboard.generated.Tables.JOB_PART_PARAMS;
import static uk.co.matchboard.generated.Tables.JOB_PART_PHASES;
import static uk.co.matchboard.generated.Tables.MACHINES;
import static uk.co.matchboard.generated.Tables.PHASE;
import static uk.co.matchboard.generated.Tables.PHASE_PARAM;
import static uk.co.matchboard.generated.Tables.PRODUCTS;
import static uk.co.matchboard.generated.Tables.PRODUCT_MACHINES;
import static uk.co.matchboard.generated.Tables.PRODUCT_PHASE;
import static uk.co.matchboard.generated.Tables.USERS;
import static uk.co.matchboard.generated.Tables.WASTAGE;

import jakarta.annotation.Nonnull;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.BiFunction;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.util.stream.Stream;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.Field;
import org.jooq.Record;
import org.jooq.Record1;
import org.jooq.Record2;
import org.jooq.Row1;
import org.jooq.SelectOnConditionStep;
import org.jooq.Table;
import org.jooq.impl.DSL;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.TransientDataAccessException;
import org.springframework.lang.NonNull;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import uk.co.matchboard.app.exception.InvalidJobException;
import uk.co.matchboard.app.exception.InvalidSignOffException;
import uk.co.matchboard.app.functional.OptionalResult;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.functional.TryUtils;
import uk.co.matchboard.app.model.config.Carrier;
import uk.co.matchboard.app.model.config.Config;
import uk.co.matchboard.app.model.config.ConfigValuePair;
import uk.co.matchboard.app.model.config.CreateCarrier;
import uk.co.matchboard.app.model.config.Customer;
import uk.co.matchboard.app.model.job.CreateJob;
import uk.co.matchboard.app.model.job.CreateJobPart;
import uk.co.matchboard.app.model.job.CreateJobPartParam;
import uk.co.matchboard.app.model.job.CreateJobPartPhase;
import uk.co.matchboard.app.model.job.CreateScheduledJobPart;
import uk.co.matchboard.app.model.job.Job;
import uk.co.matchboard.app.model.job.JobPart;
import uk.co.matchboard.app.model.job.JobPartParam;
import uk.co.matchboard.app.model.job.JobPartPhase;
import uk.co.matchboard.app.model.job.JobStatus;
import uk.co.matchboard.app.model.job.JobView;
import uk.co.matchboard.app.model.job.JobWithOnePart;
import uk.co.matchboard.app.model.job.ParamStatus;
import uk.co.matchboard.app.model.job.SchedulableJobPart;
import uk.co.matchboard.app.model.job.ScheduleForRole;
import uk.co.matchboard.app.model.job.ScheduleSummary;
import uk.co.matchboard.app.model.job.ScheduledJobPartParam;
import uk.co.matchboard.app.model.job.ScheduledJobPartView;
import uk.co.matchboard.app.model.product.CreatePhase;
import uk.co.matchboard.app.model.product.Machine;
import uk.co.matchboard.app.model.product.Phase;
import uk.co.matchboard.app.model.product.PhaseParam;
import uk.co.matchboard.app.model.product.PhaseParamData;
import uk.co.matchboard.app.model.product.PhaseParamEvaluatorInput;
import uk.co.matchboard.app.model.product.PhasesUpdate;
import uk.co.matchboard.app.model.product.Product;
import uk.co.matchboard.app.model.product.ProductMachine;
import uk.co.matchboard.app.model.user.User;
import uk.co.matchboard.app.model.wastage.CreateWastage;
import uk.co.matchboard.app.model.wastage.Wastage;
import uk.co.matchboard.app.model.wastage.WastageView;
import uk.co.matchboard.generated.tables.records.CarrierRecord;
import uk.co.matchboard.generated.tables.records.CustomerRecord;
import uk.co.matchboard.generated.tables.records.JobPartParamsRecord;
import uk.co.matchboard.generated.tables.records.JobPartRecord;
import uk.co.matchboard.generated.tables.records.JobRecord;
import uk.co.matchboard.generated.tables.records.PhaseRecord;
import uk.co.matchboard.generated.tables.records.ProductMachinesRecord;
import uk.co.matchboard.generated.tables.records.ProductsRecord;
import uk.co.matchboard.generated.tables.records.UsersRecord;

@Service
public class DatabaseServiceImpl implements DatabaseService {

    private static final int GENERATED_PARAM_ID = -1;
    public static final int RPI_LEFT_OFFSET = 10000000;

    private static List<Machine> MACHINES_LIST;

    private static LinkedHashMap<Integer, Customer> CUSTOMERS_MAP;

    private record JobWithOnePartSelection(int jobId, int jobPartId, Integer completedPhaseId) {

    }

    private record PhaseData(Record phase, AtomicInteger paramCount) {

    }

    private static class MachinePhaseSignoffParams {

        private final List<UUID> params = new ArrayList<>();

        public void addParam(CreateJobPartParam param) {
            params.add(param.tempKey());
        }

        public Integer getStartSignOffParam(Map<UUID, JobPartParam> newParams) {
            if (!params.isEmpty() && newParams.containsKey(params.getFirst())) {
                return newParams.get(params.getFirst()).partParamId();
            }
            return null;
        }

        public Integer getFinishSignOffParam(Map<UUID, JobPartParam> newParams) {
            if (params.size() >= 2 && newParams.containsKey(params.getLast())) {
                return newParams.get(params.getLast()).partParamId();
            }
            return null;
        }

        public Integer getFirstOffSignOffParam(Map<UUID, JobPartParam> newParams) {
            if (params.size() == 3 && newParams.containsKey(params.get(1))) {
                return newParams.get(params.get(1)).partParamId();
            }
            return null;
        }

        public boolean isSignOffRequired() {
            return !params.isEmpty();
        }

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
    private static Product getProduct(ProductsRecord rec, DSLContext dsl) {
        List<ProductMachine> machinery = dsl.select(MACHINES.ID, MACHINES.NAME,
                        PRODUCT_MACHINES.SECONDS_PER_UNIT, PRODUCT_MACHINES.SECONDS_PER_PACK)
                .from(PRODUCT_MACHINES)
                .join(MACHINES).on(MACHINES.ID.eq(PRODUCT_MACHINES.MACHINE_ID))
                .where(PRODUCT_MACHINES.PRODUCT_ID.eq(rec.getId()))
                .orderBy(PRODUCT_MACHINES.STEP_NUMBER.asc())
                .fetch(r -> new ProductMachine(r.get(MACHINES.ID), r.get(MACHINES.NAME),
                        r.get(PRODUCT_MACHINES.SECONDS_PER_UNIT),
                        r.get(PRODUCT_MACHINES.SECONDS_PER_PACK)));

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
                machinery,
                rec.getPackSize(),
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
                        .fetch(record -> getProduct(record, outerDsl))
        );
    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public Result<Product> createProduct(Product product) {
        return TryUtils.tryCatch(() -> outerDsl.transactionResult(configuration -> {
            DSLContext dsl = configuration.dsl();

            Integer productId = dsl.insertInto(PRODUCTS)
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
                    .set(PRODUCTS.PACK_SIZE, product.packSize())
                    .set(PRODUCTS.ENABLED, product.enabled())
                    .returning(PRODUCTS.ID)
                    .fetchOne(PRODUCTS.ID);

            if (productId == null) {
                throw new DataAccessException("Failed to insert product, no ID returned") {
                };
            }

            List<ProductMachine> machinery = product.machinery();
            if (machinery != null && !machinery.isEmpty()) {
                for (int i = 0; i < machinery.size(); i++) {
                    String machineName = machinery.get(i).name();

                    Integer machineId = dsl.select(MACHINES.ID)
                            .from(MACHINES)
                            .where(MACHINES.NAME.eq(machineName))
                            .fetchOne(MACHINES.ID);

                    if (machineId == null) {
                        machineId = dsl.insertInto(MACHINES)
                                .set(MACHINES.NAME, machineName)
                                .returning(MACHINES.ID)
                                .fetchOne(MACHINES.ID);

                        if (machineId == null) {
                            throw new DataAccessException(
                                    "Failed to insert machine: " + machineName) {
                            };
                        }
                    }

                    dsl.insertInto(PRODUCT_MACHINES)
                            .set(PRODUCT_MACHINES.PRODUCT_ID, productId)
                            .set(PRODUCT_MACHINES.STEP_NUMBER, i + 1)
                            .set(PRODUCT_MACHINES.MACHINE_ID, machineId)
                            .set(PRODUCT_MACHINES.SECONDS_PER_UNIT, machinery.get(i)
                                    .secondsPerUnit())
                            .set(PRODUCT_MACHINES.SECONDS_PER_PACK, machinery.get(i)
                                    .setupPerPack())
                            .execute();
                }
            }

            return new Product(
                    productId,
                    product.name(),
                    product.oldName(),
                    product.width(),
                    product.length(),
                    product.thickness(),
                    product.pitch(),
                    product.edge(),
                    product.finish(),
                    product.profile(),
                    product.material(),
                    product.owner(),
                    product.rackType(),
                    product.machinery(),
                    product.packSize(),
                    product.enabled()
            );
        }));
    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public Result<List<Machine>> getAllMachines() {
        return Result.of(getMachineList());
    }

    @Override
    public Result<List<JobView>> getJobs(Long toNumber, int count) {
        return TryUtils.tryCatch(() ->
                outerDsl.selectFrom(JOB)
                        .where(toNumber != null
                                ? JOB.NUMBER.lt(toNumber)
                                : DSL.noCondition())
                        .orderBy(JOB.NUMBER.desc())
                        .limit(count)
                        .fetch(j -> getJobView(j, outerDsl))
        );
    }

    @Override
    public int getMachine(String role) {
        return getAllMachines().fold(
                l -> l.stream()
                        .filter(m -> m.name().equals(role))
                        .findFirst()
                        .map(Machine::id)
                        .orElse(0),
                _ -> 0
        );
    }

    @Override
    public Result<Wastage> createWastage(int userId, CreateWastage wastage) {
        return TryUtils.tryCatch(() ->
                outerDsl.insertInto(WASTAGE)
                        .set(WASTAGE.QUANTITY, wastage.quantity())
                        .set(WASTAGE.REASON, wastage.reason())
                        .set(WASTAGE.JOB_PHASE_ID, wastage.jobPhaseId())
                        .set(WASTAGE.RPI, wastage.rpi())
                        .set(WASTAGE.REPORTED_BY, userId)
                        .returning(WASTAGE.ID, WASTAGE.CREATED_AT)
                        .fetchSingle()
        ).map(r -> new Wastage(
                r.get(WASTAGE.ID),
                wastage.jobPhaseId(),
                wastage.rpi(),
                wastage.quantity(),
                userId,
                wastage.reason(),
                r.get(WASTAGE.CREATED_AT)
        ));
    }

    @Override
    public Result<List<WastageView>> getWastage(int jobPhaseId) {
        return TryUtils.tryCatch(() ->
                outerDsl
                        .select(WASTAGE.fields())
                        .select(USERS.USERNAME)
                        .from(WASTAGE)
                        .join(USERS).on(USERS.ID.eq(WASTAGE.REPORTED_BY))
                        .where(WASTAGE.JOB_PHASE_ID.eq(jobPhaseId))
                        .fetch(this::getWastage)
        );
    }

    private WastageView getWastage(Record w) {
        return new WastageView(w.get(WASTAGE.RPI), w.get(WASTAGE.QUANTITY), w.get(USERS.USERNAME),
                w.get(WASTAGE.REASON), w.get(WASTAGE.CREATED_AT));
    }

    @Override
    public Result<Boolean> createRpi(JobWithOnePart jobWithOnePart, int rpi) {
        return TryUtils.tryCatch(() ->
                outerDsl.transactionResult(configuration -> {
                    DSLContext dsl = DSL.using(configuration);

                    int jobPartId = jobWithOnePart.part().jobPartId();

                    List<Integer> machineIds = jobWithOnePart
                            .product()
                            .machinery()
                            .stream()
                            .map(ProductMachine::id)
                            .distinct()
                            .toList();

                    var existing = JOB_PART_PARAMS.as("existing");

                    @SuppressWarnings("unchecked")
                    Row1<Integer>[] packRows = Stream.of(rpi, rpi + RPI_LEFT_OFFSET)
                            .map(pack -> row(val(pack, Integer.class)))
                            .toArray(Row1[]::new);

                    Table<Record1<Integer>> packs = values(packRows).as("packs", "pack");

                    Field<Integer> packValue = field(name("packs", "pack"), Integer.class);

                    // Non-machine-specific params
                    dsl.insertInto(JOB_PART_PARAMS,
                                    JOB_PART_PARAMS.JOB_PART_PHASE_ID,
                                    JOB_PART_PARAMS.ORIGINAL_PARAM_ID,
                                    JOB_PART_PARAMS.NAME,
                                    JOB_PART_PARAMS.CONFIG,
                                    JOB_PART_PARAMS.INPUT,
                                    JOB_PART_PARAMS.VALUE,
                                    JOB_PART_PARAMS.STATUS,
                                    JOB_PART_PARAMS.MACHINE_ID,
                                    JOB_PART_PARAMS.PACK,
                                    JOB_PART_PARAMS.ORDER
                            )
                            .select(dsl.select(
                                                    JOB_PART_PHASES.ID,
                                                    PHASE_PARAM.ID,
                                                    PHASE_PARAM.NAME,
                                                    PHASE_PARAM.CONFIG,
                                                    PHASE_PARAM.INPUT,
                                                    inline((String) null),
                                                    inline(ParamStatus.INITIALISED.getCode()),
                                                    inline((Integer) null),
                                                    packValue,
                                                    PHASE_PARAM.ORDER
                                            )
                                            .from(JOB_PART_PHASES)
                                            .join(PHASE).on(PHASE.ID.eq(JOB_PART_PHASES.PHASE_ID))
                                            .join(PHASE_PARAM).on(PHASE_PARAM.PHASE_ID.eq(PHASE.ID))
                                            .join(packs).on(
                                                    packValue.eq(rpi)
                                                            .or(PHASE.USAGE.bitAnd(
                                                                            ProductServiceImpl.USAGE_PER_RPI_LEFT_RIGHT)
                                                                    .gt(0))
                                            ).where(JOB_PART_PHASES.JOB_PART_ID.eq(jobPartId))
                                            .and(PHASE.ENABLED.isTrue())
                                            .and(PHASE.USAGE.bitAnd(ProductServiceImpl.USAGE_PER_RPI).gt(0))
                                            .and(PHASE.USAGE.bitAnd(ProductServiceImpl.USAGE_PER_MACHINE)
                                                    .eq(0))
                                            .andNotExists(
                                                    dsl.selectOne()
                                                            .from(existing)
                                                            .where(existing.JOB_PART_PHASE_ID.eq(
                                                                    JOB_PART_PHASES.ID))
                                                            .and(existing.ORIGINAL_PARAM_ID.eq(
                                                                    PHASE_PARAM.ID))
                                                            .and(existing.PACK.eq(packValue))
                                                            .and(existing.MACHINE_ID.isNull())
                                            )
                            )
                            .execute();

                    // Machine-specific params
                    if (!machineIds.isEmpty()) {
                        @SuppressWarnings("unchecked")
                        Row1<Integer>[] rows = machineIds.stream()
                                .map(id -> row(val(id, Integer.class)))
                                .toArray(Row1[]::new);

                        Table<Record1<Integer>> machines = values(rows).as("m", "machine_id");

                        Field<Integer> machineId = field(name("m", "machine_id"), Integer.class);

                        dsl.insertInto(JOB_PART_PARAMS,
                                        JOB_PART_PARAMS.JOB_PART_PHASE_ID,
                                        JOB_PART_PARAMS.ORIGINAL_PARAM_ID,
                                        JOB_PART_PARAMS.NAME,
                                        JOB_PART_PARAMS.CONFIG,
                                        JOB_PART_PARAMS.INPUT,
                                        JOB_PART_PARAMS.VALUE,
                                        JOB_PART_PARAMS.STATUS,
                                        JOB_PART_PARAMS.MACHINE_ID,
                                        JOB_PART_PARAMS.PACK,
                                        JOB_PART_PARAMS.ORDER
                                )
                                .select(dsl.select(
                                                        JOB_PART_PHASES.ID,
                                                        PHASE_PARAM.ID,
                                                        PHASE_PARAM.NAME,
                                                        PHASE_PARAM.CONFIG,
                                                        PHASE_PARAM.INPUT,
                                                        inline((String) null),
                                                        inline(ParamStatus.INITIALISED.getCode()),
                                                        machineId,
                                                        packValue,
                                                        PHASE_PARAM.ORDER
                                                )
                                                .from(JOB_PART_PHASES)
                                                .join(PHASE).on(PHASE.ID.eq(JOB_PART_PHASES.PHASE_ID))
                                                .join(PHASE_PARAM).on(PHASE_PARAM.PHASE_ID.eq(PHASE.ID))
                                                .join(machines)
                                                .on(condition("{0} = ANY({1})", machineId,
                                                        PHASE.MACHINE_IDS))
                                                .join(packs).on(
                                                        packValue.eq(rpi)
                                                                .or(PHASE.USAGE.bitAnd(
                                                                                ProductServiceImpl.USAGE_PER_RPI_LEFT_RIGHT)
                                                                        .gt(0))
                                                )
                                                .where(JOB_PART_PHASES.JOB_PART_ID.eq(jobPartId))
                                                .and(PHASE.ENABLED.isTrue())
                                                .and(PHASE.USAGE.bitAnd(ProductServiceImpl.USAGE_PER_RPI)
                                                        .gt(0))
                                                .and(PHASE.USAGE.bitAnd(
                                                        ProductServiceImpl.USAGE_PER_MACHINE).gt(0))
                                                .andNotExists(
                                                        dsl.selectOne()
                                                                .from(existing)
                                                                .where(existing.JOB_PART_PHASE_ID.eq(
                                                                        JOB_PART_PHASES.ID))
                                                                .and(existing.ORIGINAL_PARAM_ID.eq(
                                                                        PHASE_PARAM.ID))
                                                                .and(existing.PACK.eq(packValue))
                                                                .and(existing.MACHINE_ID.eq(machineId))
                                                )
                                )
                                .execute();
                    }

                    return true;
                })
        );
    }

    private static JobView getJobView(JobRecord jobRecord, DSLContext dsl) {
        String customer = "(None)";
        if (jobRecord.getCustomerId() != null) {
            var c = getCustomers(dsl).getOrDefault(jobRecord.getCustomerId(), null);
            if (c != null) {
                customer = c.code();
            }
        }
        return new JobView(jobRecord.getId(), jobRecord.getNumber(), jobRecord.getParts(),
                jobRecord.getDue(), customer, jobRecord.getStatus());
    }

    private List<Machine> getMachineList() {
        if (MACHINES_LIST == null) {
            System.out.println("Refreshing machines");
            MACHINES_LIST = outerDsl.selectFrom(MACHINES)
                    .orderBy(MACHINES.ID.asc())
                    .fetch(record -> new Machine(
                            record.get(MACHINES.ID),
                            record.get(MACHINES.NAME),
                            record.get(MACHINES.SETUP_SECONDS)
                    ));

        }
        return MACHINES_LIST;
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
        return TryUtils.tryCatch(() -> {
            var result = outerDsl.transactionResult(configuration -> {
                DSLContext dsl = configuration.dsl();

                int updated = dsl.update(PRODUCTS)
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
                        .set(PRODUCTS.PACK_SIZE, product.packSize())
                        .set(PRODUCTS.ENABLED, product.enabled())
                        .where(PRODUCTS.ID.eq(product.id()))
                        .execute();

                if (updated != 1) {
                    throw new DataAccessException("Failed to update product: " + product.id()) {
                    };
                }

                dsl.deleteFrom(PRODUCT_MACHINES)
                        .where(PRODUCT_MACHINES.PRODUCT_ID.eq(product.id()))
                        .execute();

                List<ProductMachine> machinery = product.machinery();
                if (machinery != null && !machinery.isEmpty()) {
                    for (int i = 0; i < machinery.size(); i++) {
                        ProductMachine machine = machinery.get(i);

                        Integer machineId = dsl.select(MACHINES.ID)
                                .from(MACHINES)
                                .where(MACHINES.NAME.eq(machine.name()))
                                .fetchOne(MACHINES.ID);

                        if (machineId == null) {
                            machineId = dsl.insertInto(MACHINES)
                                    .set(MACHINES.NAME, machine.name())
                                    .returning(MACHINES.ID)
                                    .fetchOne(MACHINES.ID);
                            if (machineId == null) {
                                throw new DataAccessException(
                                        "Failed to insert machine: " + machine.name()) {
                                };
                            }
                        }

                        dsl.insertInto(PRODUCT_MACHINES)
                                .set(PRODUCT_MACHINES.PRODUCT_ID, product.id())
                                .set(PRODUCT_MACHINES.STEP_NUMBER, i + 1)
                                .set(PRODUCT_MACHINES.MACHINE_ID, machineId)
                                .set(PRODUCT_MACHINES.SECONDS_PER_UNIT, machine.secondsPerUnit())
                                .set(PRODUCT_MACHINES.SECONDS_PER_PACK, machine.setupPerPack())
                                .execute();
                    }
                }

                return product;
            });
            MACHINES_LIST = null;
            System.out.println("Clearing machines");
            return result;
        });
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
                        .leftJoin(PHASE_PARAM).on(PHASE_PARAM.PHASE_ID.eq(PHASE.ID))
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
                        .leftJoin(PHASE_PARAM).on(PHASE_PARAM.PHASE_ID.eq(PHASE.ID))
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
                        .fetchOptional(rec -> getProduct(rec, outerDsl))));
    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public OptionalResult<Customer> findCustomer(int customerId) {
        return Result.toOptionalResult(TryUtils.tryCatch(() ->
                outerDsl.selectFrom(CUSTOMER).where(CUSTOMER.ID.eq(customerId))
                        .fetchOptional(DatabaseServiceImpl::getCustomer)));
    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public OptionalResult<Carrier> findCarrier(int carrierId) {
        return Result.toOptionalResult(TryUtils.tryCatch(() ->
                outerDsl.selectFrom(CARRIER).where(CARRIER.ID.eq(carrierId))
                        .fetchOptional(DatabaseServiceImpl::getCarrier)));
    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public OptionalResult<JobWithOnePart> signOff(Map<Integer, String> signOffParams,
            Integer operationId) {
        return TryUtils.tryCatch(() -> outerDsl.transactionResult(configuration -> {
            DSLContext innerDsl = configuration.dsl();
            final OffsetDateTime now = OffsetDateTime.now();

            if (signOffParams == null || signOffParams.isEmpty()) {
                throw new IllegalArgumentException("signOffParams must not be empty");
            }

            List<Integer> paramIds = signOffParams.keySet().stream().toList();

            var rows = innerDsl
                    .select(
                            JOB_PART_PARAMS.ID,
                            JOB_PART_PARAMS.JOB_PART_PHASE_ID,
                            JOB_PART_PHASES.JOB_PART_ID,
                            JOB_PART_PHASES.STATUS,
                            JOB_PART.JOB_ID
                    )
                    .from(JOB_PART_PARAMS)
                    .join(JOB_PART_PHASES)
                    .on(JOB_PART_PHASES.ID.eq(JOB_PART_PARAMS.JOB_PART_PHASE_ID))
                    .join(JOB_PART)
                    .on(JOB_PART.ID.eq(JOB_PART_PHASES.JOB_PART_ID))
                    .where(JOB_PART_PARAMS.ID.in(paramIds))
                    .forUpdate()
                    .fetch();

            if (rows.size() != paramIds.size()) {
                throw new IllegalArgumentException("One or more job_part_params ids do not exist");
            }

            Set<Integer> phaseIds = new HashSet<>(
                    rows.getValues(JOB_PART_PARAMS.JOB_PART_PHASE_ID));
            if (phaseIds.size() != 1) {
                throw new IllegalArgumentException(
                        "All signOffParams keys must belong to the same job_part_phase_id");
            }
            Integer jobPartPhaseId = phaseIds.iterator().next();

            boolean updatedStatus = false;
            if (operationId != null) {
                if (signOffParams.size() > 1) {
                    throw new IllegalArgumentException(
                            "Error? " + operationId);

                }
                var signOffParamId = signOffParams.entrySet().iterator().next().getKey();
                var scheduleDetails = innerDsl.selectFrom(JOB_PART_OPERATION)
                        .where(JOB_PART_OPERATION.ID.eq(operationId)).fetchOne();
                if (scheduleDetails == null) {
                    throw new IllegalArgumentException(
                            "Illegal argument operationId " + operationId);
                }
                if (Objects.equals(scheduleDetails.getStartJobPartParamId(), signOffParamId)) {
                    innerDsl.update(JOB_PART_OPERATION)
                            .set(JOB_PART_OPERATION.STATUS, JobStatus.STARTED.getCode())
                            .set(JOB_PART_OPERATION.ACTUAL_START_AT, now)
                            .where(JOB_PART_OPERATION.ID.eq(operationId)).execute();
                } else if (Objects.equals(scheduleDetails.getFinishJobPartParamId(),
                        signOffParamId)) {
                    innerDsl.update(JOB_PART_OPERATION)
                            .set(JOB_PART_OPERATION.STATUS, JobStatus.COMPLETED.getCode())
                            .set(JOB_PART_OPERATION.ACTUAL_FINISH_AT, now)
                            .where(JOB_PART_OPERATION.ID.eq(operationId)).execute();
                    updatedStatus = innerDsl.update(JOB_PART_PHASES)
                            .set(JOB_PART_PHASES.STATUS, JobStatus.STARTED.getCode())
                            .set(JOB_PART_PHASES.STARTED_AT, now)
                            .where(JOB_PART_PHASES.ID.eq(jobPartPhaseId))
                            .and(JOB_PART_PHASES.STATUS.eq(JobStatus.AWAITING.getCode()))
                            .execute() > 0;
                    var current = JOB_PART_OPERATION.as("current");
                    var next = JOB_PART_OPERATION.as("next");
                    innerDsl.update(next)
                            .set(next.STATUS, JobStatus.MACHINING_STARTABLE.getCode())
                            .from(current)
                            .where(current.ID.eq(operationId))
                            .and(next.JOB_PART_ID.eq(current.JOB_PART_ID))
                            .and(next.STEP_NUMBER.eq(current.STEP_NUMBER.plus(1)))
                            .and(next.STATUS.eq(JobStatus.AWAITING.getCode()))
                            .execute();

                } else if (Objects.equals(scheduleDetails.getFirstOffJobPartParamId(),
                        signOffParamId)) {
                    innerDsl.update(JOB_PART_OPERATION)
                            .set(JOB_PART_OPERATION.FIRST_OFF_AT, now)
                            .where(JOB_PART_OPERATION.ID.eq(operationId)).execute();
                } else {
                    throw new IllegalArgumentException(
                            "Unmatching param Id? " + operationId + "," + signOffParamId);
                }
            }

            if (!updatedStatus && !rows.getFirst().get(JOB_PART_PHASES.STATUS)
                    .equals(JobStatus.STARTED.getCode())) {
                throw new InvalidSignOffException("Phase " + rows.getFirst()
                        .get(JOB_PART_PARAMS.JOB_PART_PHASE_ID) + " is not STARTED ("
                        + rows.getFirst()
                        .get(JOB_PART_PHASES.STATUS) + ")");
            }

            Integer jobPartId = rows.getFirst().get(JOB_PART_PHASES.JOB_PART_ID);

            for (Map.Entry<Integer, String> entry : signOffParams.entrySet()) {
                Integer paramId = entry.getKey();
                String rawValue = entry.getValue();
                String value = normalize(rawValue);

                innerDsl.update(JOB_PART_PARAMS)
                        .set(JOB_PART_PARAMS.VALUE, value)
                        .set(JOB_PART_PARAMS.VALUED_AT, value == null ? null : now)
                        .where(JOB_PART_PARAMS.ID.eq(paramId))
                        .execute();
            }

            int completedStatus = JobStatus.COMPLETED.getCode();

            boolean phaseComplete = !innerDsl.fetchExists(
                    innerDsl.selectOne()
                            .from(JOB_PART_PARAMS)
                            .where(JOB_PART_PARAMS.JOB_PART_PHASE_ID.eq(jobPartPhaseId))
                            .and(
                                    JOB_PART_PARAMS.VALUE.isNull()
                                            .or(DSL.trim(JOB_PART_PARAMS.VALUE).eq(""))
                            )
            );

            if (phaseComplete) {
                innerDsl.update(JOB_PART_PHASES)
                        .set(JOB_PART_PHASES.STATUS, completedStatus)
                        .set(JOB_PART_PHASES.COMPLETED_AT, now)
                        .where(JOB_PART_PHASES.ID.eq(jobPartPhaseId))
                        .execute();
            }

            boolean jobPartComplete = !innerDsl.fetchExists(
                    innerDsl.selectOne()
                            .from(JOB_PART_PHASES)
                            .where(JOB_PART_PHASES.JOB_PART_ID.eq(jobPartId))
                            .and(JOB_PART_PHASES.STATUS.ne(completedStatus))
            );

            if (jobPartComplete) {
                innerDsl.update(JOB_PART)
                        .set(JOB_PART.STATUS, completedStatus)
                        .set(JOB_PART.COMPLETED_AT, now)
                        .where(JOB_PART.ID.eq(jobPartId))
                        .execute();
            }

            Integer jobId = rows.getFirst().get(JOB_PART.JOB_ID);
            boolean jobComplete = !innerDsl.fetchExists(
                    innerDsl.selectOne()
                            .from(JOB_PART)
                            .where(JOB_PART.JOB_ID.eq(jobId))
                            .and(JOB_PART.STATUS.ne(completedStatus))
            );

            if (jobComplete) {
                innerDsl.update(JOB)
                        .set(JOB.STATUS, completedStatus)
                        .set(JOB.COMPLETED_AT, now)
                        .where(JOB.ID.eq(jobId))
                        .execute();
            }

            return new JobWithOnePartSelection(jobId, jobPartId, jobPartPhaseId);
        })).flatMapOptional(
                selection -> getJobWithOnePart(selection.jobId(), selection.jobPartId(),
                        selection.completedPhaseId(), null));
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public Result<List<JobPartParam>> getJobPartParams(Integer paramId) {
        return TryUtils.tryCatch(() -> outerDsl.transactionResult(configuration -> {
            DSLContext dsl = configuration.dsl();

            Integer phaseId = dsl
                    .select(JOB_PART_PARAMS.JOB_PART_PHASE_ID)
                    .from(JOB_PART_PARAMS)
                    .where(JOB_PART_PARAMS.ID.eq(paramId))
                    .fetchOne(JOB_PART_PARAMS.JOB_PART_PHASE_ID);

            if (phaseId == null) {
                throw new IllegalArgumentException("No job_part_params found for id " + paramId);
            }

            return dsl
                    .selectFrom(JOB_PART_PARAMS)
                    .where(JOB_PART_PARAMS.JOB_PART_PHASE_ID.eq(phaseId))
                    .orderBy(JOB_PART_PARAMS.ORDER.asc(), JOB_PART_PARAMS.ID.asc())
                    .fetch(DatabaseServiceImpl::getJobPartParam);
        }));
    }

    @Override
    public Result<Customer> updateCustomer(Customer customer) {
        CUSTOMERS_MAP = null;
        return TryUtils.tryCatch(() -> outerDsl.update(CUSTOMER)
                .set(CUSTOMER.CODE, customer.code())
                .set(CUSTOMER.NAME, customer.name())
                .set(CUSTOMER.ZONE, customer.zone())
                .set(CUSTOMER.CONTACT, customer.contact())
                .set(CUSTOMER.CONTACT_NUMBER, customer.contactNumber())
                .set(CUSTOMER.PROFORMA, customer.proforma())
                .where(CUSTOMER.ID.eq(customer.id()))
                .execute()).map(_ -> customer);
    }

    private static JobPartParam getJobPartParam(JobPartParamsRecord jobPartParamsRecord) {
        return new JobPartParam(jobPartParamsRecord.getId(), 0, jobPartParamsRecord.getInput(),
                jobPartParamsRecord.getJobPartPhaseId(), jobPartParamsRecord.getJobPartPhaseId(),
                jobPartParamsRecord.getPack(),
                jobPartParamsRecord.getName(), jobPartParamsRecord.getValue(),
                jobPartParamsRecord.getValuedAt(), jobPartParamsRecord.getConfig(),
                jobPartParamsRecord.getStatus(), jobPartParamsRecord.getMachineId());
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
    public Result<List<PhaseParam>> getPhaseParamsForResolving(int phaseId, String phaseName) {
        return TryUtils.tryCatch(() -> {
            var phaseParams = outerDsl.selectFrom(PHASE_PARAM)
                    .where(PHASE_PARAM.PHASE_ID.eq(phaseId))
                    .orderBy(PHASE_PARAM.ORDER).fetch(r -> getPhaseParam(phaseName, r));
            if (phaseParams.isEmpty()) {
                return List.of(new PhaseParam(phaseId, phaseName, null, null, null, null, 1,
                        null));
            }
            return phaseParams;
        });

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
                        int index = i + 1;
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
                getCustomers(outerDsl).values().stream().toList());

    }

    private static LinkedHashMap<Integer, Customer> getCustomers(DSLContext dsl) {
        if (CUSTOMERS_MAP == null) {
            CUSTOMERS_MAP = dsl.selectFrom(CUSTOMER)
                    .orderBy(CUSTOMER.NAME.asc())
                    .fetch(DatabaseServiceImpl::getCustomer).stream().collect(Collectors.toMap(
                            Customer::id,
                            Function.identity(),
                            (a, _) -> a,
                            LinkedHashMap::new
                    ));
        }
        return CUSTOMERS_MAP;
    }

    private static Customer getCustomer(CustomerRecord customerRecord) {
        return new Customer(customerRecord.getId(),
                customerRecord.getCode(),
                customerRecord.getName(),
                customerRecord.getZone(),
                customerRecord.getContact(),
                customerRecord.getContactNumber(),
                customerRecord.getProforma(),
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
    public Result<Customer> createCustomer(Customer customer) {
        CUSTOMERS_MAP = null;
        return TryUtils.tryCatch(() -> outerDsl.insertInto(CUSTOMER)
                        .set(CUSTOMER.CODE, customer.code())
                        .set(CUSTOMER.NAME, customer.name())
                        .set(CUSTOMER.ZONE, customer.zone())
                        .set(CUSTOMER.CONTACT, customer.contact())
                        .set(CUSTOMER.CONTACT_NUMBER, customer.contactNumber())
                        .set(CUSTOMER.PROFORMA, customer.proforma())
                        .returning(CUSTOMER.ID)
                        .fetchOne(CUSTOMER.ID))
                .map(id -> new Customer(id, customer.code(), customer.name(), customer.zone(),
                        customer.contact(),
                        customer.contactNumber(), customer.proforma(), true));

    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public Result<Carrier> createCarrier(CreateCarrier carrier) {
        return TryUtils.tryCatch(() -> outerDsl.insertInto(CARRIER)
                        .set(CARRIER.CODE, carrier.code())
                        .set(CARRIER.NAME, carrier.name())
                        .set(CARRIER.CONTACT_NAME, carrier.contactName())
                        .set(CARRIER.CONTACT_NUMBER, carrier.contactNumber())
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
                            .set(JOB.PAYMENT_CONFIRMED, job.paymentConfirmed())
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
                                            now).values());
                            phaseNo++;
                        }
                        partNo++;
                        jobParts.add(
                                new JobPart(partId, part.productId(), "()", "()", part.quantity(),
                                        part.fromCallOff(), part.materialAvailable(),
                                        jobPartPhases,
                                        partParams,
                                        partStatus, partNo));
                    }
                    return new Job(jobId, jobNumber, job.due(), job.customer(), job.carrier(),
                            job.callOff(), jobParts, jobStatus, job.paymentConfirmed());
                }));
    }

    private List<Integer> getMachineIdsForPhase(CreateJobPart part, PhaseRecord originalPhase) {
        List<Integer> machines = new ArrayList<>();
        if ((originalPhase.getUsage() & ProductServiceImpl.USAGE_PER_MACHINE)
                > 0) {
            machines = findProduct(part.productId()).fold(
                    p -> {
                        if (originalPhase.getMachineIds().length == 0) {
                            var m = new ArrayList<Integer>();
                            m.add(null);
                            return m;
                        }
                        return p.machinery().stream().map(ProductMachine::id)
                                .filter(id -> Arrays.asList(
                                                originalPhase.getMachineIds())
                                        .contains(id)).toList();
                    },
                    _ -> Collections.emptyList(),
                    Collections::emptyList);
        } else {
            machines.add(null);
        }
        return machines;
    }

    private Map<UUID, JobPartParam> addParams(DSLContext innerDsl, int phaseId, int jobPartPhaseId,
            int phaseNo,
            List<CreateJobPartParam> params,
            OffsetDateTime now) {
        Map<UUID, JobPartParam> partParams = new LinkedHashMap<>();
        for (CreateJobPartParam param : params) {
            // This check is here because in create we pass in a list of cross phase params.
            // For scheduling this should always be true.
            if (param.phaseNumber() == phaseNo) {

                String config;
                String name;
                int order;
                int input;
                if (param.paramId() == GENERATED_PARAM_ID) {
                    config = param.config();
                    name = param.name();
                    order = param.orderOffset();
                    input = ConfigurationServiceImpl.INPUT_PHASE_RUN;
                } else {
                    var paramData = innerDsl.selectFrom(PHASE_PARAM)
                            .where(PHASE_PARAM.ID.eq(param.paramId())).fetchOne();
                    if (paramData == null) {
                        throw new DataAccessException(
                                "Failed to find Param, for id " + param.paramId()) {
                        };
                    }
                    config = param.config() == null ? paramData.getConfig() : param.config();
                    name = paramData.getName();
                    order = paramData.getOrder() + param.orderOffset();
                    input = paramData.getInput();
                }

                OffsetDateTime valueTime = param.value() == null ? null : now;
                int partPhaseId = param.jobPartPhaseId() == 0 ? jobPartPhaseId
                        : param.jobPartPhaseId();
                Integer paramId = innerDsl.insertInto(JOB_PART_PARAMS)
                        .set(JOB_PART_PARAMS.JOB_PART_PHASE_ID, partPhaseId
                        )
                        .set(JOB_PART_PARAMS.NAME, name)
                        .set(JOB_PART_PARAMS.ORIGINAL_PARAM_ID, param.paramId())
                        .set(JOB_PART_PARAMS.INPUT, input)
                        .set(JOB_PART_PARAMS.CONFIG, config)
                        .set(JOB_PART_PARAMS.MACHINE_ID, param.machineId())
                        .set(JOB_PART_PARAMS.ORDER, order)
                        .set(JOB_PART_PARAMS.VALUE, param.value())
                        .set(JOB_PART_PARAMS.VALUED_AT, valueTime)
                        .set(JOB_PART_PARAMS.STATUS, ParamStatus.INITIALISED.getCode())
                        .returning(JOB_PART_PARAMS.ID)
                        .fetchOne(JOB_PART_PARAMS.ID);
                if (paramId == null) {
                    throw new DataAccessException(
                            "Failed to insert Job Part Param, no ID returned") {
                    };
                }
                partParams.put(param.tempKey(),
                        new JobPartParam(paramId,
                                param.phaseNumber(), input,
                                phaseId,
                                partPhaseId, 1, name,
                                param.value(), valueTime, config,
                                ParamStatus.INITIALISED.getCode(), param.machineId()));

            }
        }

        return partParams;
    }

    private static CreateJobPartParam getCreateJobPartParam(Record phaseParamRecord,
            int phaseNumber, ConfigValuePair configAndValue) {
        return new CreateJobPartParam(phaseParamRecord.get(PHASE_PARAM.ID), phaseNumber,
                configAndValue.config() == null ? phaseParamRecord.get(PHASE_PARAM.CONFIG)
                        : configAndValue.config(), configAndValue.value(),
                phaseParamRecord.get(JOB_PART_PHASES.ID), UUID.randomUUID(), 0, null, null);
    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public Result<List<SchedulableJobPart>> getUnscheduled() {
        return TryUtils.tryCatch(() -> {
            System.out.println("IN:" + System.currentTimeMillis());
            var x = getSchedulableQuery()
                    .where(JOB_PART.STATUS.eq(JobStatus.SAVED.getCode()))
                    .fetch(r -> getSchedulableJobPart(r, outerDsl)).stream()
                    .flatMap(List::stream).toList();
            System.out.println("OUT:" + System.currentTimeMillis());
            return x;
        });
    }

    private static List<SchedulableJobPart> getSchedulableJobPart(Record jobPartRecord,
            DSLContext innerDsl) {

        List<ProductMachinesRecord> machines = innerDsl.selectFrom(PRODUCT_MACHINES)
                .where(PRODUCT_MACHINES.PRODUCT_ID.eq(
                        jobPartRecord.get(PRODUCT_MACHINES.PRODUCT_ID)))
                .orderBy(PRODUCT_MACHINES.STEP_NUMBER.asc())
                .fetch();

        return IntStream.range(0, machines.size())
                .mapToObj(index -> new SchedulableJobPart(
                        jobPartRecord.get(JOB_PART.ID),
                        jobPartRecord.get(JOB.ID),
                        jobPartRecord.get(JOB.NUMBER),
                        jobPartRecord.get(PRODUCTS.NAME),
                        jobPartRecord.get(PRODUCTS.OLD_NAME),
                        machines.get(index).getMachineId(),
                        jobPartRecord.get(JOB_PART.QUANTITY),
                        index + 1,
                        jobPartRecord.get(PRODUCTS.LENGTH),
                        jobPartRecord.get(PRODUCTS.WIDTH),
                        jobPartRecord.get(PRODUCTS.THICKNESS),
                        jobPartRecord.get(JOB_PART.STATUS),
                        jobPartRecord.get(JOB.STATUS),
                        jobPartRecord.get(JOB_PART.PART_NUMBER),
                        jobPartRecord.get(JOB.PARTS),
                        jobPartRecord.get(JOB.DUE),
                        machines.get(index).getSecondsPerUnit() * jobPartRecord.get(
                                JOB_PART.QUANTITY),
                        machines.get(index).getSecondsPerPack() * (jobPartRecord.get(
                                JOB_PART.QUANTITY)
                                / jobPartRecord.get(PRODUCTS.PACK_SIZE) + 1),
                        machines.size(),
                        jobPartRecord.get(JOB_PART.PRODUCT_ID)
                )).toList();
    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public Result<List<SchedulableJobPart>> getSchedulable() {
        return TryUtils.tryCatch(() -> {
                    System.out.println("IN:" + System.currentTimeMillis());
                    var x = getSchedulableQuery()
                            .where(JOB_PART.STATUS.in(
                                    JobStatus.SCHEDULABLE.getCode()
                            ))
                            .orderBy(JOB.DUE.asc())
                            .fetch(r -> getSchedulableJobPart(r, outerDsl)).stream()
                            .flatMap(List::stream).toList();
                    System.out.println("OUT:" + System.currentTimeMillis());
                    return x;
                }
        );
    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public Result<ScheduleForRole> getScheduleForRole(LocalDate from,
            LocalDate to) {
        return TryUtils.tryCatch(() -> {
            Condition condition = DSL.trueCondition();
            if (from != null) {
                condition = condition.and(JOB_PART_OPERATION.SCHEDULED_FOR_DATE.ge(from));
            }
            if (to != null) {
                condition = condition.and(JOB_PART_OPERATION.SCHEDULED_FOR_DATE.le(to));
            }

            Map<Integer, ScheduleSummary> summary =
                    outerDsl.select(
                                    JOB_PART_OPERATION.JOB_PART_ID,
                                    min(JOB_PART_OPERATION.PLANNED_START_AT),
                                    max(JOB_PART_OPERATION.PLANNED_FINISH_AT)
                            )
                            .from(JOB_PART_OPERATION)
                            .where(condition)
                            .groupBy(JOB_PART_OPERATION.JOB_PART_ID)
                            .fetchMap(
                                    JOB_PART_OPERATION.JOB_PART_ID,
                                    r -> new ScheduleSummary(
                                            r.value2(),
                                            r.value3()
                                    )
                            );

            var paramList = outerDsl.select(
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
                    .and(JOB_PART.ID.in(summary.keySet()))
                    .orderBy(
                            JOB_PART_PHASES.PHASE_NUMBER,
                            JOB_PART_PARAMS.ORDER.nullsLast(),
                            JOB_PART_PARAMS.ID
                    )
                    .fetch(DatabaseServiceImpl::getScheduledJobPartParam);
            return new ScheduleForRole(paramList, summary);
        });
    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public Result<List<ScheduledJobPartView>> getScheduleForMachine(int machineId,
            LocalDate fromDate,
            LocalDate toDate) {
        return TryUtils.tryCatch(() -> {
            System.out.println("IN:" + System.currentTimeMillis());
            LocalDate effectiveFromDate = fromDate != null
                    ? fromDate
                    : toDate.minusDays(3);

            Condition condition = JOB_PART_OPERATION.MACHINE_ID.eq(machineId)
                    .and(JOB_PART_OPERATION.SCHEDULED_FOR_DATE.between(effectiveFromDate, toDate));
            if (fromDate == null) {
                condition = condition.and(
                        JOB_PART_OPERATION.STATUS.in(JobStatus.SCHEDULED.getCode(),
                                JobStatus.STARTED.getCode()));
            }

            var x = outerDsl
                    .select(
                            JOB.ID,
                            JOB.DUE,
                            JOB.NUMBER,
                            JOB_PART.PART_NUMBER,
                            JOB.PARTS,
                            PRODUCTS.NAME,
                            JOB.CUSTOMER_ID,
                            JOB_PART_OPERATION.QUANTITY,
                            PRODUCTS.PROFILE,
                            PRODUCTS.LENGTH,
                            PRODUCTS.WIDTH,
                            PRODUCTS.THICKNESS,
                            PRODUCTS.MATERIAL,
                            PRODUCTS.PITCH,
                            PRODUCTS.EDGE,
                            PRODUCTS.FINISH,
                            JOB_PART_OPERATION.ID,
                            JOB_PART_OPERATION.JOB_PART_ID,
                            JOB_PART_OPERATION.PLANNED_START_AT,
                            JOB_PART_OPERATION.PLANNED_FINISH_AT,
                            JOB_PART_OPERATION.PLANNED_MINUTES,
                            JOB_PART_OPERATION.SETUP_MINUTES,
                            JOB_PART_OPERATION.BREAK_MINUTES,
                            JOB_PART_OPERATION.PACK_MINUTES,
                            JOB_PART_OPERATION.ACTUAL_START_AT,
                            JOB_PART_OPERATION.ACTUAL_FINISH_AT,
                            JOB_PART_OPERATION.FIRST_OFF_AT,
                            JOB_PART_OPERATION.STEP_NUMBER,
                            JOB_PART_OPERATION.STATUS,
                            JOB_PART_OPERATION.START_JOB_PART_PARAM_ID,
                            JOB_PART_OPERATION.FIRST_OFF_JOB_PART_PARAM_ID,
                            JOB_PART_OPERATION.FINISH_JOB_PART_PARAM_ID
                    )
                    .from(JOB_PART_OPERATION)
                    .join(JOB_PART)
                    .on(JOB_PART_OPERATION.JOB_PART_ID.eq(JOB_PART.ID))
                    .join(JOB)
                    .on(JOB_PART.JOB_ID.eq(JOB.ID))
                    .join(PRODUCTS)
                    .on(JOB_PART.PRODUCT_ID.eq(PRODUCTS.ID))
                    .where(condition)
                    .orderBy(
                            JOB_PART_OPERATION.SCHEDULED_FOR_DATE.asc(),
                            JOB_PART_OPERATION.MACHINE_QUEUE_POSITION.asc(),
                            JOB.DUE.asc()
                    )
                    .fetch(DatabaseServiceImpl::getScheduledJobPartView);
            System.out.println("OUT:" + System.currentTimeMillis());
            return x;
        });
    }

    private static ScheduledJobPartView getScheduledJobPartView(
            Record rec) {
        return new ScheduledJobPartView(
                rec.get(JOB_PART_OPERATION.ID),
                rec.get(JOB.DUE), rec.get(JOB.NUMBER),
                rec.get(JOB_PART.PART_NUMBER),
                rec.get(JOB.PARTS),
                rec.get(PRODUCTS.NAME),
                rec.get(JOB.CUSTOMER_ID),
                rec.get(JOB_PART_OPERATION.QUANTITY),
                rec.get(PRODUCTS.PROFILE),
                rec.get(PRODUCTS.LENGTH),
                rec.get(PRODUCTS.WIDTH),
                rec.get(PRODUCTS.THICKNESS),
                rec.get(PRODUCTS.MATERIAL),
                rec.get(PRODUCTS.PITCH),
                rec.get(PRODUCTS.EDGE),
                rec.get(PRODUCTS.FINISH),
                rec.get(JOB_PART_OPERATION.PLANNED_START_AT),
                rec.get(JOB_PART_OPERATION.PLANNED_FINISH_AT),
                rec.get(JOB_PART_OPERATION.ACTUAL_START_AT),
                rec.get(JOB_PART_OPERATION.ACTUAL_FINISH_AT),
                rec.get(JOB_PART_OPERATION.PLANNED_MINUTES),
                rec.get(JOB_PART_OPERATION.SETUP_MINUTES),
                rec.get(JOB_PART_OPERATION.BREAK_MINUTES),
                rec.get(JOB_PART_OPERATION.PACK_MINUTES),
                rec.get(JOB_PART_OPERATION.STATUS),
                rec.get(JOB_PART_OPERATION.START_JOB_PART_PARAM_ID),
                rec.get(JOB_PART_OPERATION.FIRST_OFF_JOB_PART_PARAM_ID),
                rec.get(JOB_PART_OPERATION.FINISH_JOB_PART_PARAM_ID),
                rec.get(JOB.ID),
                rec.get(JOB_PART_OPERATION.JOB_PART_ID),
                rec.get(JOB_PART_OPERATION.STEP_NUMBER),
                rec.get(JOB_PART_OPERATION.FIRST_OFF_AT)
        );
    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public OptionalResult<JobWithOnePart> completePhasesAndStart(
            List<Integer> phasesToMarkDone,
            int jobId, int jobPartPhaseId, Integer lastJobPhaseUpdated, Integer activePhaseId) {

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
                                boolean lastPhaseMachine = isMachinePhase(lastJobPhaseUpdated, innerDsl);
                                boolean nextPhaseMachine = isMachinePhase(jobPartPhaseId, innerDsl);
                                if (!lastPhaseMachine && nextPhaseMachine) {
                                    innerDsl
                                            .update(JOB_PART_OPERATION)
                                            .set(JOB_PART_OPERATION.STATUS,
                                                    JobStatus.MACHINING_STARTABLE.getCode())
                                            .where(JOB_PART_OPERATION.JOB_PART_ID.eq(jobPartId))
                                            .and(JOB_PART_OPERATION.MACHINE_QUEUE_POSITION.eq(
                                                    DSL.select(
                                                                    DSL.min(JOB_PART_OPERATION.MACHINE_QUEUE_POSITION))
                                                            .from(JOB_PART_OPERATION)
                                                            .where(JOB_PART_OPERATION.JOB_PART_ID.eq(
                                                                    jobPartId))
                                            ))
                                            .execute();
                                }
                                if (lastPhaseMachine && !nextPhaseMachine) {

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

                                return Optional.of(
                                        new JobWithOnePartSelection(jobId, jobPartId, null));
                            }

                            return Optional.empty();
                        })))
                .flatMap(selected -> getJobWithOnePart(selected.jobId(), selected.jobPartId(),
                        lastJobPhaseUpdated, activePhaseId));
    }

    private static boolean isMachinePhase(Integer lastJobPhaseUpdated, DSLContext dsl) {
        if (lastJobPhaseUpdated == null) {
            return false;
        }
        Integer phaseUsage = dsl.select(PHASE.USAGE).from(PHASE).join(JOB_PART_PHASES)
                .on(PHASE.ID.eq(JOB_PART_PHASES.PHASE_ID))
                .where(JOB_PART_PHASES.ID.eq(lastJobPhaseUpdated)).fetchOne(PHASE.USAGE);

        return (phaseUsage != null) && (phaseUsage & ProductServiceImpl.USAGE_PER_MACHINE) > 0;
    }

    @Override
    public OptionalResult<JobWithOnePart> getJobWithOnePart(int jobId, int jobPartId,
            Integer completedPhase, Integer activePhaseId) {
        return findJob(jobId, jobPartId).fold(j -> {
                    if (j.parts().size() != 1) {
                        return OptionalResult.failure(new InvalidJobException(jobId,
                                "Unexpected number of parts for one job part" + jobPartId));
                    }
                    var part = j.parts().getFirst();
                    return OptionalResult.combine(findProduct(part.productId()),
                            findCustomer(j.customer()), findCarrier(j.carrier()),
                            (product, customer, carrier) -> new JobWithOnePart(
                                    j.id(),
                                    j.number(),
                                    j.due(),
                                    j.callOff(),
                                    part,
                                    j.status(),
                                    j.paymentConfirmed(), part.partNumber(), j.parts().size(),
                                    product, customer, carrier, completedPhase, activePhaseId
                            )).toOptional();
                },
                OptionalResult::failure,
                OptionalResult::empty
        );
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
    public Result<Boolean> createSchedule(List<CreateScheduledJobPart> jobPartIds,
            Function<PhaseParamEvaluatorInput, ConfigValuePair> paramConfigEvaluator) {
        if (jobPartIds == null || jobPartIds.isEmpty()) {
            return Result.of(false);
        }

        return TryUtils.tryCatch(() -> outerDsl.transactionResult(configuration -> {
            DSLContext innerDsl = configuration.dsl();
            OffsetDateTime now = OffsetDateTime.now();
            int position = 100;
            Set<Integer> updatedJobs = new HashSet<>();
            Map<Integer, List<PhaseData>> jobPartPhases = new HashMap<>();
            Map<Integer, OptionalResult<Product>> products = new HashMap<>();

            for (CreateScheduledJobPart jobPart : jobPartIds) {
                MachinePhaseSignoffParams signOffParams = new MachinePhaseSignoffParams();
                var product = products.computeIfAbsent(jobPart.productId(), this::findProduct);
                if (product.isFaulted()) {
                    throw new DataAccessException(
                            "Failed to find product " + jobPart.productId() + ", for part "
                                    + jobPart.jobPartId()) {
                    };
                }
                Map<UUID, JobPartParam> newParams = new HashMap<>();
                List<PhaseData> phases = jobPartPhases.computeIfAbsent(jobPart.jobPartId(),
                        _ -> innerDsl
                                .select()
                                .from(JOB_PART_PHASES)
                                .join(PHASE)
                                .on(JOB_PART_PHASES.PHASE_ID.eq(PHASE.ID))
                                .where(JOB_PART_PHASES.JOB_PART_ID.eq(jobPart.jobPartId()))
                                .fetch(r -> new PhaseData(r, new AtomicInteger(-1))));

                for (var phase : phases) {
                    int usage = phase.phase.get(PHASE.USAGE);
                    if ((usage & ProductServiceImpl.USAGE_PER_RPI) > 0) {
                        continue;
                    }
                    var machineIds = phase.phase.get(PHASE.MACHINE_IDS);

                    List<CreateJobPartParam> phaseRunData = new ArrayList<>();
                    if (phase.paramCount.get() == -1) {
                        var params = innerDsl.select(
                                        PHASE_PARAM.fields())
                                .select(JOB_PART_PHASES.ID)
                                .from(PHASE_PARAM)
                                .join(JOB_PART_PHASES)
                                .on(JOB_PART_PHASES.PHASE_ID.eq(PHASE_PARAM.PHASE_ID))
                                .and(JOB_PART_PHASES.JOB_PART_ID.eq(jobPart.jobPartId()))
                                .and(JOB_PART_PHASES.PHASE_ID.eq(
                                        phase.phase.get(JOB_PART_PHASES.PHASE_ID)))
                                .where(PHASE_PARAM.PHASE_ID.eq(
                                        phase.phase.get(JOB_PART_PHASES.PHASE_ID)))
                                .and(PHASE_PARAM.INPUT.in(
                                        ConfigurationServiceImpl.INPUT_PHASE_RUN))
                                .orderBy(PHASE_PARAM.ORDER.asc())
                                .fetch(r -> getCreateJobPartParam(r,
                                        phase.phase.get(JOB_PART_PHASES.PHASE_NUMBER),
                                        paramConfigEvaluator.apply(
                                                new PhaseParamEvaluatorInput(
                                                        product,
                                                        r.get(PHASE_PARAM.CONFIG),
                                                        r.get(PHASE_PARAM.INPUT)))));
                        phase.paramCount.compareAndSet(-1, params.size());
                        phaseRunData.addAll(params);
                    }

                    boolean scheduled =
                            (phase.paramCount.get() == 0)
                                    && (usage & ProductServiceImpl.USAGE_PER_MACHINE) != 0
                                    && (machineIds.length == 0
                                    || Arrays.stream(machineIds)
                                    .anyMatch(m -> m.equals(jobPart.machineId())));

                    if (scheduled) {
                        product.map(p -> {
                            for (int i = 0; i < p.machinery().size(); i++) {
                                ProductMachine machine = p.machinery().get(i);
                                if (jobPart.machineId() == machine.id()) {
                                    var param = new CreateJobPartParam(GENERATED_PARAM_ID,
                                            phase.phase.get(JOB_PART_PHASES.PHASE_NUMBER),
                                            "AWAIT(" + machine.name() + ")", null,
                                            phase.phase.get(JOB_PART_PHASES.ID), UUID.randomUUID(),
                                            100 + i, machine.id(), "Machine");
                                    phaseRunData.add(param);
                                    signOffParams.addParam(param);
                                }
                            }
                            return phaseRunData;
                        });
                    }
                    newParams.putAll(
                            addParams(innerDsl, phase.phase.get(JOB_PART_PHASES.PHASE_ID), 0,
                                    phase.phase.get(JOB_PART_PHASES.PHASE_NUMBER),
                                    phaseRunData, now));

                }
                updatedJobs.add(jobPart.jobId());
                position += 100;

                innerDsl.update(JOB_PART)
                        .set(JOB_PART.STATUS, JobStatus.SCHEDULED.getCode())
                        .where(JOB_PART.ID.eq(jobPart.jobPartId()))
                        .execute();

                if (signOffParams.isSignOffRequired()) {
                    createScheduleItem(jobPart, innerDsl, position, signOffParams, newParams);
                }
            }

            for (Integer jobId : updatedJobs) {
                updateJobStatus(jobId, innerDsl);
            }

            return true;
        }));
    }

    private static void updateJobStatus(Integer jobId, DSLContext innerDsl) {
        Record2<Integer, Integer> counts = innerDsl
                .select(
                        DSL.count(),
                        DSL.count().filterWhere(
                                JOB_PART.STATUS.eq(JobStatus.SCHEDULED.getCode())
                        )
                )
                .from(JOB_PART)
                .where(JOB_PART.JOB_ID.eq(jobId))
                .fetchOne();

        if (counts == null) {
            throw new DataAccessException(
                    "Failed to count job part statuses ") {
            };
        }

        int totalParts = counts.value1();
        int scheduledParts = counts.value2();

        Integer newStatus =
                scheduledParts == totalParts
                        ? JobStatus.SCHEDULED.getCode()
                        : scheduledParts > 0
                                ? JobStatus.PARTIALLY_SCHEDULED.getCode()
                                : JobStatus.SCHEDULABLE.getCode();

        innerDsl.update(JOB)
                .set(JOB.STATUS, newStatus)
                .where(JOB.ID.eq(jobId))
                .execute();
    }

    private static void createScheduleItem(CreateScheduledJobPart jobPart, DSLContext innerDsl,
            int position,
            MachinePhaseSignoffParams signOffParams, Map<UUID, JobPartParam> newParams) {
        innerDsl.insertInto(JOB_PART_OPERATION)
                .set(JOB_PART_OPERATION.JOB_PART_ID, jobPart.jobPartId())
                .set(JOB_PART_OPERATION.MACHINE_ID, jobPart.machineId())
                .set(JOB_PART_OPERATION.STEP_NUMBER, jobPart.stepNumber())
                .set(JOB_PART_OPERATION.QUANTITY, jobPart.quantity())
                .set(JOB_PART_OPERATION.PLANNED_START_AT, jobPart.plannedStartAt())
                .set(JOB_PART_OPERATION.PLANNED_FINISH_AT,
                        jobPart.plannedFinishAt())
                .set(JOB_PART_OPERATION.SETUP_MINUTES, jobPart.setupMinutes())
                .set(JOB_PART_OPERATION.PLANNED_MINUTES, jobPart.plannedMinutes())
                .set(JOB_PART_OPERATION.BREAK_MINUTES, jobPart.breakMinutes())
                .set(JOB_PART_OPERATION.PACK_MINUTES, jobPart.packMinutes())
                .set(JOB_PART_OPERATION.SCHEDULED_FOR_DATE, jobPart.scheduledDate())
                .set(JOB_PART_OPERATION.MACHINE_QUEUE_POSITION, position)
                .set(JOB_PART_OPERATION.STATUS, JobStatus.AWAITING.getCode())
                .set(JOB_PART_OPERATION.START_JOB_PART_PARAM_ID,
                        signOffParams.getStartSignOffParam(newParams))
                .set(JOB_PART_OPERATION.FIRST_OFF_JOB_PART_PARAM_ID,
                        signOffParams.getFirstOffSignOffParam(newParams))
                .set(JOB_PART_OPERATION.FINISH_JOB_PART_PARAM_ID,
                        signOffParams.getFinishSignOffParam(newParams))
                .execute();
    }

    @Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 5,
            backoff = @Backoff(delay = 500, multiplier = 2.0))
    @Override
    public OptionalResult<Job> findJob(int jobId) {
        return findJob(jobId, null);
    }

    public OptionalResult<Job> findJob(int jobId, Integer jobPartId) {
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

                    var query = innerDsl.selectFrom(JOB_PART)
                            .where(JOB_PART.JOB_ID.eq(jobId));

                    if (jobPartId != null) {
                        query = query.and(JOB_PART.ID.eq(jobPartId));
                    }

                    var partRecords = query
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
                            jobRecord.getPaymentConfirmed()
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
                            JOB_PART_PARAMS.CONFIG,
                            JOB_PART_PARAMS.PACK,
                            JOB_PART_PARAMS.MACHINE_ID,
                            JOB_PART_PARAMS.VALUED_AT,
                            JOB_PART_PARAMS.STATUS)
                    .from(JOB_PART_PARAMS)
                    .join(JOB_PART_PHASES)
                    .on(JOB_PART_PARAMS.JOB_PART_PHASE_ID.eq(JOB_PART_PHASES.ID))
                    .where(JOB_PART_PARAMS.JOB_PART_PHASE_ID.eq(partPhaseId))
                    .orderBy(JOB_PART_PHASES.PHASE_ID.asc(), JOB_PART_PARAMS.ORDER.asc())
                    .fetch();

            for (var record : records) {
                partParams.add(new JobPartParam(
                        record.get(JOB_PART_PARAMS.ID),
                        phaseNumber,
                        record.get(JOB_PART_PARAMS.INPUT),
                        record.get(JOB_PART_PHASES.PHASE_ID),
                        partPhaseId,
                        record.get(JOB_PART_PARAMS.PACK),
                        record.get(JOB_PART_PARAMS.NAME),
                        record.get(JOB_PART_PARAMS.VALUE),
                        record.get(JOB_PART_PARAMS.VALUED_AT),
                        record.get(JOB_PART_PARAMS.CONFIG),
                        record.get(JOB_PART_PARAMS.STATUS),
                        record.get(JOB_PART_PARAMS.MACHINE_ID)
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
                jobPartPhases,
                partParams,
                partRecord.getStatus(),
                partRecord.getPartNumber()
        );
    }

    @Nonnull
    private SelectOnConditionStep<Record> getSchedulableQuery() {
        return outerDsl.select(JOB_PART.fields())
                .select(JOB.ID, JOB.NUMBER, JOB.STATUS, JOB.PARTS, JOB.DUE)
                .select(PRODUCTS.NAME, PRODUCTS.OLD_NAME, PRODUCTS.LENGTH, PRODUCTS.WIDTH,
                        PRODUCTS.THICKNESS, PRODUCTS.PACK_SIZE)
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

