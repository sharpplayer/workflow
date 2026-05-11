package uk.co.matchboard.app.service;

import java.util.List;
import java.util.Map;
import java.util.Set;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.config.ConfigResponse;
import uk.co.matchboard.app.model.config.ConfigValuePair;
import uk.co.matchboard.app.model.config.KeyValuePair;
import uk.co.matchboard.app.model.product.PhaseParamEvaluatorInput;

public interface ConfigurationService {

    Result<ConfigResponse> getConfig(String config);

    Result<Map<String, String>> getConfigMap(String config);

    Result<ConfigResponse> getConfigKeyValueList(String config);

    ConfigValuePair resolveConfig(PhaseParamEvaluatorInput input);

    boolean hasPossibleTypos(List<String> productMachines, Set<String> machines);

    Result<ConfigResponse> getListConfig(String config, String value, String type);
}
