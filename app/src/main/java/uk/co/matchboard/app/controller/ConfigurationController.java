package uk.co.matchboard.app.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import uk.co.matchboard.app.exception.ExceptionHandler;
import uk.co.matchboard.app.model.config.CreateCustomer;
import uk.co.matchboard.app.service.ConfigurationService;

@RestController
public class ConfigurationController {

    private final ConfigurationService configurationService;

    public ConfigurationController(ConfigurationService configurationService) {
        this.configurationService = configurationService;
    }

    @GetMapping("config/{name}")
    public ResponseEntity<?> getValue(@PathVariable String name) {
        return configurationService.getConfig(name).fold(d -> ResponseEntity.ok().body(d),
                ExceptionHandler::toResponse);
    }

    @PostMapping("config/customer")
    public ResponseEntity<?> createCustomer(@RequestBody CreateCustomer customer) {
        return configurationService.createCustomer(customer).fold(d -> ResponseEntity.ok().body(d),
                ExceptionHandler::toResponse);
    }
}
