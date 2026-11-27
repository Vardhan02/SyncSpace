-- houses.verified stays the badge (only verified listings reach tenants), these track the check itself
-- for the landlord. verification_status is null until the listing has photos to check.
CREATE TYPE public.verification_status AS ENUM ('pending', 'verified', 'failed');

ALTER TABLE public.houses
    ADD COLUMN verification_status       public.verification_status,
    ADD COLUMN verification_note         TEXT,
    ADD COLUMN verification_requested_at TIMESTAMPTZ;
