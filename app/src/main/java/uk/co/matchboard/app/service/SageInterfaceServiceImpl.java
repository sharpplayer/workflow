package uk.co.matchboard.app.service;

import com.fasterxml.jackson.databind.MappingIterator;
import com.fasterxml.jackson.dataformat.csv.CsvMapper;
import com.fasterxml.jackson.dataformat.csv.CsvSchema;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.functional.TryUtils;
import uk.co.matchboard.app.model.sage.SageCustomer;
import uk.co.matchboard.app.model.sage.SageProduct;

@Service
public class SageInterfaceServiceImpl implements SageInterfaceService {

    private final CsvMapper mapper = new CsvMapper();

    private final ConfigurationService configService;

    private List<SageProduct> cachedProducts;
    private String cachedProductFile;
    private long cachedProductLastModified = -1L;

    private List<SageCustomer> cachedCustomers;
    private String cachedCustomerFile;
    private long cachedCustomerLastModified = -1L;

    public SageInterfaceServiceImpl(ConfigurationService configService) {
        this.configService = configService;
    }

    @Override
    public synchronized Result<List<SageProduct>> readProductsFromFile(String csvFile) {
        return configService.getConfig("DATA").flatMap(folder ->
                TryUtils.tryCatchResult(() -> {
                    File file = new File(folder.value() + csvFile);
                    long lastModified = file.lastModified();

                    if (cachedProducts != null
                            && csvFile.equals(cachedProductFile)
                            && lastModified <= cachedProductLastModified) {
                        return Result.of(cachedProducts);
                    }

                    try (InputStream inputStream = new FileInputStream(file)) {
                        CsvSchema schema = CsvSchema.emptySchema().withHeader();

                        MappingIterator<Map<String, String>> it = mapper
                                .readerFor(Map.class)
                                .with(schema)
                                .readValues(inputStream);

                        Result<List<SageProduct>> result = configService.getConfigMap("PRODUCTCSV")
                                .flatMapTry(headerMapping ->
                                        Result.sequence(it.readAll().stream()
                                                .map(row -> SageProduct.fromMap(row, headerMapping))
                                                .toList()));

                        result.ifSuccess(products -> {
                            cachedProducts = products;
                            cachedProductFile = csvFile;
                            cachedProductLastModified = lastModified;
                        });

                        return result;
                    }
                }));
    }

    @Override
    public synchronized Result<List<SageCustomer>> readCustomersFromFile(String csvFile) {
        return configService.getConfig("DATA").flatMap(folder ->
                TryUtils.tryCatchResult(() -> {
                    File file = new File(folder.value() + csvFile);
                    long lastModified = file.lastModified();

                    if (cachedCustomers != null
                            && csvFile.equals(cachedCustomerFile)
                            && lastModified <= cachedCustomerLastModified) {
                        return Result.of(cachedCustomers);
                    }

                    try (InputStream inputStream = new FileInputStream(file)) {
                        CsvSchema schema = CsvSchema.emptySchema().withHeader();

                        MappingIterator<Map<String, String>> it = mapper
                                .readerFor(Map.class)
                                .with(schema)
                                .readValues(inputStream);

                        Result<List<SageCustomer>> result = configService.getConfigMap(
                                        "CUSTOMERCSV")
                                .flatMapTry(headerMapping ->
                                        Result.sequence(it.readAll().stream()
                                                .map(row -> SageCustomer.fromMap(row,
                                                        headerMapping))
                                                .toList()));

                        result.ifSuccess(customers -> {
                            cachedCustomers = customers;
                            cachedCustomerFile = csvFile;
                            cachedCustomerLastModified = lastModified;
                        });

                        return result;
                    }
                }));
    }
}