package uk.co.matchboard.app.service;

import org.springframework.stereotype.Service;
import uk.co.matchboard.app.model.Device;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Service
public class DeviceServiceImpl implements DeviceService {

    private final SessionService sessionService;

    public DeviceServiceImpl(SessionService sessionService) {
        this.sessionService = sessionService;
    }

    @Override
    public Device registerDevice(String id) {
        if (id != null && !id.isBlank()) {
            List<String> deviceUsers = sessionService.getUsersOn(id);
            return new Device(id, deviceUsers);
        }
        return new Device(UUID.randomUUID().toString(), Collections.emptyList());
    }
}
