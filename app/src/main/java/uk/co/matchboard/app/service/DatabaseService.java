package uk.co.matchboard.app.service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.function.BiFunction;
import java.util.function.Function;
import uk.co.matchboard.app.functional.OptionalResult;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.config.Carrier;
import uk.co.matchboard.app.model.config.Config;
import uk.co.matchboard.app.model.config.CreateCarrier;
import uk.co.matchboard.app.model.config.CreateCustomer;
import uk.co.matchboard.app.model.config.Customer;
import uk.co.matchboard.app.model.job.CreateJob;
import uk.co.matchboard.app.model.job.CreateJobPart;
import uk.co.matchboard.app.model.job.CreateJobPartPhase;
import uk.co.matchboard.app.model.job.Job;
import uk.co.matchboard.app.model.product.CreatePhase;
import uk.co.matchboard.app.model.product.Phase;
import uk.co.matchboard.app.model.product.PhaseParam;
import uk.co.matchboard.app.model.product.PhasesUpdate;
import uk.co.matchboard.app.model.product.Product;
import uk.co.matchboard.app.model.user.User;

public interface DatabaseService {

    OptionalResult<User> findUser(String user);

    Result<User> createUser(User user);

    OptionalResult<Config> findConfig(String config);

    Result<User> updateUser(User user);

    Result<List<User>> getUsers();

    Result<List<Product>> getProducts();

    Result<Product> createProduct(Product product);

    Result<Product> updateProduct(Product product);

    Result<List<PhaseParam>> updatePhases(PhasesUpdate phasesUpdate);

    Result<List<PhaseParam>> getPhases(int productId);

    Result<List<PhaseParam>> getPhases();

    Result<String> getPhaseName(int phaseId);

    OptionalResult<Product> findProduct(int productId);

    Result<List<PhaseParam>> getPhaseParams(int phaseId, String phaseName);

    Result<Phase> createPhase(CreatePhase phase);

    Result<List<Customer>> getCustomers();

    Result<List<Carrier>> getCarriers();

    Result<Customer> createCustomer(CreateCustomer customer);

    Result<Carrier> createCarrier(CreateCarrier carrier);

    Result<Job> createJob(CreateJob job, Function<CreateJobPart, Integer> partStatusProvider,
            BiFunction<CreateJobPartPhase, Integer, Integer> phaseStatusProvider, int jobStatus);

    Result<List<OffsetDateTime>> getScheduleDates();
}
