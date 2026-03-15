package com.runx.editor.code;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.model.GetUrlRequest;

import java.util.UUID;

@Service
public class S3Service {

    private final S3Client s3Client;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    public S3Service(S3Client s3Client) {
        this.s3Client = s3Client;
    }

    public String uploadCode(String code, String language, Long userId) {
        String key = "codes/" + userId + "/" + UUID.randomUUID().toString() + ".txt";
        byte[] content = code.getBytes();
        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType("text/plain")
                .build();
        s3Client.putObject(putObjectRequest, RequestBody.fromBytes(content));
        return s3Client.utilities().getUrl(GetUrlRequest.builder().bucket(bucketName).key(key).build()).toString();
    }

    public void deleteCode(String s3Url) {
        // Extract key from URL, e.g., https://bucket.s3.amazonaws.com/codes/userId/uuid.txt -> codes/userId/uuid.txt
        String key = s3Url.substring(s3Url.indexOf("/codes/") + 1);
        DeleteObjectRequest deleteObjectRequest = DeleteObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();
        s3Client.deleteObject(deleteObjectRequest);
    }
}