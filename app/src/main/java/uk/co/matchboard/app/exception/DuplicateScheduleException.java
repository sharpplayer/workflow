package uk.co.matchboard.app.exception;

import java.time.LocalDate;

public class DuplicateScheduleException extends Exception implements ValidationException {

    public DuplicateScheduleException(LocalDate date) {
        super("A schedule already exists for " + date);
    }
}
