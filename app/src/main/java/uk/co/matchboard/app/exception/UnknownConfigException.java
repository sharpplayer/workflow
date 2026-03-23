package uk.co.matchboard.app.exception;

public class UnknownConfigException extends Exception implements ValidationException {

    public UnknownConfigException(String config) {
        super("Unknown config: " + config + ".");
    }
}
