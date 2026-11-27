-- The VLM service answers straight away with two job ids and the backend polls for the verdict.
-- Kept here so a result is only taken from the jobs of the latest request, even after a restart.
ALTER TABLE public.houses ADD COLUMN verification_job_ids TEXT[];
