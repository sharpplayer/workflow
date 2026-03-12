package uk.co.matchboard.app.service;

import static uk.co.matchboard.app.functional.Result.toOptionalResult;

import java.util.Collections;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import uk.co.matchboard.app.functional.OptionalResult;
import uk.co.matchboard.app.model.Device;
import uk.co.matchboard.app.model.LoginOptions;
import uk.co.matchboard.app.model.LoginUser;
import uk.co.matchboard.app.model.SessionUsers;

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
        return getDevice(id).orElseGet(
                () -> new Device(UUID.randomUUID().toString(), Collections.emptyList(),
                        SessionServiceImpl.MODE_NONE));
    }

    @Override
    public Optional<Device> getDevice(String id) {
        if (id != null && !id.isBlank()) {
            SessionUsers deviceUsers = sessionService.getUsersOn(id);
            return Optional.of(new Device(id, deviceUsers.users(), deviceUsers.mode()));
        }
        return Optional.empty();
    }

    @Override
    public OptionalResult<Device> registerSession(String id, LoginUser loginUser) {
        return toOptionalResult(
                sessionService.startSession(id, loginUser.username(), loginUser.password(),
                        loginUser.admin()).map(_ -> getDevice(id)));
    }

    @Override
    public LoginOptions getOptions(String deviceId, String user) {
        boolean loggedIn = getDevice(deviceId)
                .map(device -> device.users().contains(user)).orElse(false);
        return userService.getOptions(user, loggedIn);
    }
}
