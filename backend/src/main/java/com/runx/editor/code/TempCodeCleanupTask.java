package com.runx.editor.code;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class TempCodeCleanupTask {

    @Autowired
    private CodeSnippetService service;

    @Scheduled(fixedRate = 60000) // Run every 1 minute
    public void cleanupExpiredTempCodes() {
        service.deleteExpiredTempCodes();
    }
}