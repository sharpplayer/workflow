package uk.co.matchboard.app.exception;

public class InvalidUserException extends Exception {
    public InvalidUserException() {
        super("Invalid username or password.");
    }
}
