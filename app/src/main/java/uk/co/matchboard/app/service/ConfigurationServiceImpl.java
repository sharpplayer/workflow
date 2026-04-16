package uk.co.matchboard.app.service;

import java.lang.reflect.Method;
import java.util.Arrays;
import org.springframework.stereotype.Service;
import uk.co.matchboard.app.exception.UnknownConfigException;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.functional.TryUtils;
import uk.co.matchboard.app.model.config.Config;
import uk.co.matchboard.app.model.config.ConfigResponse;
import uk.co.matchboard.app.model.config.KeyValuePair;
import uk.co.matchboard.app.model.product.Product;

@Service
public class ConfigurationServiceImpl implements ConfigurationService {

    public static final int INPUT_JOB_CREATE = 1;
    public static final int INPUT_JOB_START = 2;
    public static final int INPUT_PHASE_RUN = 3;

    private final DatabaseService databaseService;

    public ConfigurationServiceImpl(DatabaseService databaseService) {
        this.databaseService = databaseService;
    }

    public ConfigResponse getListConfig(String config, String value, String type) {
        return new ConfigResponse(config,
                Arrays.stream(value.split(",")).map(v -> new KeyValuePair(v, v)).toList(), type);
    }

    @Override
    public Result<ConfigResponse> getConfig(String config) {
        return databaseService.findConfig(config).fold(
                this::convertItem,
                Result::failure,
                () -> Result.failure(new UnknownConfigException(config.toUpperCase())));

    }

    private Result<ConfigResponse> convertItem(Config item) {
        if (item.type().equals("string[]") || item.type().equals("colour[]")) {
            return Result.of(getListConfig(item.name(), item.value(), item.type()));
        }
        return Result.failure(new UnknownConfigException(
                item.name().toUpperCase() + " type not supported:" + item.type()));
    }

    @Override
    public String resolveConfig(Product product, String config, int input) {
        if (config.startsWith("PRODUCT(")) {
            String prop = config.substring(8, config.length() - 1);
            if (prop.equals("format")) {
                if (product.width() > product.length()) {
                    return "PORTRAIT";
                } else {
                    return "LANDSCAPE";
                }
            }
            return TryUtils.tryCatch(() -> {
                Method accessor = Product.class.getMethod(prop);
                return accessor.invoke(product);
            }).fold(Object::toString, _ -> getDefaultInput(input));
        }

        return getDefaultInput(input);
    }

    private static String getDefaultInput(int input) {
        if (input == INPUT_PHASE_RUN) {
            return "(Input At Phase)";
        } else if (input == INPUT_JOB_START) {
            return "(Input At Job Start)";
        } else if (input == INPUT_JOB_CREATE) {
            return "(Input At Job Create)";
        }
        return "(Unexpected Input " + input + ")";
    }

}
