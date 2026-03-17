package uk.co.matchboard.app.exception;

public class JobNotFoundException extends Exception {
    public JobNotFoundException(String jobId) {
        super("Job with id " + jobId + " not found.");
    }
}
