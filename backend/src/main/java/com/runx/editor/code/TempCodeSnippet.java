package com.runx.editor.code;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "temp_code_snippets")
public class TempCodeSnippet {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    @Column(columnDefinition = "TEXT")
    private String code;
    private String language;
    private Long userId;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;

    public TempCodeSnippet() {}

    public TempCodeSnippet(String code, String language, Long userId) {
        this.code = code;
        this.language = language;
        this.userId = userId;
        this.createdAt = LocalDateTime.now();
        this.expiresAt = this.createdAt.plusMinutes(10);
    }

    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }
}