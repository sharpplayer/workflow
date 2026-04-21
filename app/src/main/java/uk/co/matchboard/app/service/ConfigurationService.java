package uk.co.matchboard.app.service;

import java.util.List;
import java.util.Set;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.config.ConfigResponse;
import uk.co.matchboard.app.model.config.ConfigValuePair;
import uk.co.matchboard.app.model.product.Product;

public interface ConfigurationService {

    Result<ConfigResponse> getConfig(String config);

    ConfigValuePair resolveConfig(Product product, String config, int input);

    boolean hasPossibleTypos(List<String> productMachines, Set<String> machines);
}
