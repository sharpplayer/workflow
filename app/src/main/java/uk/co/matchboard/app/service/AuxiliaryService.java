package uk.co.matchboard.app.service;

import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.config.ConfigResponse;
import uk.co.matchboard.app.model.config.CreateCarrier;
import uk.co.matchboard.app.model.config.KeyValuePair;

public interface AuxiliaryService {

    Result<ConfigResponse> getCustomers();

    Result<ConfigResponse> getCarriers();

    Result<ConfigResponse> getMachines();

    Result<KeyValuePair> createCarrier(CreateCarrier carrier);
}
