package uk.co.matchboard.app.exception;

public class BadValueException extends Exception implements ValidationException {

    public BadValueException(String id, String name, String value, String message) {
        super("Bad value " + (value == null || value.isEmpty() ? "(blank)" : value) + " for " + name
                + " on item " + id + "(" + message + ")");
    }
}
