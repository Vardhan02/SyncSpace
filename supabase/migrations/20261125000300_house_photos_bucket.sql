-- Same setup as tenant-photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('house-photos', 'house-photos', TRUE, 5242880, ARRAY['image/jpeg', 'image/png']);
