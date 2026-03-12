package uk.co.matchboard.app.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import uk.co.matchboard.app.model.Device;
import uk.co.matchboard.app.service.DeviceService;

@RestController
public class DeviceController {

    private DeviceService deviceService;

    DeviceController(DeviceService deviceService) {
        this.deviceService = deviceService;
    }

    private static final String DEVICE_COOKIE = "device_id";

    @PostMapping("/device")
    public ResponseEntity<Device> registerDevice(
            @CookieValue(value = DEVICE_COOKIE, required = false) String deviceId) {

        Device device = deviceService.registerDevice(deviceId);

        ResponseCookie cookie = ResponseCookie.from(DEVICE_COOKIE, device.deviceId())
                .httpOnly(true)
                .secure(true)
                .path("/")
                .sameSite("Strict")
                .build();

        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, cookie.toString()).body(device);
    }
}
