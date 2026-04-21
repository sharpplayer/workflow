package uk.co.matchboard.app.service;

import static uk.co.matchboard.app.service.ConfigurationServiceImpl.BOOLEANS;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.config.Carrier;
import uk.co.matchboard.app.model.config.ConfigResponse;
import uk.co.matchboard.app.model.config.CreateCarrier;
import uk.co.matchboard.app.model.config.Customer;
import uk.co.matchboard.app.model.config.KeyValuePair;
import uk.co.matchboard.app.model.sage.SageCustomer;

@Service
public class AuxiliaryServiceImpl implements AuxiliaryService {

    public static final String CONFIG_CUSTOMER = "CUSTOMER";

    public static final String CONFIG_CARRIER = "CARRIER";

    public static final String CONFIG_MACHINE = "MACHINE";

    private final DatabaseService databaseService;

    private final SageInterfaceService sageInterfaceService;

    public AuxiliaryServiceImpl(DatabaseService databaseService,
            SageInterfaceService sageInterfaceService) {
        this.databaseService = databaseService;
        this.sageInterfaceService = sageInterfaceService;
    }

    @NonNull
    private static KeyValuePair getCustomerKeyPair(Customer c) {
        return new KeyValuePair(Integer.toString(c.id()),
                c.name() + " (" + c.code() + ")");
    }

    @NonNull
    private static KeyValuePair getCarrierKeyPair(Carrier c) {
        return new KeyValuePair(Integer.toString(c.id()),
                c.name() + " (" + c.code() + ")");
    }

    @Override
    public Result<ConfigResponse> getCarriers() {
        return databaseService.getCarriers()
                .map(list -> new ConfigResponse(CONFIG_CARRIER, list.stream()
                        .map(c -> new KeyValuePair(Integer.toString(c.id()),
                                c.name() + " (" + c.code() + ")")), "string[]"));
    }

    @Override
    public Result<ConfigResponse> getMachines() {
        return databaseService.getAllMachines()
                .map(list -> new ConfigResponse(CONFIG_MACHINE, list, "machine[]"));
    }

    private Result<Customer> createCustomer(SageCustomer customer) {
        return Result.of(new Customer(
                0,
                customer.code(),
                customer.name(),
                customer.zone(),
                customer.contact(),
                customer.contactNumber(),
                BOOLEANS.contains(customer.proforma()),
                BOOLEANS.contains(customer.enabled())
        ));
    }

    @Override
    public Result<KeyValuePair> createCarrier(CreateCarrier carrier) {
        return databaseService.createCarrier(carrier).map(AuxiliaryServiceImpl::getCarrierKeyPair);
    }

    @Override
    public Result<ConfigResponse> getCustomers() {
        Result<List<SageCustomer>> sageResult = sageInterfaceService.readCustomersFromFile(
                "customers.csv");
        Result<List<Customer>> dbResult = databaseService.getCustomers();

        AtomicBoolean changeFlag = new AtomicBoolean(false);
        Result<List<Customer>> updateResult = sageResult.flatMap(sageList ->
                dbResult.flatMap(dbList -> {

                    Map<String, Customer> dbMap = dbList.stream()
                            .collect(Collectors.toMap(Customer::code, p -> p));

                    return Result.sequence(sageList.stream()
                            .map(sage -> {
                                Customer existing = dbMap.get(sage.code());
                                Result<Customer> expected = createCustomer(sage);

                                if (existing != null) {
                                    return expected.flatMap(e -> {
                                        if (existing.equalsApartFromId(e)) {
                                            return Result.of(existing);
                                        } else {
                                            changeFlag.set(true);
                                            return databaseService.updateCustomer(
                                                    e.copyWithId(existing.id()));
                                        }
                                    });
                                } else {
                                    changeFlag.set(true);
                                    return expected.flatMap(
                                            databaseService::createCustomer);
                                }
                            })
                            .toList());
                })
        );

        Result<List<Customer>> latest =
                changeFlag.get() ? databaseService.getCustomers() : dbResult;

        return latest.map(list -> list.stream()
                        .map(customer -> new KeyValuePair(
                                Integer.toString(customer.id()),
                                customer.name() + (customer.proforma() ? " (*)" : "")))
                        .sorted(Comparator.comparing(KeyValuePair::value))
                        .toList())
                .map(list -> new ConfigResponse("CUSTOMERS", list, "string[]"));
    }
}
