package com.syncspace.photo;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;

// The only place that talks to S3 or builds photo urls
@Service
public class PhotoStorage {

	private final S3Client s3;
	private final String publicUrl;

	public PhotoStorage(S3Client s3, @Value("${s3.public-url}") String publicUrl) {
		this.s3 = s3;
		this.publicUrl = publicUrl;
	}

	public String upload(String bucket, String path, byte[] bytes, String contentType) {
		s3.putObject(b -> b.bucket(bucket).key(path).contentType(contentType), RequestBody.fromBytes(bytes));
		return path;
	}

	public void delete(String bucket, String path) {
		s3.deleteObject(b -> b.bucket(bucket).key(path));
	}

	public byte[] read(String bucket, String path) {
		return s3.getObjectAsBytes(b -> b.bucket(bucket).key(path)).asByteArray();
	}

	// the DB only keeps the path, responses need the full url
	public String url(String bucket, String path) {
		return path == null ? null : publicUrl + "/" + bucket + "/" + path;
	}

	// Content-Type comes from the client, so go by the first bytes instead
	public static String imageType(byte[] bytes) {
		if (bytes.length >= 3 && (bytes[0] & 0xff) == 0xff && (bytes[1] & 0xff) == 0xd8 && (bytes[2] & 0xff) == 0xff) {
			return "image/jpeg";
		}
		if (bytes.length >= 4 && (bytes[0] & 0xff) == 0x89 && bytes[1] == 'P' && bytes[2] == 'N' && bytes[3] == 'G') {
			return "image/png";
		}
		return null;
	}

	public static String extension(String imageType) {
		return imageType.equals("image/png") ? "png" : "jpg";
	}
}
