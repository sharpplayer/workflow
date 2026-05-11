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
import uk.co.matchboard.app.service.UserService;
import uk.co.matchboard.app.service.UserServiceImpl;
import uk.co.matchboard.app.service.WastageService;
import uk.co.matchboard.app.service.WastageServiceImpl;

@RestController
public class ConfigurationController {

    private final ConfigurationService configurationService;

    private final AuxiliaryService auxiliaryService;

    private final UserService userService;

    private final WastageService wastageService;

    public ConfigurationController(ConfigurationService configurationService,
            AuxiliaryService auxiliaryService, UserService userService,
            WastageService wastageService) {
        this.configurationService = configurationService;
        this.auxiliaryService = auxiliaryService;
        this.userService = userService;
        this.wastageService = wastageService;
    }

    @GetMapping("config/{name}")
    public ResponseEntity<?> getValue(@PathVariable String name) {

        String configName = name.toUpperCase();
        var result = switch (configName) {
            case AuxiliaryServiceImpl.CONFIG_MACHINE -> auxiliaryService.getMachines();
            case AuxiliaryServiceImpl.CONFIG_CUSTOMER -> auxiliaryService.getCustomers();
            case AuxiliaryServiceImpl.CONFIG_CARRIER -> auxiliaryService.getCarriers();
            case WastageServiceImpl.CONFIG_WASTAGE_REASON -> wastageService.getWastageReasons();
            default -> {

                if (configName.startsWith(UserServiceImpl.CONFIG_OPERATOR)) {
                    yield userService.getOperators(configName);
                }
                yield configurationService.getConfig(configName);
            }
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
