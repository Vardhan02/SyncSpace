package com.syncspace.photo;

import java.net.URI;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.checksums.RequestChecksumCalculation;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

@Configuration
public class S3Config {

	@Bean
	S3Client s3(@Value("${s3.endpoint}") String endpoint,
			@Value("${s3.region}") String region,
			@Value("${s3.access-key}") String accessKey,
			@Value("${s3.secret-key}") String secretKey) {
		return S3Client.builder()
				.endpointOverride(URI.create(endpoint))
				.region(Region.of(region))
				.credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey)))
				// Supabase addresses buckets as host/bucket/key, not bucket.host/key
				.forcePathStyle(true)
				// newer SDK versions add checksums that some S3-compatible stores reject
				.requestChecksumCalculation(RequestChecksumCalculation.WHEN_REQUIRED)
				.build();
	}
}
