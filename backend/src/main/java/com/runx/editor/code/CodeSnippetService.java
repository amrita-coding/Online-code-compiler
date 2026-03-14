package com.runx.editor.code;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Optional;
import java.util.List;

@Service
public class CodeSnippetService {

    @Autowired
    private CodeSnippetRepository repository;

    @Autowired
    private S3Service s3Service;

    public CodeSnippet saveCode(String code, String language, Long userId) {
        String s3Link = s3Service.uploadCode(code, language, userId);
        CodeSnippet snippet = new CodeSnippet(code, language, userId, s3Link);
        return repository.save(snippet);
    }

    public Optional<CodeSnippet> getCodeById(String id) {
        return repository.findById(id);
    }

    public List<CodeSnippet> getCodesByUserId(Long userId) {
        return repository.findByUserId(userId);
    }
}