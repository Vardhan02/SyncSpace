-- Enum values and lease lengths from frontend/docs/onboarding-preferences.md.
-- Postgres can't drop enum values, so each type is swapped for a new one.

ALTER TYPE public.room_type RENAME TO room_type_old;
CREATE TYPE public.room_type AS ENUM ('single', 'double', 'ensuite');

ALTER TABLE public.tenant_house_preferences
    ALTER COLUMN room_type TYPE public.room_type
    USING replace(room_type::TEXT, 'en_suite', 'ensuite')::public.room_type;
ALTER TABLE public.houses
    ALTER COLUMN room_type TYPE public.room_type
    USING replace(room_type::TEXT, 'en_suite', 'ensuite')::public.room_type;
DROP TYPE public.room_type_old;

ALTER TYPE public.sleep_schedule RENAME TO sleep_schedule_old;
CREATE TYPE public.sleep_schedule AS ENUM ('early_bird', 'night_owl');

ALTER TABLE public.tenant_lifestyle_preferences
    ALTER COLUMN sleep_schedule TYPE public.sleep_schedule
    USING sleep_schedule::TEXT::public.sleep_schedule;
DROP TYPE public.sleep_schedule_old;

ALTER TYPE public.cleanliness_level RENAME TO cleanliness_level_old;
CREATE TYPE public.cleanliness_level AS ENUM ('very_tidy', 'tidy', 'relaxed');

ALTER TABLE public.tenant_lifestyle_preferences
    ALTER COLUMN cleanliness TYPE public.cleanliness_level
    USING (CASE cleanliness::TEXT WHEN 'average' THEN 'tidy' ELSE cleanliness::TEXT END)::public.cleanliness_level;
DROP TYPE public.cleanliness_level_old;

ALTER TYPE public.work_schedule RENAME TO work_schedule_old;
CREATE TYPE public.work_schedule AS ENUM ('on_campus', 'from_home', 'mixed', 'night_shifts');

ALTER TABLE public.tenant_lifestyle_preferences
    ALTER COLUMN work_schedule TYPE public.work_schedule
    USING (CASE work_schedule::TEXT
               WHEN 'daytime' THEN 'on_campus'
               WHEN 'remote'  THEN 'from_home'
               WHEN 'evening' THEN 'night_shifts'
               ELSE work_schedule::TEXT
           END)::public.work_schedule;
DROP TYPE public.work_schedule_old;

-- frequency was shared by two columns that ask different things,
-- so it's split into guest_frequency (tenants) and guest_policy (houses)
CREATE TYPE public.guest_frequency AS ENUM ('rarely', 'weekends', 'often');
CREATE TYPE public.guest_policy    AS ENUM ('no_overnight', 'weekends', 'welcome');

ALTER TABLE public.tenant_lifestyle_preferences
    ALTER COLUMN guest_frequency TYPE public.guest_frequency
    USING (CASE guest_frequency::TEXT
               WHEN 'never'     THEN 'rarely'
               WHEN 'sometimes' THEN 'weekends'
               ELSE guest_frequency::TEXT
           END)::public.guest_frequency;
ALTER TABLE public.house_preferences
    ALTER COLUMN guest_policy TYPE public.guest_policy
    USING (CASE guest_policy::TEXT
               WHEN 'never'     THEN 'no_overnight'
               WHEN 'rarely'    THEN 'no_overnight'
               WHEN 'sometimes' THEN 'weekends'
               WHEN 'often'     THEN 'welcome'
           END)::public.guest_policy;
DROP TYPE public.frequency;

ALTER TYPE public.tenant_type RENAME TO tenant_type_old;
CREATE TYPE public.tenant_type AS ENUM ('any', 'student', 'professional');

ALTER TABLE public.landlord_preferences ALTER COLUMN preferred_tenants DROP DEFAULT;
ALTER TABLE public.landlord_preferences
    ALTER COLUMN preferred_tenants TYPE public.tenant_type
    USING rtrim(preferred_tenants::TEXT, 's')::public.tenant_type;
ALTER TABLE public.landlord_preferences ALTER COLUMN preferred_tenants SET DEFAULT 'any';
DROP TYPE public.tenant_type_old;

-- lease lengths the forms offer. 6 isn't one of them, closest is 5 (a semester)
UPDATE public.tenant_house_preferences SET lease_months = 5 WHERE lease_months = 6;
UPDATE public.landlord_preferences SET min_lease_months = 5 WHERE min_lease_months = 6;
UPDATE public.house_preferences SET min_lease_months = 5 WHERE min_lease_months = 6;

ALTER TABLE public.tenant_house_preferences
    ADD CONSTRAINT tenant_lease_months_allowed CHECK (lease_months IN (3, 5, 9, 12));
ALTER TABLE public.landlord_preferences
    ADD CONSTRAINT landlord_min_lease_allowed CHECK (min_lease_months IN (1, 3, 5, 9, 12));
ALTER TABLE public.house_preferences
    ADD CONSTRAINT house_min_lease_allowed CHECK (min_lease_months IN (1, 3, 5, 9, 12));

ALTER TABLE public.houses ADD COLUMN description TEXT CHECK (char_length(description) <= 500);
