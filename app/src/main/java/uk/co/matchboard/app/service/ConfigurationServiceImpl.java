package uk.co.matchboard.app.service;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.apache.commons.text.similarity.JaroWinklerSimilarity;
import org.springframework.stereotype.Service;
import uk.co.matchboard.app.exception.UnknownConfigException;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.functional.TryUtils;
import uk.co.matchboard.app.model.config.Config;
import uk.co.matchboard.app.model.config.ConfigResponse;
import uk.co.matchboard.app.model.config.ConfigValuePair;
import uk.co.matchboard.app.model.config.KeyValuePair;
import uk.co.matchboard.app.model.product.Product;

@Service
public class ConfigurationServiceImpl implements ConfigurationService {

    private static final double POSSIBLE_TYPO_THRESHOLD = 0.85;
    private static final double AUTO_MATCH_THRESHOLD = 0.92;

    public static final int INPUT_JOB_CREATE = 1;
    public static final int INPUT_JOB_START = 2;
    public static final int INPUT_PHASE_RUN = 3;
    public static final List<String> BOOLEANS = Arrays.asList("", "Y", "y", "Yes", "YES", "True",
            "true",
            "T");

    private final DatabaseService databaseService;

    private final JaroWinklerSimilarity similarity = new JaroWinklerSimilarity();

    public ConfigurationServiceImpl(DatabaseService databaseService) {
        this.databaseService = databaseService;
    }

    @Override
    public Result<ConfigResponse> getListConfig(String config, String value, String type) {
        Result<List<KeyValuePair>> roles = Result.of(new ArrayList<>());
        if (config.equals("ROLES")) {
            roles = databaseService.getAllMachines().map(
                    l -> l.stream().map(machine -> new KeyValuePair(machine.name(), machine.name()))
                            .collect(Collectors.toCollection(ArrayList::new)));
        }
        return roles.map(list -> new ConfigResponse(
                config,
                Stream.concat(
                        list.stream(),
                        Arrays.stream(value.split(","))
                                .map(v -> new KeyValuePair(v, v))
                ).toList(),
                type
        ));
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
            return getListConfig(item.name(), item.value(), item.type());
        }
        return Result.failure(new UnknownConfigException(
                item.name().toUpperCase() + " type not supported:" + item.type()));
    }

    @Override
    public ConfigValuePair resolveConfig(Product product, String config, int input) {
        if (config.startsWith("CHECK(")) {
            ConfigValuePair resolve = resolveConfig(product,
                    config.substring(6, config.length() - 1), input);
            return new ConfigValuePair("CHECK(" + resolve.value() + ")", resolve.value());
        } else if (config.startsWith("PRODUCT(")) {
            String prop = config.substring(8, config.length() - 1);
            if (prop.equals("format")) {
                if (product.width() > product.length()) {
                    return new ConfigValuePair(config, "PORTRAIT");
                } else {
                    return new ConfigValuePair(config, "LANDSCAPE");
                }
            }
            return TryUtils.tryCatch(() -> {
                Method accessor = Product.class.getMethod(prop);
                return new ConfigValuePair(config, convertToString(accessor.invoke(product)));
            }).fold(i -> i,
                    _ -> new ConfigValuePair(config, getDefaultInput(input)));
        }

        return new ConfigValuePair(config, getDefaultInput(input));
    }

    private String convertToString(Object value) {
        if (value instanceof List list) {
            return list.stream().collect(Collectors.joining(" → ")).toString();
        }
        return value.toString();
    }

    @Override
    public boolean hasPossibleTypos(List<String> productMachines, Set<String> machines) {
        if (productMachines == null || productMachines.isEmpty()) {
            return false;
        }

        if (machines == null || machines.isEmpty()) {
            return false;
        }

        for (String raw : productMachines) {
            if (raw == null || raw.isBlank()) {
                continue;
            }
            if (machines.contains(raw)) {
                continue;
            }

            double bestScore = 0.0;

            for (String existing : machines) {
                Double score = similarity.apply(raw, existing);
                if (score != null && score > bestScore) {
                    bestScore = score;
                }
            }

            if (bestScore >= POSSIBLE_TYPO_THRESHOLD && bestScore < AUTO_MATCH_THRESHOLD) {
                return true;
            }
        }

        return false;
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
