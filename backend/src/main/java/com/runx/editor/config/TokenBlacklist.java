package com.runx.editor.config;

import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class TokenBlacklist {
    private final Set<String> tokens = Collections.newSetFromMap(new ConcurrentHashMap<>());

    public void blacklist(String token) {
        tokens.add(token);
    }

    public boolean isBlacklisted(String token) {
        return tokens.contains(token);
    }
}
