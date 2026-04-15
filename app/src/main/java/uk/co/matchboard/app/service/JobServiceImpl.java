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
import uk.co.matchboard.app.exception.InvalidJobException;
import uk.co.matchboard.app.functional.OptionalResult;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.config.ConfigResponse;
import uk.co.matchboard.app.model.config.KeyValuePair;
import uk.co.matchboard.app.model.job.CreateJob;
import uk.co.matchboard.app.model.job.CreateJobPart;
import uk.co.matchboard.app.model.job.Job;
import uk.co.matchboard.app.model.job.JobStatus;
import uk.co.matchboard.app.model.job.JobWithOnePart;
import uk.co.matchboard.app.model.job.SchedulableJobParts;
import uk.co.matchboard.app.model.job.ScheduledJobPartParam;
import uk.co.matchboard.app.model.job.ScheduledJobPhase;
import uk.co.matchboard.app.model.job.ScheduledJobPhases;
import uk.co.matchboard.app.model.job.UpdateSchedule;
import uk.co.matchboard.app.model.product.PhaseParamEvaluatorInput;

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

    public JobServiceImpl(DatabaseService databaseService, ConfigurationService configurationService) {
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

        // If all don't match -> saved
        // If some don't match -> partially schedulable
        // If all match -> schedulable

        JobStatus jobStatus =
                job.parts().stream().anyMatch(p -> isSchedulable(job, p, null))
                        ? JobStatus.SCHEDULABLE
                        : JobStatus.SAVED;
        return databaseService.createJob(job,
                part -> isSchedulable(job, part, jobStatus) ? JobStatus.SCHEDULABLE.getCode()
                        : JobStatus.SAVED.getCode(),
                (_, lastStatus) -> {
                    if (lastStatus == -1 && jobStatus == JobStatus.SCHEDULABLE) {
                        return JobStatus.READY.getCode();
                    } else {
                        return JobStatus.AWAITING.getCode();
                    }
                }, jobStatus.getCode()
        );
    }

    private static boolean isSchedulable(CreateJob job, CreateJobPart p, JobStatus jobStatus) {
        return job.paymentReceived() && p.scheduleFor() != null && p.materialAvailable()
                && jobStatus != JobStatus.SAVED;
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
    public Result<SchedulableJobParts> getSchedule(String date) {
        if (date == null) {
            return databaseService.getUnscheduled().map(SchedulableJobParts::new);
        } else {
            return databaseService.getScheduleFor(OffsetDateTime.parse(date + "T00:00:00+00:00"))
                    .map(SchedulableJobParts::new);
        }
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
    public Result<SchedulableJobParts> updateSchedule(UpdateSchedule schedule) {
        return databaseService.updateSchedule(
                        OffsetDateTime.parse(schedule.date() + "T00:00:00+00:00"), schedule.jobPartIds(),
                        this::evaluator)
                .flatMap(_ -> getSchedule(schedule.date()));
    }

    private String evaluator(PhaseParamEvaluatorInput phaseParamEvaluatorInput) {
        if (phaseParamEvaluatorInput.input() == ConfigurationServiceImpl.INPUT_JOB_CREATE) {
            return phaseParamEvaluatorInput.product().fold(p ->
                            configurationService.resolveConfig(p,
                                    phaseParamEvaluatorInput.paramConfig(),
                                    phaseParamEvaluatorInput.input()),
                    Throwable::getMessage, () -> null);
        }
        return null;
    }

    @Override
    public OptionalResult<JobWithOnePart> nextJob(String role) {
        return getScheduleParamsFor(null).flatMapOptional(params -> {
                List<Integer> phasesToMarkDone = new ArrayList<>();
            PartPhaseKey foundPhaseKey = null;

            for (Entry<PartPhaseKey, List<ScheduledJobPartParam>> entry : params.entrySet()) {
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

            PartPhaseKey phaseKey = foundPhaseKey;
            return databaseService.completePhasesAndStart(phasesToMarkDone,
                    phaseKey == null ? null : phaseKey.jobPartPhaseId());
        });

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
}
