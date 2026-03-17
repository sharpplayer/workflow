package uk.co.matchboard.app.service;

import java.util.Arrays;
import org.springframework.stereotype.Service;
import uk.co.matchboard.app.exception.UnknownConfigException;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.Config;
import uk.co.matchboard.app.model.ConfigItem;

@Service
public class ConfigurationServiceImpl implements ConfigurationService {

    private final DatabaseService databaseService;

    public ConfigurationServiceImpl(DatabaseService databaseService) {
        this.databaseService = databaseService;
    }

    public ConfigItem getListConfig(String config, String value) {
        return new ConfigItem(config, Arrays.stream(value.split(",")).toList());
    }

    @Override
    public Result<ConfigItem> getConfig(String config) {
        return databaseService.findConfig(config.toUpperCase()).fold(
                this::convertItem,
                Result::failure,
                () -> Result.failure(new UnknownConfigException(config.toUpperCase()))
        );
    }

    private Result<ConfigItem> convertItem(Config item) {
        if (item.type().equals("string[]")) {
            return Result.of(getListConfig(item.name(), item.value()));
        }
        return Result.failure(new UnknownConfigException(
                item.name().toUpperCase() + " type not supported:" + item.type()));
    }
}
