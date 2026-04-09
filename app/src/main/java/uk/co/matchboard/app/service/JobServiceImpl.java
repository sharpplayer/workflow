package uk.co.matchboard.app.service;

import static uk.co.matchboard.app.service.ProductServiceImpl.INPUT_PHASE_RUN;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import uk.co.matchboard.app.exception.InvalidJobException;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.config.ConfigResponse;
import uk.co.matchboard.app.model.config.KeyValuePair;
import uk.co.matchboard.app.model.job.CreateJob;
import uk.co.matchboard.app.model.job.CreateJobPart;
import uk.co.matchboard.app.model.job.Job;
import uk.co.matchboard.app.model.job.JobStatus;
import uk.co.matchboard.app.model.job.SchedulableJobPartParam;
import uk.co.matchboard.app.model.job.SchedulableJobParts;
import uk.co.matchboard.app.model.job.SchedulableJobPhase;
import uk.co.matchboard.app.model.job.SchedulableJobPhases;
import uk.co.matchboard.app.model.job.UpdateSchedule;

@Service
public class JobServiceImpl implements JobService {

    private record PartPhaseKey(int partNumber, int phaseNumber) {

    }

    public static final String CONFIG_SCHEDULE_DATES = "SCHEDULE-DATES";

    private final DatabaseService databaseService;

    public JobServiceImpl(DatabaseService databaseService) {
        this.databaseService = databaseService;
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
        // If some don't match -> partically schedulable
        // If all match -> scheduleable

        JobStatus jobStatus =
                job.parts().stream().anyMatch(p -> isSchedulable(job, p, null))
                        ? JobStatus.SCHEDULABLE
                        : JobStatus.SAVED;
        return databaseService.createJob(job,
                part -> isSchedulable(job, part, jobStatus) ? JobStatus.SCHEDULABLE.getCode()
                        : JobStatus.SAVED.getCode(),
                (phase, lastStatus) -> {
                    if (lastStatus == -1 && jobStatus == JobStatus.SCHEDULABLE) {
                        return JobStatus.READY.getCode();
                    } else {
                        return JobStatus.AWAITING.getCode();
                    }
                }, jobStatus.getCode()
        );
    }

    private static boolean isSchedulable(CreateJob job, CreateJobPart p, JobStatus jobStatus) {
        return job.paymentReceived() && p.scheduleFor() != null && p.materialAvailable();
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
    public Result<SchedulableJobPhases> getSchedule(String date, String role) {
        OffsetDateTime fromDate = null;
        OffsetDateTime toDate = null;
        if (date == null) {
            toDate = LocalDate.now(ZoneOffset.UTC).atStartOfDay()
                    .atOffset(ZoneOffset.UTC);
        } else {
            toDate = LocalDate.parse(date)
                    .atStartOfDay()
                    .atOffset(ZoneOffset.UTC);
            fromDate = toDate;
        }

        databaseService.getScheduleForRole(fromDate, toDate).map(params -> {
            return params.stream()
                    .collect(Collectors.groupingBy(
                            r -> new PartPhaseKey(r.partNumber(), r.phaseNumber())
                    ))
                    .values().stream()
                    .filter(group -> group.stream().anyMatch(r ->
                            r.paramConfig() != null
                                    && isForRole(r.paramConfig(), role)   // or equals(...)
                                    && isPhaseRunInput(r.paramInput())
                    ))
                    .map(group -> {
                        SchedulableJobPartParam r = group.getFirst();
                        return new SchedulableJobPhase(
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
                    .toList();
        });

        return null;
    }

    private boolean isPhaseRunInput(int input) {
        return input == INPUT_PHASE_RUN;
    }

    private boolean isForRole(String config, String role) {
        return config.contains("(" + role + ")");
    }

    @Override
    public Result<SchedulableJobParts> updateSchedule(UpdateSchedule schedule) {
        return databaseService.updateSchedule(
                        OffsetDateTime.parse(schedule.date() + "T00:00:00+00:00"), schedule.jobPartIds())
                .flatMap(_ -> getSchedule(schedule.date()));
    }
}
