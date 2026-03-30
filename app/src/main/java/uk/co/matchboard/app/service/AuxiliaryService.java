package uk.co.matchboard.app.service;

import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.config.ConfigItem;
import uk.co.matchboard.app.model.config.CreateCustomer;
import uk.co.matchboard.app.model.config.KeyValuePair;

public interface AuxiliaryService {

    Result<ConfigItem> getCustomers();

    Result<ConfigItem> getCarriers();

    Result<KeyValuePair> createCustomer(CreateCustomer customer);
}
