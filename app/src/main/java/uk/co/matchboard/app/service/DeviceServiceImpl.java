package uk.co.matchboard.app.service;

import static uk.co.matchboard.app.functional.Result.toOptionalResult;

import java.util.Collections;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import uk.co.matchboard.app.functional.OptionalResult;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.device.Device;
import uk.co.matchboard.app.model.job.JobWithOnePart;
import uk.co.matchboard.app.model.product.PhaseSignOff;
import uk.co.matchboard.app.model.session.SessionUsers;
import uk.co.matchboard.app.model.user.CredentialsProvider;
import uk.co.matchboard.app.model.user.LoginOptions;
import uk.co.matchboard.app.model.user.LoginUser;
import uk.co.matchboard.app.model.wastage.CreateWastage;
import uk.co.matchboard.app.model.wastage.WastageView;
import uk.co.matchboard.app.model.wastage.Wastages;

@Service
public class DeviceServiceImpl implements DeviceService {

    private final SessionService sessionService;

    private final UserService userService;

    private final JobService jobService;

    private final WastageService wastageService;

    public DeviceServiceImpl(SessionService sessionService, UserService userService,
            JobService jobService, WastageService wastageService) {
        this.sessionService = sessionService;
        this.userService = userService;
        this.jobService = jobService;
        this.wastageService = wastageService;
    }

    @Override
    public Device registerDevice(String id) {
        return getDevice(id, false).orElseGet(
                () -> new Device(UUID.randomUUID().toString(), Collections.emptyList(),
                        false));
    }

    private Optional<Device> getDevice(String id, boolean passwordReset) {
        if (id != null && !id.isBlank()) {
            SessionUsers deviceUsers = sessionService.getUsersOn(id);
            return Optional.of(
                    new Device(id, deviceUsers.users(), passwordReset));
        }
        return Optional.empty();
    }

    @Override
    public OptionalResult<Device> registerSession(String id, LoginUser loginUser) {
        Device device = registerDevice(id);
        if (device.users().isEmpty()) {
            return toOptionalResult(
                    sessionService.startSession(device.deviceId(), loginUser.username(),
                                    loginUser.password(),
                                    loginUser.role())
                            .map(s -> getDevice(device.deviceId(), s.passwordReset())));
        }
        return OptionalResult.of(device);
    }

    @Override
    public LoginOptions getOptions(String deviceId, String user) {
        boolean loggedIn = getDevice(deviceId, false)
                .map(device -> device.users().stream().anyMatch(i -> i.user().equals(user)))
                .orElse(false);
        return userService.getOptions(user, loggedIn);
    }

    @Override
    public OptionalResult<Device> deleteSession(String deviceId, String username) {
        return sessionService.endSession(deviceId, username)
                .map(_ -> getDevice(deviceId, false).orElse(null));
    }

    @Override
    public OptionalResult<Device> deleteSessions(String deviceId) {
        return sessionService.endSessions(deviceId)
                .map(_ -> getDevice(deviceId, false).orElse(null));
    }

    @Override
    public Result<WastageView> createWastage(String deviceId, CreateWastage wastage) {
        getDevice(deviceId, false);
        return wastageService.createWastage(wastage);
    }

    @Override
    public Result<Wastages> getWastage(String deviceId, int jobPhaseId) {
        getDevice(deviceId, false);
        return wastageService.getWastage(jobPhaseId);
    }

    @Override
    public OptionalResult<Device> updatePassword(String deviceId, LoginUser loginUser) {
        if (loginUser.pin()) {
            return toOptionalResult(
                    userService.updatePin(loginUser.username(), loginUser.password())
                            .map(_ -> getDevice(deviceId, false)));
        }
        return toOptionalResult(
                userService.updatePassword(loginUser.username(), loginUser.password())
                        .map(_ -> getDevice(deviceId, false)));
    }

    @Override
    public OptionalResult<JobWithOnePart> signOff(String deviceId, PhaseSignOff completion) {
        getDevice(deviceId, false);
        return validateUser(completion).flatMapOptional(_ -> jobService.signOff(completion));
    }

    private Result<Boolean> validateUser(CredentialsProvider userCredentials) {
        if (userCredentials.pin()) {
            return userService.validatePin(userCredentials.user(), userCredentials.password());
        } else {
            return userService.login(userCredentials.user(), userCredentials.password(),
                            userCredentials.role())
                    .map(_ -> true);
        }

    }
}
