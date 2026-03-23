package uk.co.matchboard.app.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import uk.co.matchboard.app.exception.ExceptionHandler;
import uk.co.matchboard.app.model.user.CreateUser;
import uk.co.matchboard.app.model.user.UpdateUser;
import uk.co.matchboard.app.service.UserService;

@RestController
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestBody CreateUser user) {
        return userService.registerUser(user.username(), user.password(), user.roles())
                .fold(_ -> ResponseEntity.ok().build(), ExceptionHandler::toResponse);
    }

    @PatchMapping("/users")
    public ResponseEntity<?> updateUser(@RequestBody UpdateUser user) {
        return userService.updateUser(user.username(), user.password(), user.roles(), user.pinReset(), user.enabled())
                .fold(_ -> ResponseEntity.ok().build(), ExceptionHandler::toResponse);
    }

    @GetMapping("/users")
    public ResponseEntity<?> getUsers() {
        return userService.getUsers()
                .fold(ResponseEntity::ok, ExceptionHandler::toResponse);
    }

}
