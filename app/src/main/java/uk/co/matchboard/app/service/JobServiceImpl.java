package uk.co.matchboard.app.service;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import org.springframework.stereotype.Service;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.config.ConfigResponse;
import uk.co.matchboard.app.model.config.KeyValuePair;
import uk.co.matchboard.app.model.job.CreateJob;
import uk.co.matchboard.app.model.job.Job;
import uk.co.matchboard.app.model.job.JobStatus;

@Service
public class JobServiceImpl implements JobService {

    public static final String CONFIG_SCHEDULE_DATES = "SCHEDULE-DATES";

    private final DatabaseService databaseService;

    public JobServiceImpl(DatabaseService databaseService) {
        this.databaseService = databaseService;
    }

    @Override
    public Result<Job> createJob(CreateJob job) {
        // Validate job
        JobStatus jobStatus =
                job.parts().stream().anyMatch(p -> p.scheduleFor() == null) ? JobStatus.SAVED
                        : JobStatus.SCHEDULABLE;
        return databaseService.createJob(job,
                part -> jobStatus == JobStatus.SAVED ? JobStatus.SAVED.getCode()
                        : (part.scheduleFor() != null ? JobStatus.SCHEDULABLE.getCode()
                                : JobStatus.SAVED.getCode()),
                (phase, lastStatus) -> {
                    if (lastStatus == -1) {
                        return JobStatus.READY.getCode();
                    } else {
                        return JobStatus.AWAITING.getCode();
                    }
                }, jobStatus.getCode()
        );
    }

    @Override
    public Result<ConfigResponse> getScheduleDates() {
        return databaseService.getScheduleDates()
                .map(dateList -> new ConfigResponse("schedule-dates", dateList.stream().map(date -> {
                    String d = date.toString();
                    return new KeyValuePair(d, OffsetDateTime.parse(d).format(
                            DateTimeFormatter.ofPattern("dd/MM/yyyy")));
                }).toList(), "date[]"));
    }
}
