package uk.co.matchboard.app.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import uk.co.matchboard.app.exception.ExceptionHandler;
import uk.co.matchboard.app.service.ProductService;

@RestController
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping("/products")
    public ResponseEntity<?> getProducts() {
        return productService.getProducts()
                .fold(ResponseEntity::ok, ExceptionHandler::toResponse);
    }

    @GetMapping("/phases/{productId}")
    public ResponseEntity<?> getPhases(@PathVariable int productId) {
        return productService.getPhases(productId)
                .fold(ResponseEntity::ok, ExceptionHandler::toResponse);
    }

}
