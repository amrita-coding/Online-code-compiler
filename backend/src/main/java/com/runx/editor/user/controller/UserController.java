package com.runx.editor.user.controller;

import com.runx.editor.user.dto.RegistrationRequest;
import com.runx.editor.user.dto.RegistrationResponse;
import com.runx.editor.user.dto.LoginRequest;
import com.runx.editor.user.dto.LoginResponse;
import com.runx.editor.config.JwtUtil;
import com.runx.editor.config.TokenBlacklist;
import com.runx.editor.user.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class UserController {

    private final UserService userService;
    private final JwtUtil jwtUtil;
    private final TokenBlacklist tokenBlacklist;

    public UserController(UserService userService, JwtUtil jwtUtil, TokenBlacklist tokenBlacklist) {
        this.userService = userService;
        this.jwtUtil = jwtUtil;
        this.tokenBlacklist = tokenBlacklist;
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

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req) {
        try {
            LoginResponse res = userService.authenticate(req);
            String token = jwtUtil.generateToken(String.valueOf(res.getId()));
            return ResponseEntity.ok().header("Authorization", "Bearer " + token).body(res);
        } catch (IllegalArgumentException ex) {
            String code = ex.getMessage();
            if ("invalid_credentials".equals(code)) {
                return ResponseEntity.status(401).body("invalid credentials");
            }
            return ResponseEntity.badRequest().body(ex.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("internal_error");
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader(value = "Authorization", required = false) String auth) {
        if (auth == null || !auth.startsWith("Bearer ")) {
            return ResponseEntity.badRequest().body("missing_token");
        }
        String token = auth.substring(7);
        tokenBlacklist.blacklist(token);
        return ResponseEntity.ok("logged_out");
    }
}
