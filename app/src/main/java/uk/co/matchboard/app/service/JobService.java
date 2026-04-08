package uk.co.matchboard.app.service;

import uk.co.matchboard.app.functional.OptionalResult;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.config.ConfigResponse;
import uk.co.matchboard.app.model.job.CreateJob;
import uk.co.matchboard.app.model.job.Job;
import uk.co.matchboard.app.model.job.SchedulableJobParts;
import uk.co.matchboard.app.model.job.UpdateSchedule;

public interface JobService {

    Result<Job> createJob(CreateJob job);

    Result<ConfigResponse> getScheduleDates();

    Result<SchedulableJobParts> getSchedule(String date);

    Result<SchedulableJobParts> updateSchedule(UpdateSchedule schedule);
}
