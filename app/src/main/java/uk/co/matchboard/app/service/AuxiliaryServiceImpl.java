package uk.co.matchboard.app.service;

import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.config.Carrier;
import uk.co.matchboard.app.model.config.ConfigResponse;
import uk.co.matchboard.app.model.config.CreateCarrier;
import uk.co.matchboard.app.model.config.CreateCustomer;
import uk.co.matchboard.app.model.config.Customer;
import uk.co.matchboard.app.model.config.KeyValuePair;

@Service
public class AuxiliaryServiceImpl implements AuxiliaryService {

    public static final String CONFIG_CUSTOMER = "CUSTOMER";

    public static final String CONFIG_CARRIER = "CARRIER";

    private final DatabaseService databaseService;

    public AuxiliaryServiceImpl(DatabaseService databaseService) {
        this.databaseService = databaseService;
    }

    @Override
    public Result<ConfigResponse> getCustomers() {
        return databaseService.getCustomers().map(list -> new ConfigResponse(CONFIG_CUSTOMER, list.stream()
                .map(AuxiliaryServiceImpl::getCustomerKeyPair), "string[]"));
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
        return databaseService.getCarriers().map(list -> new ConfigResponse(CONFIG_CARRIER, list.stream()
                .map(c -> new KeyValuePair(Integer.toString(c.id()),
                        c.name() + " (" + c.code() + ")")), "string[]"));
    }

    @Override
    public Result<KeyValuePair> createCustomer(CreateCustomer customer) {
        return databaseService.createCustomer(customer).map(AuxiliaryServiceImpl::getCustomerKeyPair);
    }

    @Override
    public Result<KeyValuePair> createCarrier(CreateCarrier carrier) {
        return databaseService.createCarrier(carrier).map(AuxiliaryServiceImpl::getCarrierKeyPair);
    }
}
