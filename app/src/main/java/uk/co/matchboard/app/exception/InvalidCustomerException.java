package uk.co.matchboard.app.exception;

public class InvalidCustomerException extends Exception {

    public InvalidCustomerException(int customerId) {
        super("Invalid customer id " + customerId);
    }
}
