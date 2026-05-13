package uk.co.matchboard.app.exception;

public class PhaseNotCompletedException extends Exception implements ValidationException {

    public PhaseNotCompletedException(String phase, String mode, String machine) {
        super(phase + " not " + mode + " for " + machine);
    }
}
