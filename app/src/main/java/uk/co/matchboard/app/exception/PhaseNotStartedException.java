package uk.co.matchboard.app.exception;

public class PhaseNotStartedException extends Exception implements ValidationException {

    public PhaseNotStartedException(String phase) {
        super(phase + " not started");
    }
}
