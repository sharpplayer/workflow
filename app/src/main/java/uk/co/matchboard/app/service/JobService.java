package uk.co.matchboard.app.service;

import org.springframework.web.multipart.MultipartFile;
import uk.co.matchboard.app.functional.OptionalResult;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.config.ConfigValuePair;
import uk.co.matchboard.app.model.job.CreateJob;
import uk.co.matchboard.app.model.job.CreateSchedule;
import uk.co.matchboard.app.model.job.Job;
import uk.co.matchboard.app.model.job.JobActivityViews;
import uk.co.matchboard.app.model.job.JobViews;
import uk.co.matchboard.app.model.job.JobWithOnePart;
import uk.co.matchboard.app.model.job.PhotoView;
import uk.co.matchboard.app.model.job.SchedulableJobParts;
import uk.co.matchboard.app.model.job.ScheduleViews;
import uk.co.matchboard.app.model.job.ScheduledJobPartViews;
import uk.co.matchboard.app.model.job.ScheduledJobPhases;
import uk.co.matchboard.app.model.job.UpdateJob;
import uk.co.matchboard.app.model.product.PhaseSignOff;

public interface JobService {

    Result<Job> findJob(int jobId);

    Result<Job> createJob(CreateJob job);

    Result<Job> updateJob(UpdateJob job);

    Result<SchedulableJobParts> getSchedulable();

    Result<ScheduledJobPhases> getSchedule(String date, String role);

    Result<ScheduleViews> getSchedules(String fromDate, String toDate, int limit);

    Result<ScheduledJobPartViews> getScheduleForMachine(String date, int machine);

    Result<ScheduledJobPartViews> getScheduleForDate(String date);

    Result<Boolean> createSchedule(CreateSchedule schedule);

    OptionalResult<JobWithOnePart> nextJob(String role);

    OptionalResult<JobWithOnePart> getJobWithOnePart(int jobId, int jobPartId,
            Integer activePhaseId);

    OptionalResult<JobWithOnePart> signOff(PhaseSignOff completion);

    Result<JobViews> getJobs(Long toNumber, int count);

    Result<JobActivityViews> getJobActivity();

    OptionalResult<JobWithOnePart> createRpi(int jobId, int jobPartId, String rpi);

    Result<ConfigValuePair> createPhoto(int jobNumber, int jobPart, MultipartFile photo,
            int paramId, int phase);

    Result<PhotoView> getPhoto(int jobNumber, int jobPart, int phase, int paramId);
}
