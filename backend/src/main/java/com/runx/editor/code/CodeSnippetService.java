package com.runx.editor.code;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Optional;
import java.util.List;
import java.time.LocalDateTime;

@Service
public class CodeSnippetService {

    @Autowired
    private CodeSnippetRepository repository;

    @Autowired
    private TempCodeSnippetRepository tempRepository;

    @Autowired
    private S3Service s3Service;

    public CodeSnippet saveCode(String code, String language, Long userId) {
        String s3Link = s3Service.uploadCode(code, language, userId);
        CodeSnippet snippet = new CodeSnippet(code, language, userId, s3Link);
        return repository.save(snippet);
    }

    public TempCodeSnippet shareCode(String code, String language, Long userId) {
        TempCodeSnippet snippet = new TempCodeSnippet(code, language, userId);
        return tempRepository.save(snippet);
    }

    public Optional<CodeSnippet> getCodeById(String id) {
        return repository.findById(id);
    }

    public Optional<TempCodeSnippet> getTempCodeById(String id) {
        Optional<TempCodeSnippet> temp = tempRepository.findById(id);
        if (temp.isPresent() && temp.get().getExpiresAt().isAfter(LocalDateTime.now())) {
            return temp;
        }
        return Optional.empty();
    }

    public List<CodeSnippet> getCodesByUserId(Long userId) {
        return repository.findByUserId(userId);
    }
    public boolean deleteCode(String id, Long userId) {
        Optional<CodeSnippet> snippetOpt = repository.findById(id);
        if (snippetOpt.isPresent()) {
            CodeSnippet snippet = snippetOpt.get();
            if (snippet.getUserId().equals(userId)) {
                if (snippet.getS3Link() != null) {
                    s3Service.deleteCode(snippet.getS3Link());
                }
                repository.delete(snippet);
                return true;
            }
        }
        return false;
    }

    public void deleteExpiredTempCodes() {
        List<TempCodeSnippet> expired = tempRepository.findByExpiresAtBefore(LocalDateTime.now());
        tempRepository.deleteAll(expired);
    }
}