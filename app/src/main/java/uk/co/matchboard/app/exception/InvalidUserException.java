package uk.co.matchboard.app.exception;

public class InvalidUserException extends Exception {
    public InvalidUserException() {
        super("Invalid username, password or role.");
    }

    public InvalidUserException(boolean userNameOnly) {
        super("Invalid username");
    }
}
