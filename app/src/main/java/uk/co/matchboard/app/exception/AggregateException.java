package uk.co.matchboard.app.exception;

import java.util.List;

public class AggregateException extends Exception implements ValidationException {

    private final List<Exception> errors;

    public AggregateException(List<Exception> errors) {
        super(errors.stream()
                .map(Exception::getMessage)
                .filter(msg -> msg != null && !msg.isEmpty())
                .reduce((msg1, msg2) -> msg1 + "; " + msg2)
                .orElse("Multiple errors occurred"));
        this.errors = errors;
    }

    public List<Exception> getErrors() {
        return errors;
    }
}
