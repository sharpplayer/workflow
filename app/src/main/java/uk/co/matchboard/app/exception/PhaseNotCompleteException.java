package uk.co.matchboard.app.exception;

public class PhaseNotCompleteException extends Exception implements ValidationException {

    public PhaseNotCompleteException(String message) {
        super("Phase not completed:" + message);
    }
}
