package com.runx.editor.user.controller;

import com.runx.editor.user.dto.RegistrationRequest;
import com.runx.editor.user.dto.RegistrationResponse;
import com.runx.editor.user.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegistrationRequest req) {
        try {
            RegistrationResponse res = userService.register(req);
            return ResponseEntity.ok(res);
        } catch (IllegalArgumentException ex) {
            String code = ex.getMessage();
            if ("username_taken".equals(code)) {
                return ResponseEntity.badRequest().body("username already taken");
            }
            if ("email_taken".equals(code)) {
                return ResponseEntity.badRequest().body("email already taken");
            }
            return ResponseEntity.badRequest().body(ex.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("internal_error");
        }
    }
}
