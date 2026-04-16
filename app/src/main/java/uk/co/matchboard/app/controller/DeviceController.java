package uk.co.matchboard.app.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import uk.co.matchboard.app.exception.ExceptionHandler;
import uk.co.matchboard.app.model.device.Device;
import uk.co.matchboard.app.model.product.PhaseSignOff;
import uk.co.matchboard.app.model.user.LoginOptions;
import uk.co.matchboard.app.model.user.LoginUser;
import uk.co.matchboard.app.service.DeviceService;

@RestController
public class DeviceController {

    private final DeviceService deviceService;

    DeviceController(DeviceService deviceService) {
        this.deviceService = deviceService;
    }

    public static final String DEVICE_COOKIE = "device_id";

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

    @PostMapping("/session")
    public ResponseEntity<?> registerSession(
            @CookieValue(value = DEVICE_COOKIE, required = false) String deviceId, @RequestBody
            LoginUser loginUser) {

        return deviceService.registerSession(deviceId, loginUser)
                .fold(d -> ResponseEntity.ok().body(d),
                        ExceptionHandler::toResponse,
                        () -> ResponseEntity.ok().body(registerDevice(deviceId)));
    }

    @PatchMapping("/session")
    public ResponseEntity<?> updatePassword(
            @CookieValue(value = DEVICE_COOKIE, required = false) String deviceId, @RequestBody
            LoginUser loginUser) {

        return deviceService.updatePassword(deviceId, loginUser)
                .fold(d -> ResponseEntity.ok().body(d),
                        ExceptionHandler::toResponse,
                        () -> ResponseEntity.ok().body(registerDevice(deviceId)));
    }

    @DeleteMapping("/session")
    public ResponseEntity<?> deleteAllSessions(
            @CookieValue(value = DEVICE_COOKIE, required = false) String deviceId) {

        return deviceService.deleteSessions(deviceId)
                .fold(d -> ResponseEntity.ok().body(d),
                        ExceptionHandler::toResponse,
                        () -> ResponseEntity.ok().body(registerDevice(deviceId)));
    }

    @DeleteMapping("/session/{username}")
    public ResponseEntity<?> deleteSession(
            @CookieValue(value = DEVICE_COOKIE, required = false) String deviceId, @PathVariable
            String username) {

        return deviceService.deleteSession(deviceId, username)
                .fold(d -> ResponseEntity.ok().body(d),
                        ExceptionHandler::toResponse,
                        () -> ResponseEntity.ok().body(registerDevice(deviceId)));
    }

    @GetMapping("/login-options")
    public ResponseEntity<LoginOptions> loginOptions(
            @CookieValue(value = DeviceController.DEVICE_COOKIE, required = false) String deviceId,
            @RequestParam String username) {
        return ResponseEntity.ok().body(deviceService.getOptions(deviceId, username));
    }

    @PatchMapping("/phase")
    public ResponseEntity<?> completeJob(
            @CookieValue(value = DeviceController.DEVICE_COOKIE, required = false) String deviceId,
            @RequestBody PhaseSignOff completion) {
        return deviceService.signOff(deviceId, completion)
                .fold(ResponseEntity::ok,
                        ExceptionHandler::toResponse, () -> ResponseEntity.noContent().build());
    }
}
