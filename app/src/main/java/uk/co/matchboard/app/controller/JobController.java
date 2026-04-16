package uk.co.matchboard.app.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import uk.co.matchboard.app.exception.ExceptionHandler;
import uk.co.matchboard.app.model.job.CreateJob;
import uk.co.matchboard.app.model.job.UpdateSchedule;
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

    @GetMapping("/jobs/next")
    public ResponseEntity<?> nextJob(@RequestParam String role) {
        return jobService.nextJob(role)
                .fold(ResponseEntity::ok, ExceptionHandler::toResponse,
                        () -> ResponseEntity.noContent().build());
    }

    @GetMapping("/jobs/{jobId}")
    public ResponseEntity<?> getJob(@PathVariable int jobId) {
        return jobService.findJob(jobId)
                .fold(ResponseEntity::ok, ExceptionHandler::toResponse);
    }

    @GetMapping("/schedule-dates")
    public ResponseEntity<?> getScheduleDates() {
        return jobService.getScheduleDates()
                .fold(ResponseEntity::ok, ExceptionHandler::toResponse);
    }

    @GetMapping("/schedule")
    public ResponseEntity<?> getSchedule(
            @RequestParam(required = false) String date, @RequestParam(required = false) String role
    ) {
        if (role == null) {
            return jobService.getSchedule(date)
                    .fold(ResponseEntity::ok, ExceptionHandler::toResponse);
        } else {
            return jobService.getSchedule(date, role)
                    .fold(ResponseEntity::ok, ExceptionHandler::toResponse);
        }
    }

    @PostMapping("/schedule")
    public ResponseEntity<?> updateSchedule(@RequestBody UpdateSchedule schedule) {
        return jobService.updateSchedule(schedule)
                .fold(ResponseEntity::ok, ExceptionHandler::toResponse);
    }
}
