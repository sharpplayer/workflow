package uk.co.matchboard.app.exception;

public class InvalidRoleException extends Exception {

    public InvalidRoleException(String role, String expectedRole) {
        super("Invalid role for login (" + role + ") expected " + expectedRole);
    }
}
