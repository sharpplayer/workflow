package uk.co.matchboard.app.service;

import java.util.Arrays;
import org.springframework.stereotype.Service;
import uk.co.matchboard.app.exception.UnknownConfigException;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.config.Config;
import uk.co.matchboard.app.model.config.ConfigItem;
import uk.co.matchboard.app.model.config.CreateCarrier;
import uk.co.matchboard.app.model.config.CreateCustomer;
import uk.co.matchboard.app.model.config.KeyValuePair;

@Service
public class ConfigurationServiceImpl implements ConfigurationService {

    private final DatabaseService databaseService;

    private final AuxiliaryService auxiliaryService;

    public ConfigurationServiceImpl(DatabaseService databaseService,
            AuxiliaryService auxiliaryService) {
        this.databaseService = databaseService;
        this.auxiliaryService = auxiliaryService;
    }

    public ConfigItem getListConfig(String config, String value, String type) {
        return new ConfigItem(config,
                Arrays.stream(value.split(",")).map(v -> new KeyValuePair(v, v)).toList(), type);
    }

    @Override
    public Result<ConfigItem> getConfig(String config) {
        String configName = config.toUpperCase();
        if (configName.equals(AuxiliaryServiceImpl.CONFIG_CUSTOMER)) {
            return auxiliaryService.getCustomers();
        } else if (configName.equals(AuxiliaryServiceImpl.CONFIG_CARRIER)) {
            return auxiliaryService.getCarriers();
        }

        return databaseService.findConfig(configName).fold(
                this::convertItem,
                Result::failure,
                () -> Result.failure(new UnknownConfigException(config.toUpperCase()))
        );
    }

    @Override
    public Result<KeyValuePair> createCustomer(CreateCustomer customer) {
        return auxiliaryService.createCustomer(customer);
    }

    @Override
    public Result<KeyValuePair> createCarrier(CreateCarrier carrier) {
        return auxiliaryService.createCarrier(carrier);
    }

    private Result<ConfigItem> convertItem(Config item) {
        if (item.type().equals("string[]") || item.type().equals("colour[]")) {
            return Result.of(getListConfig(item.name(), item.value(), item.type()));
        }
        return Result.failure(new UnknownConfigException(
                item.name().toUpperCase() + " type not supported:" + item.type()));
    }
}
