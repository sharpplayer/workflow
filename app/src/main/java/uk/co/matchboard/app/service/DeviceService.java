package uk.co.matchboard.app.service;

import java.util.Optional;
import uk.co.matchboard.app.functional.OptionalResult;
import uk.co.matchboard.app.model.Device;
import uk.co.matchboard.app.model.LoginOptions;
import uk.co.matchboard.app.model.LoginUser;

public interface DeviceService {

    Device registerDevice(String id);

    Optional<Device> getDevice(String id);

    OptionalResult<Device> registerSession(String id, LoginUser loginUser);

    LoginOptions getOptions(String deviceId, String username);
}
