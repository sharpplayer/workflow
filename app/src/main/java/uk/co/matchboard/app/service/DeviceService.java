package uk.co.matchboard.app.service;

import uk.co.matchboard.app.functional.OptionalResult;
import uk.co.matchboard.app.model.device.Device;
import uk.co.matchboard.app.model.job.JobWithOnePart;
import uk.co.matchboard.app.model.product.PhaseSignOff;
import uk.co.matchboard.app.model.user.LoginOptions;
import uk.co.matchboard.app.model.user.LoginUser;

public interface DeviceService {

    Device registerDevice(String id);

    OptionalResult<Device> registerSession(String id, LoginUser loginUser);

    LoginOptions getOptions(String deviceId, String username);

    OptionalResult<Device> deleteSession(String deviceId, String username);

    OptionalResult<Device> updatePassword(String deviceId, LoginUser loginUser);

    OptionalResult<JobWithOnePart> signOff(String deviceId, PhaseSignOff completion);

    OptionalResult<Device> deleteSessions(String deviceId);
}
