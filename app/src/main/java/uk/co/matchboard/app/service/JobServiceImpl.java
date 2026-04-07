package uk.co.matchboard.app.service;

import org.springframework.stereotype.Service;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.job.CreateJob;
import uk.co.matchboard.app.model.job.Job;

@Service
public class JobServiceImpl implements JobService {

    private final DatabaseService databaseService;

    public JobServiceImpl(DatabaseService databaseService) {
        this.databaseService = databaseService;
    }

    @Override
    public Result<Job> createJob(CreateJob job) {
        // Validate job
        return databaseService.createJob(job);
    }
}
