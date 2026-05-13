package uk.co.matchboard.app.exception;

public class PhaseNotCompletedException extends Exception implements ValidationException {

    public PhaseNotCompletedException(String phase) {
        super(phase + " not started");
    }
}
