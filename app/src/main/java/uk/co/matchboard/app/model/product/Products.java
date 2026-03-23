package uk.co.matchboard.app.model.product;

import java.util.List;

public record Products(List<ProductView> products, String validationErrors) {

}
