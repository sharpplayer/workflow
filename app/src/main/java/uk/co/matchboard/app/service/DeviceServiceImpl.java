package uk.co.matchboard.app.service;

import static uk.co.matchboard.app.functional.Result.toOptionalResult;

import java.util.Collections;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import uk.co.matchboard.app.functional.OptionalResult;
import uk.co.matchboard.app.model.device.Device;
import uk.co.matchboard.app.model.product.PhaseComplete;
import uk.co.matchboard.app.model.session.SessionUsers;
import uk.co.matchboard.app.model.user.LoginOptions;
import uk.co.matchboard.app.model.user.LoginUser;

@Service
public class DeviceServiceImpl implements DeviceService {

    private final SessionService sessionService;

    private final UserService userService;

    public DeviceServiceImpl(SessionService sessionService, UserService userService) {
        this.sessionService = sessionService;
        this.userService = userService;
    }

    @Override
    public Device registerDevice(String id) {
        return getDevice(id, false).orElseGet(
                () -> new Device(UUID.randomUUID().toString(), Collections.emptyList(),
                        SessionServiceImpl.MODE_NONE, false));
    }

    private Optional<Device> getDevice(String id, boolean passwordReset) {
        if (id != null && !id.isBlank()) {
            SessionUsers deviceUsers = sessionService.getUsersOn(id);
            return Optional.of(
                    new Device(id, deviceUsers.users(), deviceUsers.mode(), passwordReset));
        }
        return Optional.empty();
    }

    @Override
    public OptionalResult<Device> registerSession(String id, LoginUser loginUser) {
        return toOptionalResult(
                sessionService.startSession(id, loginUser.username(), loginUser.password(),
                        loginUser.admin()).map(s -> getDevice(id, s.passwordReset())));
    }

    @Override
    public LoginOptions getOptions(String deviceId, String user) {
        boolean loggedIn = getDevice(deviceId, false)
                .map(device -> device.users().contains(user)).orElse(false);
        return userService.getOptions(user, loggedIn);
    }

    @Override
    public OptionalResult<Device> deleteSession(String deviceId, String username) {
        return sessionService.endSession(deviceId, username)
                .map(_ -> getDevice(deviceId, false).orElse(null));
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
    public OptionalResult<Boolean> completePhase(String deviceId, PhaseComplete completion) {
        return OptionalResult.of(true);
    }
}
