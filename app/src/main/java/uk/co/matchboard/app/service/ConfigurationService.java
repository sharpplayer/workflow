package uk.co.matchboard.app.service;

import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.config.ConfigResponse;
import uk.co.matchboard.app.model.config.CreateCarrier;
import uk.co.matchboard.app.model.config.CreateCustomer;
import uk.co.matchboard.app.model.config.KeyValuePair;

public interface ConfigurationService {

    Result<ConfigResponse> getConfig(String config);

    Result<KeyValuePair> createCustomer(CreateCustomer customer);

    Result<KeyValuePair> createCarrier(CreateCarrier carrier);
}
