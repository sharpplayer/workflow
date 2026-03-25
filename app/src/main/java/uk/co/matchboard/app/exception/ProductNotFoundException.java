package uk.co.matchboard.app.exception;

public class ProductNotFoundException extends Exception {

    public ProductNotFoundException(int productId) {
        super("Product with id " + productId + " not found.");
    }
}
