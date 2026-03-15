package com.runx.editor.code;

import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface TempCodeSnippetRepository extends JpaRepository<TempCodeSnippet, String> {
    List<TempCodeSnippet> findByExpiresAtBefore(LocalDateTime now);
}