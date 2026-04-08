package uk.co.matchboard.app.service;

import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.config.ConfigResponse;
import uk.co.matchboard.app.model.job.CreateJob;
import uk.co.matchboard.app.model.job.Job;

public interface JobService {

    Result<Job> createJob(CreateJob job);

    Result<ConfigResponse> getScheduleDates();
}
