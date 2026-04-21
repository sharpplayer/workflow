package uk.co.matchboard.app.service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map.Entry;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import uk.co.matchboard.app.exception.InvalidCustomerException;
import uk.co.matchboard.app.exception.InvalidJobException;
import uk.co.matchboard.app.exception.InvalidSignOffException;
import uk.co.matchboard.app.functional.OptionalResult;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.config.ConfigResponse;
import uk.co.matchboard.app.model.config.ConfigValuePair;
import uk.co.matchboard.app.model.config.Customer;
import uk.co.matchboard.app.model.config.KeyValuePair;
import uk.co.matchboard.app.model.job.CreateJob;
import uk.co.matchboard.app.model.job.CreateJobPart;
import uk.co.matchboard.app.model.job.CreateSchedule;
import uk.co.matchboard.app.model.job.Job;
import uk.co.matchboard.app.model.job.JobPartParam;
import uk.co.matchboard.app.model.job.JobStatus;
import uk.co.matchboard.app.model.job.JobViews;
import uk.co.matchboard.app.model.job.JobWithOnePart;
import uk.co.matchboard.app.model.job.SchedulableJobParts;
import uk.co.matchboard.app.model.job.ScheduledJobPartParam;
import uk.co.matchboard.app.model.job.ScheduledJobPhase;
import uk.co.matchboard.app.model.job.ScheduledJobPhases;
import uk.co.matchboard.app.model.product.PhaseParamEvaluatorInput;
import uk.co.matchboard.app.model.product.PhaseSignOff;

@Service
public class JobServiceImpl implements JobService {

    public enum RoleMatch {
        NOT_THIS_ROLE,
        YES,
        NONE
    }

    private record PartPhaseKey(int partNumber, int phaseNumber, int jobPartPhaseId) {

    }

    public static final String CONFIG_SCHEDULE_DATES = "SCHEDULE-DATES";

    private final DatabaseService databaseService;

    private final ConfigurationService configurationService;

    private final UserService userService;

    public JobServiceImpl(DatabaseService databaseService,
            ConfigurationService configurationService, UserService userService) {
        this.databaseService = databaseService;
        this.configurationService = configurationService;
        this.userService = userService;
    }

    @Override
    public Result<Job> findJob(int jobId) {
        return databaseService.findJob(jobId).fold(Result::of, Result::failure,
                () -> Result.failure(new InvalidJobException(jobId)));
    }

    @Override
    public Result<Job> createJob(CreateJob job) {
        // Validate job

        // If all don't match -> saved
        // If some don't match -> partially schedulable
        // If all match -> schedulable

        OptionalResult<Customer> optCustomer = OptionalResult.empty();
        if (job.customer() != null) {
            optCustomer = databaseService.findCustomer(job.customer());
            Result<Customer> customerResult = optCustomer.fold(Result::of, Result::failure,
                    () -> Result.failure(new InvalidCustomerException(job.customer())));
            if (customerResult.isFaulted()) {
                return customerResult.cast();
            }
        }

        return optCustomer.flatMapResult(customer -> {
            JobStatus status = JobStatus.SCHEDULABLE;
            if (customer == null) {
                if (!job.callOff()) {
                    status = JobStatus.SAVED;
                }
            } else if (customer.proforma() && job.paymentConfirmed() == null) {
                status = JobStatus.AWAITING_PAYMENT;
            }

            final var jobStatus = status;
            return databaseService.createJob(job,
                    part -> getSchedulableStatus(part, jobStatus).getCode(),
                    (_, _) -> JobStatus.AWAITING.getCode(), jobStatus.getCode());
        });
    }

    private static JobStatus getSchedulableStatus(CreateJobPart p, JobStatus jobStatus) {
        if (!p.materialAvailable()) {
            return JobStatus.AWAITING_MATERIAL;
        }

        return jobStatus;
    }

    @Override
    public Result<ConfigResponse> getScheduleDates() {
        return databaseService.getScheduleDates()
                .map(dateList -> new ConfigResponse("schedule-dates",
                        dateList.stream().map(date -> new KeyValuePair(date.format(
                                DateTimeFormatter.ofPattern("yyyy-MM-dd")), date.format(
                                DateTimeFormatter.ofPattern("dd/MM/yyyy")))).toList(), "date[]"));
    }

    @Override
    public Result<SchedulableJobParts> getSchedulable() {
        return databaseService.getSchedulable()
                .map(SchedulableJobParts::new);
    }

    @Override
    public Result<ScheduledJobPhases> getSchedule(String date, String role) {
        return getScheduleParamsFor(date).map(
                params -> params.values().stream().filter(group -> group.stream().anyMatch(r ->
                                r.paramConfig() != null
                                        && isForRole(r.paramConfig(), role)
                                        && isPhaseRunInput(r.paramInput())
                        ))
                        .map(group -> {
                            ScheduledJobPartParam r = group.getFirst();
                            return new ScheduledJobPhase(
                                    r.jobNumber(),
                                    r.jobParts(),
                                    r.jobPartId(),
                                    r.partNumber(),
                                    r.name(),
                                    r.oldName(),
                                    r.quantity(),
                                    r.status(),
                                    r.phaseDescription(),
                                    r.phaseNumber(),
                                    r.specialInstruction(),
                                    r.phaseStatus()
                            );
                        })
                        .toList()).map(ScheduledJobPhases::new);
    }

    private Result<LinkedHashMap<PartPhaseKey, List<ScheduledJobPartParam>>> getScheduleParamsFor(
            String date) {
        OffsetDateTime fromDate = null;
        OffsetDateTime toDate;
        if (date == null) {
            toDate = LocalDate.now(ZoneOffset.UTC).atStartOfDay()
                    .atOffset(ZoneOffset.UTC);
        } else {
            toDate = LocalDate.parse(date)
                    .atStartOfDay()
                    .atOffset(ZoneOffset.UTC);
            fromDate = toDate;
        }

        return databaseService.getScheduleForRole(fromDate, toDate).map(params ->
                params.stream()
                        .collect(Collectors.groupingBy(
                                r -> new PartPhaseKey(r.partNumber(), r.phaseNumber(),
                                        r.jobPartPhaseId()),
                                LinkedHashMap::new,
                                Collectors.toList()
                        )));
    }

    private boolean isPhaseRunInput(int input) {
        return input == ConfigurationServiceImpl.INPUT_PHASE_RUN;
    }

    private boolean isForRole(String config, String role) {
        return config.contains("(" + role + ")");
    }

    @Override
    public Result<Boolean> createSchedule(CreateSchedule schedule) {
        return databaseService.createSchedule(schedule.jobParts(),
                this::evaluator);
    }

    private ConfigValuePair evaluator(PhaseParamEvaluatorInput phaseParamEvaluatorInput) {
        if ((phaseParamEvaluatorInput.input() == ConfigurationServiceImpl.INPUT_JOB_CREATE)
                || phaseParamEvaluatorInput.paramConfig().startsWith("CHECK(")) {
            return phaseParamEvaluatorInput.product().fold(p ->
                            configurationService.resolveConfig(p,
                                    phaseParamEvaluatorInput.paramConfig(),
                                    phaseParamEvaluatorInput.input()),
                    ex -> new ConfigValuePair(phaseParamEvaluatorInput.paramConfig(),
                            ex.getMessage()),
                    () -> new ConfigValuePair(phaseParamEvaluatorInput.paramConfig(),
                            null));
        }
        return new ConfigValuePair(phaseParamEvaluatorInput.paramConfig(), null);
    }

    @Override
    public OptionalResult<JobWithOnePart> nextJob(String role) {
        return getScheduleParamsFor(null).flatMapOptional(params -> {
            List<Integer> phasesToMarkDone = new ArrayList<>();
            PartPhaseKey foundPhaseKey = null;

            for (Entry<PartPhaseKey, List<ScheduledJobPartParam>> entry : params.entrySet()) {
                if (!entry.getValue().isEmpty() && isNotCompleted(
                        JobStatus.fromCode(entry.getValue().getFirst().status()))) {

                    RoleMatch groupMatch = classifyGroup(entry.getValue(), role);

                    if (groupMatch == RoleMatch.NONE) {
                        phasesToMarkDone.add(entry.getValue().getFirst().jobPhaseId());
                        continue;
                    }

                    if (groupMatch == RoleMatch.YES) {
                        foundPhaseKey = entry.getKey();
                        break;
                    }
                }
            }

            PartPhaseKey phaseKey = foundPhaseKey;
            return databaseService.completePhasesAndStart(phasesToMarkDone,
                    phaseKey == null ? null : phaseKey.jobPartPhaseId());
        });

    }

    private boolean isNotCompleted(JobStatus jobStatus) {
        return jobStatus != JobStatus.COMPLETED;
    }

    @Override
    public OptionalResult<JobWithOnePart> signOff(PhaseSignOff completion) {
        Result<Boolean> loginSuccess;
        if (completion.pin()) {
            loginSuccess = userService.validatePin(completion.user(), completion.password());
        } else {
            loginSuccess = userService.login(completion.user(), completion.password(),
                            completion.role())
                    .map(_ -> true);
        }

        return loginSuccess.flatMap(_ ->
                        databaseService.getJobPartParams(
                                completion.paramData().keySet().stream().toList()
                                        .getFirst()).flatMap(ps -> validateCanSign(ps, completion.role()))
                ).flatMap(_ -> databaseService.signOff(completion.paramData()))
                .flatMapOptional(_ -> nextJob(completion.role()));
    }

    @Override
    public Result<JobViews> getJobs(Long toNumber, int count) {
        return databaseService.getJobs(toNumber, count).map(JobViews::new);
    }

    private RoleMatch roleMatch(String config, String role) {
        if (config == null) {
            return RoleMatch.NONE;
        }

        if (config.contains("(" + role + ")")) {
            return RoleMatch.YES;
        }

        if (config.startsWith("SIGN(")) {
            return RoleMatch.NOT_THIS_ROLE;
        }

        return RoleMatch.NONE;
    }

    private RoleMatch classifyGroup(List<ScheduledJobPartParam> group, String role) {
        boolean sawNotThisRole = false;

        for (ScheduledJobPartParam r : group) {
            if (!isPhaseRunInput(r.paramInput())) {
                continue;
            }

            RoleMatch match = roleMatch(r.paramConfig(), role);

            if (match == RoleMatch.YES) {
                return RoleMatch.YES;
            }

            if (match == RoleMatch.NOT_THIS_ROLE) {
                sawNotThisRole = true;
            }
        }

        return sawNotThisRole ? RoleMatch.NOT_THIS_ROLE : RoleMatch.NONE;
    }

    public Result<Boolean> validateCanSign(List<JobPartParam> params, String role) {
        if (params == null || params.isEmpty()) {
            throw new IllegalStateException("No params found");
        }

        int firstEmptyRoleIndex = -1;

        for (int i = 0; i < params.size(); i++) {
            JobPartParam param = params.get(i);
            String config = param.config();

            if (isNonSignConfig(config)) {
                continue;
            }

            if (role.equals(extractSignRole(config)) && isBlank(param.value())) {
                firstEmptyRoleIndex = i;
                break;
            }
        }

        if (firstEmptyRoleIndex < 0) {
            return Result.failure(
                    new IllegalStateException("No unsigned SIGN(" + role + ") slot available"));
        }

        for (int i = 0; i < firstEmptyRoleIndex; i++) {
            JobPartParam param = params.get(i);

            if (isNonSignConfig(param.config())) {
                continue;
            }

            if (isBlank(param.value())) {
                return Result.failure(new InvalidSignOffException(
                        "Cannot sign as " + role + " before all earlier sign-offs are complete"
                ));
            }
        }

        return Result.of(true);
    }

    private boolean isNonSignConfig(String config) {
        return config == null || !config.startsWith("SIGN(") || !config.endsWith(")");
    }

    private String extractSignRole(String config) {
        return config.substring("SIGN(".length(), config.length() - 1).trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
