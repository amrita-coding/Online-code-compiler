package com.runx.editor.user.service;

import com.runx.editor.user.User;
import com.runx.editor.user.UserRepository;
import com.runx.editor.user.dto.RegistrationRequest;
import com.runx.editor.user.dto.RegistrationResponse;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional
    public RegistrationResponse register(RegistrationRequest req) {
        if (userRepository.existsByUsername(req.getUsername())) {
            throw new IllegalArgumentException("username_taken");
        }
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new IllegalArgumentException("email_taken");
        }

        String hashed = passwordEncoder.encode(req.getPassword());
        User u = new User(req.getUsername(), req.getEmail(), hashed);
        User saved = userRepository.save(u);
        return new RegistrationResponse(saved.getId(), saved.getUsername(), saved.getEmail());
    }
}
