package uk.co.matchboard.app.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.BiFunction;
import java.util.function.Function;
import org.springframework.dao.TransientDataAccessException;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import uk.co.matchboard.app.functional.OptionalResult;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.config.Carrier;
import uk.co.matchboard.app.model.config.Config;
import uk.co.matchboard.app.model.config.ConfigValuePair;
import uk.co.matchboard.app.model.config.CreateCarrier;
import uk.co.matchboard.app.model.config.Customer;
import uk.co.matchboard.app.model.job.CreateJob;
import uk.co.matchboard.app.model.job.CreateJobPart;
import uk.co.matchboard.app.model.job.CreateJobPartPhase;
import uk.co.matchboard.app.model.job.CreateScheduledJobPart;
import uk.co.matchboard.app.model.job.Job;
import uk.co.matchboard.app.model.job.JobPartParam;
import uk.co.matchboard.app.model.job.JobView;
import uk.co.matchboard.app.model.job.JobWithOnePart;
import uk.co.matchboard.app.model.job.SchedulableJobPart;
import uk.co.matchboard.app.model.job.ScheduledJobPartParam;
import uk.co.matchboard.app.model.job.ScheduledJobPartView;
import uk.co.matchboard.app.model.product.CreatePhase;
import uk.co.matchboard.app.model.product.Machine;
import uk.co.matchboard.app.model.product.Phase;
import uk.co.matchboard.app.model.product.PhaseParam;
import uk.co.matchboard.app.model.product.PhaseParamEvaluatorInput;
import uk.co.matchboard.app.model.product.PhasesUpdate;
import uk.co.matchboard.app.model.product.Product;
import uk.co.matchboard.app.model.user.User;

public interface DatabaseService {

     enum SignStatus {
        SIGN_PHASE,
        SIGN_SCHEDULE_START,
        SIGN_SCHEDULE_FINISH
    }

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

    Result<Customer> createCustomer(Customer customer);

    Result<Carrier> createCarrier(CreateCarrier carrier);

    Result<Job> createJob(CreateJob job, Function<CreateJobPart, Integer> partStatusProvider,
            BiFunction<CreateJobPartPhase, Integer, Integer> phaseStatusProvider, int jobStatus);

    Result<List<SchedulableJobPart>> getUnscheduled();

    Result<List<SchedulableJobPart>> getSchedulable();

    Result<Boolean> createSchedule(List<CreateScheduledJobPart> jobPartIds,
            Function<PhaseParamEvaluatorInput, ConfigValuePair> evaluator);

    OptionalResult<Job> findJob(int jobId);

    Result<List<ScheduledJobPartParam>> getScheduleForRole(OffsetDateTime from, OffsetDateTime to);

    Result<List<ScheduledJobPartView>> getScheduleForMachine(int machineId,
            LocalDate fromDate,
            LocalDate toDate);

    OptionalResult<JobWithOnePart> completePhasesAndStart(List<Integer> phasesToMarkDone,
            Integer jobPhaseId);

    OptionalResult<Customer> findCustomer(int customerId);

    OptionalResult<Carrier> findCarrier(int carrierId);

    Result<Boolean> signOff(Map<Integer, String> signOffParams, SignStatus status);

    Result<List<JobPartParam>> getJobPartParams(Integer paramId);

    Result<Customer> updateCustomer(Customer customer);

    Result<List<Machine>> getAllMachines();

    Result<List<JobView>> getJobs(Long toNumber, int count);

    int getMachine(String role);
}
