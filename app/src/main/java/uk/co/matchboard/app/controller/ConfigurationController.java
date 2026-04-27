package uk.co.matchboard.app.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import uk.co.matchboard.app.exception.ExceptionHandler;
import uk.co.matchboard.app.model.config.CreateCarrier;
import uk.co.matchboard.app.service.AuxiliaryService;
import uk.co.matchboard.app.service.AuxiliaryServiceImpl;
import uk.co.matchboard.app.service.ConfigurationService;
import uk.co.matchboard.app.service.JobService;

@RestController
public class ConfigurationController {

    private final ConfigurationService configurationService;

    private final AuxiliaryService auxiliaryService;

    private final JobService jobService;

    public ConfigurationController(ConfigurationService configurationService,
            AuxiliaryService auxiliaryService, JobService jobService) {
        this.configurationService = configurationService;
        this.auxiliaryService = auxiliaryService;
        this.jobService = jobService;
    }

    @GetMapping("config/{name}")
    public ResponseEntity<?> getValue(@PathVariable String name) {

        String configName = name.toUpperCase();
        var result = switch (configName) {
            case AuxiliaryServiceImpl.CONFIG_MACHINE -> auxiliaryService.getMachines();
            case AuxiliaryServiceImpl.CONFIG_CUSTOMER -> auxiliaryService.getCustomers();
            case AuxiliaryServiceImpl.CONFIG_CARRIER -> auxiliaryService.getCarriers();
            default -> configurationService.getConfig(configName);
        };
        return result.fold(d -> ResponseEntity.ok().body(d),
                ExceptionHandler::toResponse);
    }

    @PostMapping("config/carrier")
    public ResponseEntity<?> createCarrier(@RequestBody CreateCarrier carrier) {
        return auxiliaryService.createCarrier(carrier).fold(d -> ResponseEntity.ok().body(d),
                ExceptionHandler::toResponse);
    }
}
