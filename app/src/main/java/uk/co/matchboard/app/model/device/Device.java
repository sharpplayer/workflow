package uk.co.matchboard.app.model.device;

import java.util.List;

public record Device(String deviceId, List<String> users, boolean passwordReset, String primaryRole) {

    DeviceCookie getDeviceCookie() {
        return new DeviceCookie(deviceId);
    }

}
