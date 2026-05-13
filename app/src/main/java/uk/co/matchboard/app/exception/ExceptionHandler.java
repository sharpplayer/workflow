package uk.co.matchboard.app.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.TransientDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

public class ExceptionHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(ExceptionHandler.class);

    public static ResponseEntity<?> toResponse(Exception ex) {

        if (ex instanceof DuplicateUserException e) {
            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body(new ErrorResponse("DUPLICATE_USER", e.getMessage()));
        }

        if (ex instanceof InvalidUserException e) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(new ErrorResponse("UNAUTHORIZED", e.getMessage()));
        }

        ValidationException validationException = findValidationException(ex);

        if (validationException != null) {
            return validationResponse(validationException);
        }

        return switch (ex) {
            case TransientDataAccessException e -> {
                LOGGER.error("Transient DB error: {}", e.getMessage(), e);
                yield ResponseEntity
                        .status(HttpStatus.SERVICE_UNAVAILABLE)
                        .body(new ErrorResponse("DB_UNAVAILABLE",
                                "Service temporarily unavailable"));
            }

            case DataAccessException e -> {
                LOGGER.error("Database error: {}", e.getMessage(), e);
                yield ResponseEntity
                        .status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(new ErrorResponse("DB_ERROR",
                                "A database error occurred"));
            }

            default -> {
                LOGGER.error("Unexpected error: {}", ex.getMessage(), ex);
                yield ResponseEntity
                        .status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(new ErrorResponse("INTERNAL_ERROR",
                                "An unexpected error occurred"));
            }
        };
    }

    private static ValidationException findValidationException(Throwable ex) {
        Throwable current = ex;

        while (current != null) {
            if (current instanceof ValidationException validationException) {
                return validationException;
            }

            current = current.getCause();
        }

        return null;
    }

    private static ResponseEntity<?> validationResponse(ValidationException ex) {
        String message = ex instanceof Throwable throwable
                ? throwable.getMessage()
                : "Validation failed";

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("VALIDATION_ERROR", message));
    }
}
