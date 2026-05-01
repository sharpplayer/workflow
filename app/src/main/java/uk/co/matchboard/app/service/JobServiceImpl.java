package uk.co.matchboard.app.service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import uk.co.matchboard.app.exception.InvalidCustomerException;
import uk.co.matchboard.app.exception.InvalidJobException;
import uk.co.matchboard.app.exception.InvalidSignOffException;
import uk.co.matchboard.app.functional.OptionalResult;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.functional.TryUtils;
import uk.co.matchboard.app.model.config.ConfigValuePair;
import uk.co.matchboard.app.model.config.Customer;
import uk.co.matchboard.app.model.job.CreateJob;
import uk.co.matchboard.app.model.job.CreateJobPart;
import uk.co.matchboard.app.model.job.CreateSchedule;
import uk.co.matchboard.app.model.job.Job;
import uk.co.matchboard.app.model.job.JobPartParam;
import uk.co.matchboard.app.model.job.JobStatus;
import uk.co.matchboard.app.model.job.JobViews;
import uk.co.matchboard.app.model.job.JobWithOnePart;
import uk.co.matchboard.app.model.job.SchedulableJobParts;
import uk.co.matchboard.app.model.job.ScheduleSummary;
import uk.co.matchboard.app.model.job.ScheduledJobPartParam;
import uk.co.matchboard.app.model.job.ScheduledJobPartViews;
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

    private record PartPhaseKey(int jobId, int partNumber, int phaseNumber, int jobPartId,
                                int jobPartPhaseId) {

    }

    private final DatabaseService databaseService;

    private final ConfigurationService configurationService;

    public JobServiceImpl(DatabaseService databaseService,
            ConfigurationService configurationService) {
        this.databaseService = databaseService;
        this.configurationService = configurationService;
    }

    @Override
    public Result<Job> findJob(int jobId) {
        return databaseService.findJob(jobId).fold(Result::of, Result::failure,
                () -> Result.failure(new InvalidJobException(jobId)));
    }

    @Override
    public Result<Job> createJob(CreateJob job) {
        // Validate job

        // Check to/from call off matches phases provided

        // Check the phases are relevant for at least one machine
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

    @Override
    public Result<ScheduledJobPartViews> getScheduleForMachine(String date, int machine) {
        Result<LocalDate> toDate;
        if (date == null) {
            toDate = Result.of(LocalDate.now());
        } else {
            toDate = TryUtils.tryCatch(() -> LocalDate.parse(date));
        }
        return toDate.flatMap(
                        d -> {
                            LocalDate fromDate = null;
                            if (date != null) {
                                fromDate = d;
                            }
                            return databaseService.getScheduleForMachine(machine, fromDate, d);
                        })
                .map(ScheduledJobPartViews::new);
    }

    private Result<LinkedHashMap<PartPhaseKey, List<ScheduledJobPartParam>>> getScheduleParamsFor(
            String date) {
        LocalDate fromDate = null;
        LocalDate toDate;
        if (date == null) {
            toDate = LocalDate.now(ZoneOffset.UTC);
        } else {
            toDate = LocalDate.parse(date);
            fromDate = toDate;
        }

        return databaseService.getScheduleForRole(fromDate, toDate)
                .map(schedule -> {

                    Map<Integer, ScheduleSummary> summary = schedule.scheduleSummary();

                    return schedule.params().stream()
                            .sorted(Comparator.comparing(r -> {
                                ScheduleSummary s = summary.get(r.jobPartId());

                                if (s == null) {
                                    return OffsetDateTime.MAX;
                                }

                                return r.status() == JobStatus.MACHINING_COMPLETED.getCode()
                                        ? s.minPlannedTime()
                                        : s.maxPlannedTime();
                            }))
                            .collect(Collectors.groupingBy(
                                    r -> new PartPhaseKey(
                                            r.jobId(),
                                            r.partNumber(),
                                            r.phaseNumber(),
                                            r.jobPartId(),
                                            r.jobPartPhaseId()
                                    ),
                                    LinkedHashMap::new,
                                    Collectors.toList()
                            ));
                });
    }

    private boolean isPhaseRunInput(Integer input) {
        // Input can be null if the phase does have any params (yet)
        return input != null && input == ConfigurationServiceImpl.INPUT_PHASE_RUN;
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
    public OptionalResult<JobWithOnePart> nextJob(String role, Integer lastJobPhaseUpdated) {
        return getScheduleParamsFor(null).flatMapOptional(params -> {
            List<Integer> phasesToMarkDone = new ArrayList<>();
            PartPhaseKey startPhaseKey = null;
            PartPhaseKey nextJobKey = null;

            Integer lastJobId = null;
            boolean phaseRequiredSignOff = false;
            boolean jobStarted = false;
            for (Entry<PartPhaseKey, List<ScheduledJobPartParam>> entry : params.entrySet()) {
                if (lastJobId == null || lastJobId != entry.getKey().jobId()) {
                    lastJobId = entry.getKey().jobId();
                    phaseRequiredSignOff = false;
                    jobStarted = false;
                }
                if (!entry.getValue().isEmpty() && isPhaseNotCompleted(
                        JobStatus.fromCode(entry.getValue().getFirst().phaseStatus()))) {
                    RoleMatch groupMatch = classifyPhase(entry.getValue(), role);
                    if (groupMatch == RoleMatch.NONE && !phaseRequiredSignOff) {
                        phasesToMarkDone.add(entry.getValue().getFirst().jobPhaseId());
                        continue;
                    }
                    phaseRequiredSignOff = true;
                    if (!isPhaseStarted(
                            JobStatus.fromCode(entry.getValue().getFirst().phaseStatus()))
                    ) {
                        if (!jobStarted && startPhaseKey == null) {
                            startPhaseKey = entry.getKey();
                        }
                    } else {
                        jobStarted = true;
                    }

                    if (groupMatch == RoleMatch.YES) {
                        nextJobKey = entry.getKey();
                        break;
                    }
                }
            }

            Integer nextPhaseId = null;
            if (nextJobKey != null) {
                nextPhaseId = nextJobKey.jobPartPhaseId();
            }
            if (startPhaseKey != null) {
                var job = databaseService.completePhasesAndStart(phasesToMarkDone,
                        startPhaseKey.jobId(), startPhaseKey.jobPartPhaseId(), lastJobPhaseUpdated,
                        nextPhaseId);
                if (nextJobKey != null && startPhaseKey.jobId() == nextJobKey.jobId()) {
                    return job;
                }
            }
            if (nextJobKey == null) {
                return OptionalResult.empty();
            }
            if (!jobStarted) {
                return databaseService.completePhasesAndStart(phasesToMarkDone,
                        nextJobKey.jobId(), nextJobKey.jobPartPhaseId(), lastJobPhaseUpdated,
                        nextPhaseId);
            }
            return databaseService.getJobWithOnePart(nextJobKey.jobId(),
                    nextJobKey.jobPartId(), null, nextPhaseId);
        });

    }

    private boolean isPhaseStarted(JobStatus phaseStatus) {
        return phaseStatus == JobStatus.STARTED;
    }

    private boolean isPhaseNotCompleted(JobStatus phaseStatus) {
        return phaseStatus != JobStatus.COMPLETED;
    }

    @Override
    public OptionalResult<JobWithOnePart> signOff(PhaseSignOff completion) {

        return databaseService.getJobPartParams(
                        completion.paramData().keySet().stream().toList()
                                .getFirst()).flatMap(ps -> validateCanSign(ps, completion.role()))
                .flatMapOptional(_ -> databaseService.signOff(completion.paramData(),
                        completion.operationId()))
                .fold(j -> {
                    if (completion.rpi() != null) {
                        return addRpi(j, completion.rpi()).map(_ -> j).toOptional();
                    }
                    return OptionalResult.of(j);
                }, OptionalResult::<JobWithOnePart>failure, OptionalResult::<JobWithOnePart>empty)
                // Next job here bumps all the states up
                .flatMap(j -> {
                    if (j.completedPhase() != null) {
                        return nextJob(completion.role(), j.completedPhase()).map(_ -> j);
                    }
                    return OptionalResult.of(j);
                })  ;
    }

    @Override
    public Result<JobViews> getJobs(Long toNumber, int count) {
        return databaseService.getJobs(toNumber, count).map(JobViews::new);
    }

    @Override
    public OptionalResult<JobWithOnePart> createRpi(int jobId, int jobPartId, int rpi) {
        return databaseService.getJobWithOnePart(jobId, jobPartId, null, null)
                .flatMap(j -> addRpi(j, rpi).toOptional());
    }

    private Result<JobWithOnePart> addRpi(JobWithOnePart jobWithOnePart, int rpi) {
        // Phases with RPI usage need params duplicated per rpi
        return databaseService.createRpi(jobWithOnePart, rpi).map(_ -> jobWithOnePart);
    }

    private RoleMatch classifyPhase(List<ScheduledJobPartParam> phaseParams, String role) {
        for (ScheduledJobPartParam r : phaseParams) {
            if (!isPhaseRunInput(r.paramInput())) {
                continue;
            }
            boolean myRole = r.paramConfig().endsWith("(" + role + ")");
            if (r.paramConfig().startsWith("SIGN(")) {
                if (myRole) {
                    return RoleMatch.YES;
                }
                return RoleMatch.NOT_THIS_ROLE;
            }
            if (r.paramConfig().startsWith("AWAIT(")) {
                if (myRole) {
                    return RoleMatch.YES;
                }
                return RoleMatch.NOT_THIS_ROLE;
            }
        }

        return RoleMatch.NONE;
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
                    new IllegalStateException(
                            "No unsigned AWAIT/SIGN(" + role + ") slot available"));
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
        return config == null || !(config.startsWith("AWAIT(") || config.startsWith("SIGN("))
                || !config.endsWith(")");
    }

    private String extractSignRole(String config) {
        if (config.startsWith("AWAIT(")) {
            return config.substring("AWAIT(".length(), config.length() - 1).trim();
        }
        return config.substring("SIGN(".length(), config.length() - 1).trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
