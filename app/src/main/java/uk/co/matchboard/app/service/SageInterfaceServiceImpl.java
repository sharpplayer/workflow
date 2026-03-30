package uk.co.matchboard.app.service;

import com.fasterxml.jackson.databind.MappingIterator;
import com.fasterxml.jackson.dataformat.csv.CsvMapper;
import com.fasterxml.jackson.dataformat.csv.CsvSchema;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.functional.TryUtils;
import uk.co.matchboard.app.model.config.KeyValuePair;
import uk.co.matchboard.app.model.sage.SageProduct;

@Service
public class SageInterfaceServiceImpl implements SageInterfaceService {

    private final CsvMapper mapper = new CsvMapper();

    private final ConfigurationService configService;

    public SageInterfaceServiceImpl(ConfigurationService configService) {
        this.configService = configService;
    }

    @SuppressWarnings("unchecked")
    @Override
    public Result<List<SageProduct>> readProductsFromFile(String csvFile) {

        return TryUtils.tryCatchResult(() -> {
            try (InputStream inputStream = new FileInputStream(csvFile)) {
                CsvSchema schema = CsvSchema.emptySchema().withHeader();

                MappingIterator<Map<String, String>> it = mapper
                        .readerFor(Map.class)
                        .with(schema)
                        .readValues(inputStream);

                return configService.getConfig("SAGECSV")
                        .map(config -> ((List<KeyValuePair>) config.value()).stream()
                                .map(s -> s.value().split("=", 2))        // split on first '=' only
                                .filter(arr -> arr.length == 2)
                                .collect(Collectors.toMap(
                                        arr -> arr[0].trim(),
                                        arr -> arr[1].trim()
                                ))).flatMapTry(headerMapping ->

                                Result.sequence(it.readAll().stream()
                                        .map(row -> SageProduct.fromMap(row, headerMapping)).toList()));

            }
        });
    }
}
