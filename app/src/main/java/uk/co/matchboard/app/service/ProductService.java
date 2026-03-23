package uk.co.matchboard.app.service;

import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.product.Products;

public interface ProductService {

    Result<Products> getProducts();
}
