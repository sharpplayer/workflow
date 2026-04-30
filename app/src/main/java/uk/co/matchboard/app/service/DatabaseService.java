package uk.co.matchboard.app.service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.function.BiFunction;
import java.util.function.Function;
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
import uk.co.matchboard.app.model.job.ScheduleForRole;
import uk.co.matchboard.app.model.job.ScheduledJobPartView;
import uk.co.matchboard.app.model.product.CreatePhase;
import uk.co.matchboard.app.model.product.Machine;
import uk.co.matchboard.app.model.product.Phase;
import uk.co.matchboard.app.model.product.PhaseParam;
import uk.co.matchboard.app.model.product.PhaseParamEvaluatorInput;
import uk.co.matchboard.app.model.product.PhasesUpdate;
import uk.co.matchboard.app.model.product.Product;
import uk.co.matchboard.app.model.user.User;
import uk.co.matchboard.app.model.wastage.CreateWastage;
import uk.co.matchboard.app.model.wastage.Wastage;
import uk.co.matchboard.app.model.wastage.WastageView;

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

    Result<List<PhaseParam>> getPhaseParamsForResolving(int phaseId, String phaseName);

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

    Result<ScheduleForRole> getScheduleForRole(LocalDate from,
            LocalDate to);

    Result<List<ScheduledJobPartView>> getScheduleForMachine(int machineId,
            LocalDate fromDate,
            LocalDate toDate);

    OptionalResult<JobWithOnePart> completePhasesAndStart(List<Integer> phasesToMarkDone,
            int jobId, int jobPhaseId, Integer lastJobPhaseUpdated, Integer activePhaseId);

    OptionalResult<JobWithOnePart> getJobWithOnePart(int jobId, int jobPartId,
            Integer completedPhase, Integer activePhaseId);

    OptionalResult<Customer> findCustomer(int customerId);

    OptionalResult<Carrier> findCarrier(int carrierId);

    OptionalResult<JobWithOnePart> signOff(Map<Integer, String> signOffParams, Integer operationId);

    Result<List<JobPartParam>> getJobPartParams(Integer paramId);

    Result<Customer> updateCustomer(Customer customer);

    Result<List<Machine>> getAllMachines();

    Result<List<JobView>> getJobs(Long toNumber, int count);

    int getMachine(String role);

    Result<Wastage> createWastage(int reportedBy, CreateWastage wastage);

    Result<List<WastageView>> getWastage(int jobPhaseId);

    Result<Boolean> createRpi(JobWithOnePart jobWithOnePart, int rpi);
}
