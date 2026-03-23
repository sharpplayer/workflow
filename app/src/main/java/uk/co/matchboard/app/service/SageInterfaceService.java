package uk.co.matchboard.app.service;

import java.util.List;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.sage.SageProduct;

public interface SageInterfaceService {

    Result<List<SageProduct>> readProductsFromFile(String csvFile);
}
