package uk.co.matchboard.app.service;

import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.ConfigItem;

public interface ConfigurationService {

    Result<ConfigItem> getConfig(String config);
}
