package uk.co.matchboard.app.service;

import uk.co.matchboard.app.functional.OptionalResult;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.config.ConfigResponse;
import uk.co.matchboard.app.model.job.CreateJob;
import uk.co.matchboard.app.model.job.CreateSchedule;
import uk.co.matchboard.app.model.job.Job;
import uk.co.matchboard.app.model.job.JobViews;
import uk.co.matchboard.app.model.job.JobWithOnePart;
import uk.co.matchboard.app.model.job.SchedulableJobParts;
import uk.co.matchboard.app.model.job.ScheduledJobPartViews;
import uk.co.matchboard.app.model.job.ScheduledJobPhases;
import uk.co.matchboard.app.model.product.PhaseSignOff;

public interface JobService {

    Result<Job> findJob(int jobId);

    Result<Job> createJob(CreateJob job);

    Result<SchedulableJobParts> getSchedulable();

    Result<ScheduledJobPhases> getSchedule(String date, String role);

    Result<ScheduledJobPartViews> getScheduleForMachine(String date, int machine);

    Result<Boolean> createSchedule(CreateSchedule schedule);

    OptionalResult<JobWithOnePart> nextJob(String role);

    OptionalResult<JobWithOnePart> signOff(PhaseSignOff completion);

    Result<JobViews> getJobs(Long toNumber, int count);
}
