package uk.co.matchboard.app.exception;

public class JobNotFoundException extends Exception implements ValidationException {

    public JobNotFoundException(String jobId) {
        super("Job with id " + jobId + " not found.");
    }
}
