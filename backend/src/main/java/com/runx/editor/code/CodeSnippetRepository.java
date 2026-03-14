package com.runx.editor.code;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CodeSnippetRepository extends JpaRepository<CodeSnippet, String> {
    List<CodeSnippet> findByUserId(Long userId);
}