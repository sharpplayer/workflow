package uk.co.matchboard.app.exception;

import org.springframework.dao.DataAccessException;

public class DataException extends DataAccessException implements ValidationException {

    public DataException(String message) {
        super(message);
    }
}
