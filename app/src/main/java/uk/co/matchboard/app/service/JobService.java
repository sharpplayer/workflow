package uk.co.matchboard.app.service;

import uk.co.matchboard.app.functional.OptionalResult;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.config.ConfigResponse;
import uk.co.matchboard.app.model.job.CreateJob;
import uk.co.matchboard.app.model.job.Job;
import uk.co.matchboard.app.model.job.JobWithOnePart;
import uk.co.matchboard.app.model.job.SchedulableJobParts;
import uk.co.matchboard.app.model.job.ScheduledJobPhases;
import uk.co.matchboard.app.model.job.UpdateSchedule;

public interface JobService {

    Result<Job> findJob(int jobId);

    Result<Job> createJob(CreateJob job);

    Result<ConfigResponse> getScheduleDates();

    Result<SchedulableJobParts> getSchedule(String date);

    Result<ScheduledJobPhases> getSchedule(String date, String role);

    Result<SchedulableJobParts> updateSchedule(UpdateSchedule schedule);

    OptionalResult<JobWithOnePart> nextJob(String role);
}
