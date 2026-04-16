package uk.co.matchboard.app.service;

import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.config.ConfigResponse;
import uk.co.matchboard.app.model.product.Product;

public interface ConfigurationService {

    Result<ConfigResponse> getConfig(String config);

    String resolveConfig(Product product, String config, int input);
}
