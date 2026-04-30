package uk.co.matchboard.app.exception;

public class InvalidJobException extends Exception {

    public InvalidJobException(int jobId) {
        super("Invalid job id " + jobId);
    }

    public InvalidJobException(int jobId, String message) {
        super("Invalid job id " + jobId + " - " + message);
    }
}
