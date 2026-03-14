package com.runx.editor.code;

import com.runx.editor.config.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;
import java.util.List;

@RestController
@RequestMapping("/api/code")
public class CodeController {

    @Autowired
    private CodeSnippetService service;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/save")
    public ResponseEntity<?> saveCode(@RequestBody SaveCodeRequest request, @RequestHeader("Authorization") String token) {
        try {
            String jwt = token.replace("Bearer ", "");
            Long userId = Long.parseLong(jwtUtil.extractUserId(jwt));
            CodeSnippet snippet = service.saveCode(request.getCode(), request.getLanguage(), userId);
            return ResponseEntity.ok(new SaveCodeResponse(snippet.getId()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error saving code");
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getCode(@PathVariable String id) {
        Optional<CodeSnippet> snippet = service.getCodeById(id);
        if (snippet.isPresent()) {
            return ResponseEntity.ok(new GetCodeResponse(snippet.get().getCode(), snippet.get().getLanguage()));
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/user")
    public ResponseEntity<?> getUserCodes(@RequestHeader("Authorization") String token) {
        try {
            String jwt = token.replace("Bearer ", "");
            Long userId = Long.parseLong(jwtUtil.extractUserId(jwt));
            List<CodeSnippet> snippets = service.getCodesByUserId(userId);
            return ResponseEntity.ok(snippets);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error retrieving codes");
        }
    }
}

class SaveCodeRequest {
    private String code;
    private String language;

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
}

class SaveCodeResponse {
    private String id;

    public SaveCodeResponse(String id) { this.id = id; }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
}

class GetCodeResponse {
    private String code;
    private String language;

    public GetCodeResponse(String code, String language) {
        this.code = code;
        this.language = language;
    }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
}