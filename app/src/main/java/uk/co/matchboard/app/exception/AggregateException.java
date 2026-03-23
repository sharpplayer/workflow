package uk.co.matchboard.app.exception;

import java.util.List;

public class AggregateException extends Exception implements ValidationException {

    private final List<Exception> errors;

    public AggregateException(List<Exception> errors) {
        super(errors.stream()
                .map(Exception::getMessage)   // extract messages
                .filter(msg -> msg != null && !msg.isEmpty()) // skip null/empty
                .reduce((msg1, msg2) -> msg1 + "; " + msg2)  // join with ;
                .orElse("Multiple errors occurred"));        // fallback
        this.errors = errors;
    }

    public List<Exception> getErrors() {
        return errors;
    }
}
