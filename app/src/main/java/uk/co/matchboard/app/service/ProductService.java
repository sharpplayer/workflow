package uk.co.matchboard.app.service;

import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.product.CreatePhase;
import uk.co.matchboard.app.model.product.Phase;
import uk.co.matchboard.app.model.product.Phases;
import uk.co.matchboard.app.model.product.Product;
import uk.co.matchboard.app.model.product.Products;

public interface ProductService {

    Result<Products> getProducts();

    Result<Phases> getPhases(int productId);

    Result<Phases> getPhases();

    Result<Phases> updatePhases(int productId, Phases phases);

    Result<Phase> getResolvedPhase(int productId, int phaseId);

    Result<Phase> createPhase(CreatePhase phase);
}
