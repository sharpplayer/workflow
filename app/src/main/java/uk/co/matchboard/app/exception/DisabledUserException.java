package uk.co.matchboard.app.exception;

public class DisabledUserException extends Exception {
    public DisabledUserException(String user) {
        super("User " + user + " is disabled.");
    }
}
