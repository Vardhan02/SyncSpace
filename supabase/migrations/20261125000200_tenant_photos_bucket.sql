-- Public so the frontend can show photos by URL. Only the backend uploads (with the S3 keys),
-- so no storage policies are needed.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('tenant-photos', 'tenant-photos', TRUE, 5242880, ARRAY['image/jpeg', 'image/png']);
