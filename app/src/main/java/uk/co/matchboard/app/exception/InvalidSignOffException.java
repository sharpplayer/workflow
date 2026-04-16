package uk.co.matchboard.app.exception;

public class InvalidSignOffException extends Exception implements ValidationException {

    public InvalidSignOffException(String message) {
        super(message);
    }
}
