package uk.co.matchboard.app.model.device;

import java.util.List;
import uk.co.matchboard.app.model.session.SessionView;

public record Device(String deviceId, List<SessionView> users, boolean passwordReset) {

    DeviceCookie getDeviceCookie() {
        return new DeviceCookie(deviceId);
    }

}
