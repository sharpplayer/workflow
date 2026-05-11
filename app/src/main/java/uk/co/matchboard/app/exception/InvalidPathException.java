package uk.co.matchboard.app.exception;

public class InvalidPathException extends Exception {

    public InvalidPathException(String file) {
        super("Invalid path: " + file);
    }
}
