package com.runx.editor.code;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "code_snippets")
public class CodeSnippet {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    @Column(columnDefinition = "TEXT")
    private String code;
    private String language;
    private Long userId; // Associate with user
    private String s3Link; // Link to S3 stored code
    private LocalDateTime createdAt;

    public CodeSnippet() {}

    public CodeSnippet(String code, String language, Long userId, String s3Link) {
        this.code = code;
        this.language = language;
        this.userId = userId;
        this.s3Link = s3Link;
        this.createdAt = LocalDateTime.now();
    }

    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getS3Link() { return s3Link; }
    public void setS3Link(String s3Link) { this.s3Link = s3Link; }
}