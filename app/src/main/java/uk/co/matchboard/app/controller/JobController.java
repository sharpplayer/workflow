package uk.co.matchboard.app.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import uk.co.matchboard.app.exception.ExceptionHandler;
import uk.co.matchboard.app.model.job.CreateJob;
import uk.co.matchboard.app.service.JobService;

@RestController
public class JobController {

    private final JobService jobService;

    public JobController(JobService jobService) {
        this.jobService = jobService;
    }

    @PostMapping("/jobs")
    public ResponseEntity<?> createJob(@RequestBody CreateJob job) {
        return jobService.createJob(job)
                .fold(ResponseEntity::ok, ExceptionHandler::toResponse);
    }

    @GetMapping("/schedule-dates")
    public ResponseEntity<?> getScheduleDates() {
        return jobService.getScheduleDates()
                .fold(ResponseEntity::ok, ExceptionHandler::toResponse);
    }

    @GetMapping("/schedule")
    public ResponseEntity<?> getSchedule(
            @RequestParam(required = false) String date
    ) {
        return jobService.getSchedule(date)
                .fold(ResponseEntity::ok, ExceptionHandler::toResponse);
    }

}
