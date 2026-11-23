-- =====================================================================
-- SyncSpace initial schema (Supabase / PostgreSQL 15+)
--
-- Identity: Supabase Auth owns accounts and passwords (auth.users).
-- Every person's id everywhere below IS their auth.users.id, so
-- tenants.id = landlords.id = profiles.id = auth.uid() for that person.
--
-- Sign-up must pass metadata, e.g. from the frontend:
--   supabase.auth.signUp({ email, password,
--     options: { data: { name, phone, role: 'tenant' | 'landlord' } } })
-- A trigger turns that into a profiles row.
--
-- Access: every table has Row Level Security. The browser (anon /
-- authenticated keys) only sees what the policies allow. A backend or
-- the matching engine using the service_role key bypasses RLS.
--
-- Design rule: a relationship between two things (tenant likes house,
-- tenant swipes on tenant, house shared in a match) is its own table,
-- one row per relationship, never a list column.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
CREATE TYPE public.user_role          AS ENUM ('tenant', 'landlord');
CREATE TYPE public.room_type          AS ENUM ('single', 'double', 'en_suite', 'studio');
CREATE TYPE public.sleep_schedule     AS ENUM ('early_bird', 'night_owl', 'flexible');
CREATE TYPE public.cleanliness_level  AS ENUM ('relaxed', 'average', 'tidy', 'very_tidy');
CREATE TYPE public.work_schedule      AS ENUM ('daytime', 'evening', 'mixed', 'remote');
CREATE TYPE public.social_level       AS ENUM ('homebody', 'balanced', 'social');
CREATE TYPE public.frequency          AS ENUM ('never', 'rarely', 'sometimes', 'often');
CREATE TYPE public.swipe_direction    AS ENUM ('left', 'right');
CREATE TYPE public.listing_status     AS ENUM ('draft', 'active', 'pending', 'filled');
CREATE TYPE public.application_status AS ENUM ('pending', 'confirmed', 'ignored');
CREATE TYPE public.tenant_type        AS ENUM ('students', 'professionals', 'any');
CREATE TYPE public.rec_source         AS ENUM ('cold_start', 'model');

-- =====================================================================
-- Tables
-- =====================================================================

-- 1. Profiles (shared by tenants and landlords). Email and password
--    live in auth.users. Name and role are public to logged-in users.
CREATE TABLE public.profiles (
    id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name         TEXT             NOT NULL,
    role         public.user_role NOT NULL,
    first_login  BOOLEAN          NOT NULL DEFAULT TRUE,   -- TRUE => onboarding
    created_at   TIMESTAMPTZ      NOT NULL DEFAULT now()
);

-- Private contact details. Readable only by the owner; matches get them
-- through get_my_matches(), which respects phone_visible.
CREATE TABLE public.profile_contacts (
    user_id        UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    phone          TEXT,
    phone_visible  BOOLEAN NOT NULL DEFAULT FALSE
);

-- 2. Tenants
CREATE TABLE public.tenants (
    id                   UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    age                  SMALLINT CHECK (age BETWEEN 16 AND 100),
    university           TEXT,
    course               TEXT,
    bio                  TEXT,
    photo_url            TEXT,          -- path in the tenant-photos storage bucket
    onboarding_complete  BOOLEAN NOT NULL DEFAULT FALSE
);

-- Onboarding section 1: what kind of house the tenant wants (Tenant <-> House).
CREATE TABLE public.tenant_house_preferences (
    tenant_id        UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
    budget_min       INTEGER          NOT NULL CHECK (budget_min >= 0),
    budget_max       INTEGER          NOT NULL,
    preferred_areas  TEXT[]           NOT NULL DEFAULT '{}',
    room_type        public.room_type NOT NULL,
    move_in_date     DATE             NOT NULL,
    lease_months     SMALLINT         NOT NULL CHECK (lease_months > 0),
    max_housemates   SMALLINT         NOT NULL CHECK (max_housemates >= 0),
    CHECK (budget_max >= budget_min)
);

-- Onboarding section 2: how the tenant lives (Tenant <-> Tenant).
CREATE TABLE public.tenant_lifestyle_preferences (
    tenant_id        UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
    sleep_schedule   public.sleep_schedule    NOT NULL,
    noise_tolerance  SMALLINT                 NOT NULL CHECK (noise_tolerance BETWEEN 1 AND 5),
    cleanliness      public.cleanliness_level NOT NULL,
    work_schedule    public.work_schedule     NOT NULL,
    social_level     public.social_level      NOT NULL,
    guest_frequency  public.frequency         NOT NULL,
    smoker           BOOLEAN                  NOT NULL,
    ok_with_smoking  BOOLEAN                  NOT NULL,
    has_pets         BOOLEAN                  NOT NULL,
    ok_with_pets     BOOLEAN                  NOT NULL
);

CREATE TABLE public.tenant_interests (
    tenant_id  UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    interest   TEXT NOT NULL,
    PRIMARY KEY (tenant_id, interest)
);

-- Onboarding section 3: personality prompts (answer 3 of 10).
CREATE TABLE public.prompts (
    prompt_id  SMALLINT PRIMARY KEY,
    text       TEXT NOT NULL
);

CREATE TABLE public.tenant_prompt_answers (
    tenant_id  UUID     NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    slot       SMALLINT NOT NULL CHECK (slot BETWEEN 1 AND 3),  -- caps it at 3 answers
    prompt_id  SMALLINT NOT NULL REFERENCES public.prompts(prompt_id),
    answer     TEXT     NOT NULL,
    PRIMARY KEY (tenant_id, slot),
    UNIQUE (tenant_id, prompt_id)
);

-- 3. Landlords
CREATE TABLE public.landlords (
    id         UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    photo_url  TEXT
);

CREATE TABLE public.landlord_preferences (
    landlord_id          UUID PRIMARY KEY REFERENCES public.landlords(id) ON DELETE CASCADE,
    preferred_tenants    public.tenant_type NOT NULL DEFAULT 'any',
    min_lease_months     SMALLINT           NOT NULL DEFAULT 1 CHECK (min_lease_months > 0),
    references_required  BOOLEAN            NOT NULL DEFAULT FALSE
);

-- 5. Houses
CREATE TABLE public.houses (
    house_id         BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    landlord_id      UUID                  NOT NULL REFERENCES public.landlords(id) ON DELETE CASCADE,
    title            TEXT                  NOT NULL,
    area             TEXT                  NOT NULL,
    address          TEXT                  NOT NULL,
    rent             INTEGER               NOT NULL CHECK (rent > 0),   -- EUR / month
    room_type        public.room_type      NOT NULL,
    available_from   DATE                  NOT NULL,
    rooms_available  SMALLINT              NOT NULL CHECK (rooms_available >= 0),
    verified         BOOLEAN               NOT NULL DEFAULT FALSE,      -- set by VLM pipeline only
    status           public.listing_status NOT NULL DEFAULT 'active',
    created_at       TIMESTAMPTZ           NOT NULL DEFAULT now()
);
CREATE INDEX houses_landlord_idx ON public.houses (landlord_id);

-- House rules = the listing's preferences about who lives there.
CREATE TABLE public.house_preferences (
    house_id           BIGINT PRIMARY KEY REFERENCES public.houses(house_id) ON DELETE CASCADE,
    pets_allowed       BOOLEAN          NOT NULL,
    smoking_allowed    BOOLEAN          NOT NULL,
    guest_policy       public.frequency NOT NULL,
    quiet_hours_start  TIME,
    quiet_hours_end    TIME,
    min_lease_months   SMALLINT         NOT NULL CHECK (min_lease_months > 0),
    max_occupants      SMALLINT         NOT NULL CHECK (max_occupants > 0),
    extra_rules        TEXT
);

CREATE TABLE public.house_photos (
    photo_id  BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    house_id  BIGINT   NOT NULL REFERENCES public.houses(house_id) ON DELETE CASCADE,
    url       TEXT     NOT NULL,   -- path in the house-photos storage bucket
    position  SMALLINT NOT NULL,   -- 0 = hero photo
    UNIQUE (house_id, position)
);

CREATE TABLE public.amenities (
    amenity_id  SMALLINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE
);

-- Each claimed amenity is verified separately by the VLM pipeline.
CREATE TABLE public.house_amenities (
    house_id      BIGINT   NOT NULL REFERENCES public.houses(house_id) ON DELETE CASCADE,
    amenity_id    SMALLINT NOT NULL REFERENCES public.amenities(amenity_id),
    vlm_verified  BOOLEAN,           -- NULL = not checked yet; set by service_role only
    PRIMARY KEY (house_id, amenity_id)
);

-- Tenant likes a house. Replaces the likes[] lists on tenant and house.
CREATE TABLE public.house_likes (
    tenant_id   UUID        NOT NULL REFERENCES public.tenants(id)      ON DELETE CASCADE,
    house_id    BIGINT      NOT NULL REFERENCES public.houses(house_id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, house_id)
);
CREATE INDEX house_likes_house_idx ON public.house_likes (house_id);

-- 4. Swipes and matches
-- One row per swipe, one direction. A right swipe with no reply yet is
-- what shows up in the other person's Likes tab.
CREATE TABLE public.swipes (
    swiper_id   UUID                   NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    target_id   UUID                   NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    direction   public.swipe_direction NOT NULL,
    created_at  TIMESTAMPTZ            NOT NULL DEFAULT now(),
    PRIMARY KEY (swiper_id, target_id),
    CHECK (swiper_id <> target_id)
);
CREATE INDEX swipes_target_idx ON public.swipes (target_id, direction);

-- One row per mutual pair; tenant_a_id is always the smaller id so
-- (A,B) and (B,A) can never both exist. Only created by trigger.
CREATE TABLE public.matches (
    match_id     BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    tenant_a_id  UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    tenant_b_id  UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_a_id, tenant_b_id),
    CHECK (tenant_a_id < tenant_b_id)
);
CREATE INDEX matches_b_idx ON public.matches (tenant_b_id);

-- A house shared inside a match's dialog. Apply via apply_to_shared_house().
CREATE TABLE public.match_houses (
    match_id      BIGINT      NOT NULL REFERENCES public.matches(match_id) ON DELETE CASCADE,
    house_id      BIGINT      NOT NULL REFERENCES public.houses(house_id)  ON DELETE CASCADE,
    shared_by     UUID        NOT NULL REFERENCES public.tenants(id)       ON DELETE CASCADE,
    a_applied_at  TIMESTAMPTZ,
    b_applied_at  TIMESTAMPTZ,
    shared_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (match_id, house_id)
);

-- Joint (pair) application the landlord sees. Created by trigger when
-- both sides have applied; decided via decide_application().
CREATE TABLE public.applications (
    application_id  BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    match_id        BIGINT                    NOT NULL,
    house_id        BIGINT                    NOT NULL,
    status          public.application_status NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMPTZ               NOT NULL DEFAULT now(),
    decided_at      TIMESTAMPTZ,
    UNIQUE (match_id, house_id),
    FOREIGN KEY (match_id, house_id)
        REFERENCES public.match_houses(match_id, house_id) ON DELETE CASCADE
);
CREATE INDEX applications_house_idx ON public.applications (house_id);

-- 6-8. Recommendations (written by the matching engine with service_role).
--   source = 'cold_start' covers the "initial recommendation" table.
CREATE TABLE public.house_recommendations (
    tenant_id    UUID              NOT NULL REFERENCES public.tenants(id)      ON DELETE CASCADE,
    house_id     BIGINT            NOT NULL REFERENCES public.houses(house_id) ON DELETE CASCADE,
    score        REAL              NOT NULL CHECK (score BETWEEN 0 AND 1),
    source       public.rec_source NOT NULL DEFAULT 'model',
    computed_at  TIMESTAMPTZ       NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, house_id)
);
CREATE INDEX house_recs_rank_idx ON public.house_recommendations (tenant_id, score DESC);

CREATE TABLE public.profile_recommendations (
    tenant_id     UUID              NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    candidate_id  UUID              NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    score         REAL              NOT NULL CHECK (score BETWEEN 0 AND 1),
    source        public.rec_source NOT NULL DEFAULT 'model',
    computed_at   TIMESTAMPTZ       NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, candidate_id),
    CHECK (tenant_id <> candidate_id)
);
CREATE INDEX profile_recs_rank_idx ON public.profile_recommendations (tenant_id, score DESC);

-- =====================================================================
-- Helper functions used by policies.
-- SECURITY DEFINER so they can look across tables without tripping RLS
-- recursion; each one only ever answers about auth.uid().
-- =====================================================================
CREATE FUNCTION public.my_role() RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE FUNCTION public.is_match_member(p_match_id BIGINT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.matches
        WHERE match_id = p_match_id
          AND auth.uid() IN (tenant_a_id, tenant_b_id)
    );
$$;

CREATE FUNCTION public.is_matched_with(p_other UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.matches
        WHERE tenant_a_id = LEAST(auth.uid(), p_other)
          AND tenant_b_id = GREATEST(auth.uid(), p_other)
    );
$$;

CREATE FUNCTION public.owns_house(p_house_id BIGINT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.houses
        WHERE house_id = p_house_id AND landlord_id = auth.uid()
    );
$$;

-- =====================================================================
-- Triggers
-- =====================================================================

-- New auth user => profile + contact row, from the sign-up metadata.
CREATE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    IF NEW.raw_user_meta_data->>'role' IS NULL THEN
        RAISE EXCEPTION 'sign-up metadata must include role (tenant or landlord)';
    END IF;

    INSERT INTO public.profiles (id, name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        (NEW.raw_user_meta_data->>'role')::public.user_role
    );
    INSERT INTO public.profile_contacts (user_id, phone)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'phone');
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Right swipe + an existing right swipe the other way => create the match.
-- SECURITY DEFINER because tenants can't insert into matches directly.
-- ON CONFLICT makes it safe when both people swipe at the same moment.
CREATE FUNCTION public.create_match_on_mutual_swipe() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    IF NEW.direction = 'right' AND EXISTS (
        SELECT 1 FROM public.swipes
        WHERE swiper_id = NEW.target_id
          AND target_id = NEW.swiper_id
          AND direction = 'right'
    ) THEN
        INSERT INTO public.matches (tenant_a_id, tenant_b_id)
        VALUES (LEAST(NEW.swiper_id, NEW.target_id),
                GREATEST(NEW.swiper_id, NEW.target_id))
        ON CONFLICT (tenant_a_id, tenant_b_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER swipes_create_match
AFTER INSERT OR UPDATE OF direction ON public.swipes
FOR EACH ROW EXECUTE FUNCTION public.create_match_on_mutual_swipe();

-- A house can only be shared by one of the two people in the match.
-- (Also enforced by RLS for browser users; this covers service_role.)
CREATE FUNCTION public.check_match_house_sharer() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.matches
        WHERE match_id = NEW.match_id
          AND NEW.shared_by IN (tenant_a_id, tenant_b_id)
    ) THEN
        RAISE EXCEPTION 'tenant % is not part of match %', NEW.shared_by, NEW.match_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER match_houses_check_sharer
BEFORE INSERT OR UPDATE OF shared_by, match_id ON public.match_houses
FOR EACH ROW EXECUTE FUNCTION public.check_match_house_sharer();

-- Both sides applied => submit the joint application to the landlord.
CREATE FUNCTION public.create_application_on_both_applied() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    IF NEW.a_applied_at IS NOT NULL AND NEW.b_applied_at IS NOT NULL THEN
        INSERT INTO public.applications (match_id, house_id)
        VALUES (NEW.match_id, NEW.house_id)
        ON CONFLICT (match_id, house_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER match_houses_create_application
AFTER INSERT OR UPDATE OF a_applied_at, b_applied_at ON public.match_houses
FOR EACH ROW EXECUTE FUNCTION public.create_application_on_both_applied();

-- =====================================================================
-- RPC functions (call with supabase.rpc('name', { ...args }))
-- =====================================================================

-- Click "Apply" on a house shared in a match. Sets only the caller's side.
CREATE FUNCTION public.apply_to_shared_house(p_match_id BIGINT, p_house_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_uid   UUID := auth.uid();
    v_match public.matches;
BEGIN
    SELECT * INTO v_match FROM public.matches WHERE match_id = p_match_id;
    IF NOT FOUND OR v_uid IS NULL OR v_uid NOT IN (v_match.tenant_a_id, v_match.tenant_b_id) THEN
        RAISE EXCEPTION 'you are not part of match %', p_match_id;
    END IF;

    UPDATE public.match_houses SET
        a_applied_at = CASE WHEN v_uid = v_match.tenant_a_id
                            THEN COALESCE(a_applied_at, now()) ELSE a_applied_at END,
        b_applied_at = CASE WHEN v_uid = v_match.tenant_b_id
                            THEN COALESCE(b_applied_at, now()) ELSE b_applied_at END
    WHERE match_id = p_match_id AND house_id = p_house_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'house % is not shared in match %', p_house_id, p_match_id;
    END IF;
END;
$$;

-- Landlord confirms or ignores a pending application on their house.
CREATE FUNCTION public.decide_application(p_application_id BIGINT,
                                          p_decision public.application_status)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    IF p_decision NOT IN ('confirmed', 'ignored') THEN
        RAISE EXCEPTION 'decision must be confirmed or ignored';
    END IF;

    UPDATE public.applications a
    SET status = p_decision, decided_at = now()
    FROM public.houses h
    WHERE a.application_id = p_application_id
      AND h.house_id = a.house_id
      AND h.landlord_id = auth.uid()
      AND a.status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'no pending application % on your listings', p_application_id;
    END IF;
END;
$$;

-- Matches tab: each match with the other person's contact details.
-- Phone only if they turned phone_visible on.
CREATE FUNCTION public.get_my_matches()
RETURNS TABLE (match_id BIGINT, other_id UUID, name TEXT, photo_url TEXT,
               email TEXT, phone TEXT, matched_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT m.match_id, o.id, p.name, t.photo_url, u.email::TEXT,
           CASE WHEN c.phone_visible THEN c.phone END,
           m.created_at
    FROM public.matches m
    CROSS JOIN LATERAL (
        SELECT CASE WHEN m.tenant_a_id = auth.uid()
                    THEN m.tenant_b_id ELSE m.tenant_a_id END AS id
    ) o
    JOIN public.profiles p ON p.id = o.id
    JOIN public.tenants  t ON t.id = o.id
    JOIN auth.users      u ON u.id = o.id
    LEFT JOIN public.profile_contacts c ON c.user_id = o.id
    WHERE auth.uid() IN (m.tenant_a_id, m.tenant_b_id)
    ORDER BY m.created_at DESC;
$$;

-- Landlord contact details, revealed only for confirmed applications.
CREATE FUNCTION public.get_my_landlord_contacts()
RETURNS TABLE (application_id BIGINT, house_id BIGINT, house_title TEXT,
               landlord_name TEXT, email TEXT, phone TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT a.application_id, h.house_id, h.title, p.name, u.email::TEXT,
           CASE WHEN c.phone_visible THEN c.phone END
    FROM public.applications a
    JOIN public.matches  m ON m.match_id = a.match_id
    JOIN public.houses   h ON h.house_id = a.house_id
    JOIN public.profiles p ON p.id = h.landlord_id
    JOIN auth.users      u ON u.id = h.landlord_id
    LEFT JOIN public.profile_contacts c ON c.user_id = h.landlord_id
    WHERE a.status = 'confirmed'
      AND auth.uid() IN (m.tenant_a_id, m.tenant_b_id);
$$;

-- =====================================================================
-- Views (security_invoker => the caller's RLS applies)
-- =====================================================================

-- One row per (me, the other person): filter WHERE tenant_id = auth.uid().
CREATE VIEW public.tenant_matches WITH (security_invoker = true) AS
    SELECT match_id, tenant_a_id AS tenant_id, tenant_b_id AS other_id, created_at FROM public.matches
    UNION ALL
    SELECT match_id, tenant_b_id AS tenant_id, tenant_a_id AS other_id, created_at FROM public.matches;

-- Likes tab: people who swiped right on me that I haven't swiped on yet.
CREATE VIEW public.pending_likes WITH (security_invoker = true) AS
    SELECT s.target_id AS tenant_id, s.swiper_id AS liked_by_id, s.created_at
    FROM public.swipes s
    WHERE s.direction = 'right'
      AND NOT EXISTS (
          SELECT 1 FROM public.swipes r
          WHERE r.swiper_id = s.target_id AND r.target_id = s.swiper_id
      );

-- "Liked by X of your matches" on a house card.
CREATE VIEW public.house_likes_by_matches WITH (security_invoker = true) AS
    SELECT tm.tenant_id, hl.house_id, tm.other_id AS liked_by_id
    FROM public.tenant_matches tm
    JOIN public.house_likes hl ON hl.tenant_id = tm.other_id;

-- =====================================================================
-- Privileges
-- Supabase grants everything on public tables to anon/authenticated by
-- default; RLS is what actually protects rows. On top of that:
--   * anon (not logged in) gets nothing.
--   * Columns a user must not change are excluded from UPDATE grants.
-- =====================================================================
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;
GRANT  EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

-- Written only by triggers / RPCs / service_role
REVOKE INSERT, UPDATE, DELETE ON public.matches, public.applications,
       public.house_recommendations, public.profile_recommendations,
       public.prompts, public.amenities
FROM authenticated;

-- Column-level UPDATE allow-lists
REVOKE UPDATE ON public.profiles, public.profile_contacts, public.houses,
       public.house_amenities, public.swipes, public.match_houses
FROM authenticated;
GRANT UPDATE (name, first_login)        ON public.profiles         TO authenticated;
GRANT UPDATE (phone, phone_visible)     ON public.profile_contacts TO authenticated;
GRANT UPDATE (direction)                ON public.swipes           TO authenticated;
GRANT UPDATE (title, area, address, rent, room_type, available_from,
              rooms_available, status)  ON public.houses           TO authenticated;
-- house_amenities: no UPDATE (vlm_verified is service_role only)
-- match_houses:    no UPDATE (use apply_to_shared_house)

-- =====================================================================
-- Row Level Security
-- =====================================================================
ALTER TABLE public.profiles                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_contacts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_house_preferences     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_lifestyle_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_interests             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompts                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_prompt_answers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landlords                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landlord_preferences         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.houses                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.house_preferences            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.house_photos                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amenities                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.house_amenities              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.house_likes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swipes                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_houses                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.house_recommendations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_recommendations      ENABLE ROW LEVEL SECURITY;

-- Profiles: names are public to logged-in users; edit your own.
CREATE POLICY "profiles: read all"   ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles: update own" ON public.profiles FOR UPDATE TO authenticated
    USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));

-- Contacts: only your own row.
CREATE POLICY "contacts: read own"   ON public.profile_contacts FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));
CREATE POLICY "contacts: update own" ON public.profile_contacts FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- Tenants: swipe cards need everyone's profile; only tenants can create one.
CREATE POLICY "tenants: read all"   ON public.tenants FOR SELECT TO authenticated USING (true);
CREATE POLICY "tenants: create own" ON public.tenants FOR INSERT TO authenticated
    WITH CHECK (id = (SELECT auth.uid()) AND (SELECT public.my_role()) = 'tenant');
CREATE POLICY "tenants: update own" ON public.tenants FOR UPDATE TO authenticated
    USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));

-- Tenant onboarding tables: readable by all (cards + matching), written by owner.
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['tenant_house_preferences', 'tenant_lifestyle_preferences',
                             'tenant_interests', 'tenant_prompt_answers']
    LOOP
        EXECUTE format('CREATE POLICY "%1$s: read all" ON public.%1$I FOR SELECT TO authenticated USING (true)', t);
        EXECUTE format('CREATE POLICY "%1$s: insert own" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (tenant_id = (SELECT auth.uid()))', t);
        EXECUTE format('CREATE POLICY "%1$s: update own" ON public.%1$I FOR UPDATE TO authenticated USING (tenant_id = (SELECT auth.uid())) WITH CHECK (tenant_id = (SELECT auth.uid()))', t);
        EXECUTE format('CREATE POLICY "%1$s: delete own" ON public.%1$I FOR DELETE TO authenticated USING (tenant_id = (SELECT auth.uid()))', t);
    END LOOP;
END $$;

-- Lookup tables
CREATE POLICY "prompts: read all"   ON public.prompts   FOR SELECT TO authenticated USING (true);
CREATE POLICY "amenities: read all" ON public.amenities FOR SELECT TO authenticated USING (true);

-- Landlords: private to themselves (contact goes out via get_my_landlord_contacts).
CREATE POLICY "landlords: read own"   ON public.landlords FOR SELECT TO authenticated
    USING (id = (SELECT auth.uid()));
CREATE POLICY "landlords: create own" ON public.landlords FOR INSERT TO authenticated
    WITH CHECK (id = (SELECT auth.uid()) AND (SELECT public.my_role()) = 'landlord');
CREATE POLICY "landlords: update own" ON public.landlords FOR UPDATE TO authenticated
    USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "landlord_prefs: read own"   ON public.landlord_preferences FOR SELECT TO authenticated
    USING (landlord_id = (SELECT auth.uid()));
CREATE POLICY "landlord_prefs: insert own" ON public.landlord_preferences FOR INSERT TO authenticated
    WITH CHECK (landlord_id = (SELECT auth.uid()));
CREATE POLICY "landlord_prefs: update own" ON public.landlord_preferences FOR UPDATE TO authenticated
    USING (landlord_id = (SELECT auth.uid())) WITH CHECK (landlord_id = (SELECT auth.uid()));

-- Houses: everyone sees non-draft listings; landlords manage their own.
CREATE POLICY "houses: read listed or own" ON public.houses FOR SELECT TO authenticated
    USING (status <> 'draft' OR landlord_id = (SELECT auth.uid()));
CREATE POLICY "houses: create own" ON public.houses FOR INSERT TO authenticated
    WITH CHECK (landlord_id = (SELECT auth.uid()) AND verified = FALSE);
CREATE POLICY "houses: update own" ON public.houses FOR UPDATE TO authenticated
    USING (landlord_id = (SELECT auth.uid())) WITH CHECK (landlord_id = (SELECT auth.uid()));
CREATE POLICY "houses: delete own" ON public.houses FOR DELETE TO authenticated
    USING (landlord_id = (SELECT auth.uid()));

-- House child tables: readable by all, written by the house's landlord.
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['house_preferences', 'house_photos']
    LOOP
        EXECUTE format('CREATE POLICY "%1$s: read all" ON public.%1$I FOR SELECT TO authenticated USING (true)', t);
        EXECUTE format('CREATE POLICY "%1$s: insert own" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (public.owns_house(house_id))', t);
        EXECUTE format('CREATE POLICY "%1$s: update own" ON public.%1$I FOR UPDATE TO authenticated USING (public.owns_house(house_id)) WITH CHECK (public.owns_house(house_id))', t);
        EXECUTE format('CREATE POLICY "%1$s: delete own" ON public.%1$I FOR DELETE TO authenticated USING (public.owns_house(house_id))', t);
    END LOOP;
END $$;

CREATE POLICY "house_amenities: read all"   ON public.house_amenities FOR SELECT TO authenticated USING (true);
CREATE POLICY "house_amenities: insert own" ON public.house_amenities FOR INSERT TO authenticated
    WITH CHECK (public.owns_house(house_id) AND vlm_verified IS NULL);
CREATE POLICY "house_amenities: delete own" ON public.house_amenities FOR DELETE TO authenticated
    USING (public.owns_house(house_id));

-- House likes: you see your own, your matches', and (as landlord) your houses'.
CREATE POLICY "house_likes: read own, matches', or my houses'" ON public.house_likes
    FOR SELECT TO authenticated
    USING (tenant_id = (SELECT auth.uid())
           OR public.is_matched_with(tenant_id)
           OR public.owns_house(house_id));
CREATE POLICY "house_likes: like"   ON public.house_likes FOR INSERT TO authenticated
    WITH CHECK (tenant_id = (SELECT auth.uid()));
CREATE POLICY "house_likes: unlike" ON public.house_likes FOR DELETE TO authenticated
    USING (tenant_id = (SELECT auth.uid()));

-- Swipes: you see your own swipes and right swipes on you (never who skipped you).
CREATE POLICY "swipes: read mine and right swipes on me" ON public.swipes
    FOR SELECT TO authenticated
    USING (swiper_id = (SELECT auth.uid())
           OR (target_id = (SELECT auth.uid()) AND direction = 'right'));
CREATE POLICY "swipes: swipe"        ON public.swipes FOR INSERT TO authenticated
    WITH CHECK (swiper_id = (SELECT auth.uid()));
CREATE POLICY "swipes: change mine"  ON public.swipes FOR UPDATE TO authenticated
    USING (swiper_id = (SELECT auth.uid())) WITH CHECK (swiper_id = (SELECT auth.uid()));

-- Matches: members only. No direct writes (trigger creates them).
CREATE POLICY "matches: read mine" ON public.matches FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) IN (tenant_a_id, tenant_b_id));

-- Shared houses: members only; you can share as yourself, not pre-applied.
CREATE POLICY "match_houses: read mine" ON public.match_houses FOR SELECT TO authenticated
    USING (public.is_match_member(match_id));
CREATE POLICY "match_houses: share" ON public.match_houses FOR INSERT TO authenticated
    WITH CHECK (shared_by = (SELECT auth.uid())
                AND public.is_match_member(match_id)
                AND a_applied_at IS NULL AND b_applied_at IS NULL);

-- Applications: the two tenants and the house's landlord.
CREATE POLICY "applications: read mine" ON public.applications FOR SELECT TO authenticated
    USING (public.is_match_member(match_id) OR public.owns_house(house_id));

-- Recommendations: your own only.
CREATE POLICY "house_recs: read own"   ON public.house_recommendations   FOR SELECT TO authenticated
    USING (tenant_id = (SELECT auth.uid()));
CREATE POLICY "profile_recs: read own" ON public.profile_recommendations FOR SELECT TO authenticated
    USING (tenant_id = (SELECT auth.uid()));
