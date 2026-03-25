package uk.co.matchboard.app.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import uk.co.matchboard.app.exception.ExceptionHandler;
import uk.co.matchboard.app.model.product.Phases;
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

    @PutMapping("/products/{productId}/phases")
    public ResponseEntity<?> updatePhases(@PathVariable int productId, @RequestBody Phases phases) {
        return productService.updatePhases(productId, phases)
                .fold(ResponseEntity::ok, ExceptionHandler::toResponse);
    }

    @GetMapping("/products/{productId}/phases")
    public ResponseEntity<?> getPhases(@PathVariable int productId) {
        return productService.getPhases(productId)
                .fold(ResponseEntity::ok, ExceptionHandler::toResponse);
    }

    @GetMapping("/products/{productId}/phases/{phaseId}")
    public ResponseEntity<?> getPhases(@PathVariable int productId, @PathVariable int phaseId) {
        return productService.getResolvedPhase(productId, phaseId)
                .fold(ResponseEntity::ok, ExceptionHandler::toResponse);
    }

    @GetMapping("/phases")
    public ResponseEntity<?> getPhases() {
        return productService.getPhases()
                .fold(ResponseEntity::ok, ExceptionHandler::toResponse);
    }

}
