package uk.co.matchboard.app.exception;

public class DuplicateUserException extends Exception implements ValidationException {

    public DuplicateUserException(String user) {
        super("Username " + user + "already exists.");
    }
}
