package uk.co.matchboard.app.controller;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import uk.co.matchboard.app.exception.ExceptionHandler;
import uk.co.matchboard.app.model.job.CreateJob;
import uk.co.matchboard.app.model.job.CreateSchedule;
import uk.co.matchboard.app.model.job.UpdateJob;
import uk.co.matchboard.app.service.JobService;

@RestController
public class JobController {

    private final JobService jobService;

    public JobController(JobService jobService) {
        this.jobService = jobService;
    }

    @GetMapping("/jobs")
    public ResponseEntity<?> getJobs(@RequestParam(required = false) Long toNumber,
            @RequestParam int count) {
        return jobService.getJobs(toNumber, count)
                .fold(ResponseEntity::ok, ExceptionHandler::toResponse);
    }

    @PostMapping("/jobs")
    public ResponseEntity<?> createJob(@RequestBody CreateJob job) {
        return jobService.createJob(job)
                .fold(ResponseEntity::ok, ExceptionHandler::toResponse);
    }

    @PatchMapping("/jobs/{jobId}")
    public ResponseEntity<?> updateJob(@PathVariable int jobId, @RequestBody UpdateJob job) {
        UpdateJob update = new UpdateJob(
                jobId,
                job.due(),
                job.customer(),
                job.carrier(),
                job.callOff(),
                job.paymentConfirmed(),
                job.parts()
        );

        return jobService.updateJob(update)
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

    @GetMapping("/schedule")
    public ResponseEntity<?> getSchedule(
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Integer machineId
    ) {
        if (date == null && role == null && machineId == null) {
            return jobService.getSchedulable()
                    .fold(ResponseEntity::ok, ExceptionHandler::toResponse);
        } else if (machineId != null) {
            return jobService.getScheduleForMachine(date, machineId)
                    .fold(ResponseEntity::ok, ExceptionHandler::toResponse);
        }
        return jobService.getSchedule(date, role)
                .fold(ResponseEntity::ok, ExceptionHandler::toResponse);
    }

    @PostMapping("/schedule")
    public ResponseEntity<?> createSchedule(@RequestBody CreateSchedule schedule) {
        return jobService.createSchedule(schedule)
                .fold(ResponseEntity::ok, ExceptionHandler::toResponse);
    }

    @PostMapping("/jobs/{jobId}/part/{jobPartId}/rpi/{rpi}")
    public ResponseEntity<?> createRpi(@PathVariable int jobId, @PathVariable int jobPartId,
            @PathVariable int rpi) {
        return jobService.createRpi(jobId, jobPartId, rpi)
                .fold(ResponseEntity::ok, ExceptionHandler::toResponse,
                        () -> ResponseEntity.noContent().build());
    }

    @PostMapping("/jobs/{jobNumber}/part/{jobPart}/phase/{phase}/param/{paramId}")
    public ResponseEntity<?> uploadPhoto(
            @PathVariable int jobNumber,
            @PathVariable int jobPart,
            @PathVariable int phase,
            @PathVariable int paramId,
            @RequestParam("photo") MultipartFile photo
    ) {
        return jobService.createPhoto(jobNumber, jobPart, photo, paramId, phase)
                .fold(ResponseEntity::ok, ExceptionHandler::toResponse);

    }

    @GetMapping("/jobs/{jobNumber}/part/{jobPart}/phase/{phase}/param/{paramId}")
    public ResponseEntity<?> getPhoto(
            @PathVariable int jobNumber,
            @PathVariable int jobPart,
            @PathVariable int phase,
            @PathVariable int paramId
    ) {
        return jobService.getPhoto(jobNumber, jobPart, phase, paramId)
                .fold(photoView ->
                        ResponseEntity.ok()
                                .contentType(MediaType.parseMediaType(photoView.mediaType()))
                                .body(photoView.resource()), ExceptionHandler::toResponse);

    }

}
