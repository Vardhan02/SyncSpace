-- dev data only, all passwords are password123
-- uid(200) is the demo tenant, 201-208 roommates, 301-303 landlords

BEGIN;

CREATE FUNCTION pg_temp.uid(n INT) RETURNS UUID LANGUAGE sql IMMUTABLE AS $$
    SELECT ('00000000-0000-0000-0000-' || lpad(n::TEXT, 12, '0'))::UUID;
$$;

-- profiles + profile_contacts come from the on_auth_user_created trigger.
-- token columns have to be '' and not null or login breaks
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, reauthentication_token
)
SELECT
    '00000000-0000-0000-0000-000000000000', pg_temp.uid(v.n), 'authenticated', 'authenticated',
    v.email, extensions.crypt('password123', extensions.gen_salt('bf')), now(),
    '{"provider": "email", "providers": ["email"]}'::JSONB,
    jsonb_build_object('name', v.name, 'phone', v.phone, 'role', v.role),
    now(), now(), '', '', '', '', '', ''
FROM (VALUES
    (200, 'Dhruvil Shiroiya', 'tenant@syncspace.test',   '+353 85 100 0200', 'tenant'),
    (201, 'Aanya Kapoor',     'aanya@syncspace.test',    '+353 85 100 0201', 'tenant'),
    (202, 'Rohan Mehta',      'rohan@syncspace.test',    '+353 85 100 0202', 'tenant'),
    (203, 'Saoirse O''Brien', 'saoirse@syncspace.test',  '+353 85 100 0203', 'tenant'),
    (204, 'Liam Fitzgerald',  'liam@syncspace.test',     '+353 85 100 0204', 'tenant'),
    (205, 'Cian Murphy',      'cian@syncspace.test',     '+353 85 100 0205', 'tenant'),
    (206, 'Priya Nair',       'priya@syncspace.test',    '+353 85 100 0206', 'tenant'),
    (207, 'Éabha Walsh',      'eabha@syncspace.test',    '+353 85 100 0207', 'tenant'),
    (208, 'Tadhg O''Sullivan','tadhg@syncspace.test',    '+353 85 100 0208', 'tenant'),
    (301, 'Mary Walsh',       'landlord@syncspace.test', '+353 87 200 0301', 'landlord'),
    (302, 'Declan Kelly',     'declan@syncspace.test',   '+353 87 200 0302', 'landlord'),
    (303, 'Niamh Byrne',      'niamh@syncspace.test',    '+353 87 200 0303', 'landlord')
) AS v(n, name, email, phone, role);

INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider,
                             last_sign_in_at, created_at, updated_at)
SELECT gen_random_uuid(), u.id, u.id::TEXT,
       jsonb_build_object('sub', u.id::TEXT, 'email', u.email, 'email_verified', TRUE),
       'email', now(), now(), now()
FROM auth.users u
WHERE u.email LIKE '%@syncspace.test';

-- everyone here is already past onboarding
UPDATE public.profiles SET first_login = FALSE
WHERE id IN (SELECT id FROM auth.users WHERE email LIKE '%@syncspace.test');

UPDATE public.profile_contacts SET phone_visible = TRUE
WHERE user_id IN (pg_temp.uid(200), pg_temp.uid(201), pg_temp.uid(204), pg_temp.uid(206),
                  pg_temp.uid(208), pg_temp.uid(301), pg_temp.uid(302));

INSERT INTO public.tenants (id, age, university, course, bio, onboarding_complete)
SELECT pg_temp.uid(n), age, university, course, bio, TRUE
FROM (VALUES
    (200, 23, 'UCC', 'MSc Computer Science',    'Backend dev by day, home cook by night. Looking for easy-going housemates near campus.'),
    (201, 22, 'UCC', 'MSc Data Science',        'Early riser who loves cooking big weekend breakfasts. I keep shared spaces tidy and I''m always up for a movie night.'),
    (202, 24, 'UCC', 'PhD Computer Science',    'Quiet during the week, social on weekends. I play guitar (with headphones!) and make a mean dal.'),
    (203, 21, 'UCC', 'BA English & Philosophy', 'Tea enthusiast and bookworm. I''d love a housemate who''s respectful of quiet hours but also up for the odd pub quiz.'),
    (204, 23, 'CIT', 'MSc Biotechnology',       'Gym in the morning, study during the day, Netflix at night. Pretty chill about most things as long as the kitchen stays clean.'),
    (205, 25, 'UCC', 'MArch Architecture',      'I spend half my life in the studio so the house is always tidy by default. Love a Sunday roast with housemates.'),
    (206, 22, 'UCC', 'BSc Pharmacy',            'Organised and easy-going. I''m a morning person who likes the house quiet after 11pm. Big fan of farmers'' markets.'),
    (207, 20, 'UCC', 'BSc Computer Science',    'First year of living away from home. I''m friendly, a decent cook, and I promise to always do my dishes.'),
    (208, 26, 'UCC', 'HDip Education',          'Mature student, calm and collected. Happy to cook together or do our own thing. Early to bed, early to rise.')
) AS v(n, age, university, course, bio);

INSERT INTO public.tenant_house_preferences
    (tenant_id, budget_min, budget_max, preferred_areas, room_type, move_in_date, lease_months, max_housemates)
SELECT pg_temp.uid(n), bmin, bmax, areas::TEXT[], rt::public.room_type, mi::DATE, lease, mates
FROM (VALUES
    (200, 550, 800, '{College Road,Bishopstown,Victoria Cross}', 'double',   '2027-01-04',  9, 3),
    (201, 600, 750, '{College Road,Bishopstown}',                'double',   '2027-01-04',  9, 3),
    (202, 550, 700, '{Victoria Cross,Bishopstown,Wilton}',       'single',   '2026-12-15', 12, 4),
    (203, 500, 620, '{The Lough,College Road}',                  'single',   '2027-01-11',  9, 2),
    (204, 550, 680, '{Douglas,Wilton}',                          'double',   '2027-02-01',  5, 3),
    (205, 600, 730, '{Shandon,City Centre}',                     'double',   '2027-01-18', 12, 2),
    (206, 550, 660, '{Douglas,Blackrock}',                       'single',   '2027-03-01',  5, 2),
    (207, 450, 600, '{Wilton,Bishopstown,College Road}',         'single',   '2027-01-04',  9, 4),
    (208, 600, 710, '{Blackrock,Douglas,The Lough}',             'ensuite',  '2027-01-04', 12, 2)
) AS v(n, bmin, bmax, areas, rt, mi, lease, mates);

INSERT INTO public.tenant_lifestyle_preferences
    (tenant_id, sleep_schedule, noise_tolerance, cleanliness, work_schedule, social_level,
     guest_frequency, smoker, ok_with_smoking, has_pets, ok_with_pets)
SELECT pg_temp.uid(n), sleep::public.sleep_schedule, noise, clean::public.cleanliness_level,
       work::public.work_schedule, social::public.social_level, guests::public.guest_frequency,
       smoker, ok_smoke, pets, ok_pets
FROM (VALUES
    -- n    sleep         noise clean        work            social      guests      smoker ok_smoke pets   ok_pets
    (200, 'night_owl',   3,    'tidy',      'mixed',        'balanced', 'weekends', FALSE, FALSE,   FALSE, TRUE),
    (201, 'early_bird',  3,    'very_tidy', 'on_campus',    'social',   'weekends', FALSE, FALSE,   FALSE, TRUE),
    (202, 'night_owl',   2,    'tidy',      'night_shifts', 'balanced', 'rarely',   FALSE, FALSE,   FALSE, FALSE),
    (203, 'early_bird',  1,    'very_tidy', 'on_campus',    'homebody', 'rarely',   FALSE, FALSE,   TRUE,  TRUE),
    (204, 'early_bird',  3,    'tidy',      'on_campus',    'balanced', 'weekends', FALSE, FALSE,   FALSE, TRUE),
    (205, 'night_owl',   4,    'tidy',      'mixed',        'social',   'often',    FALSE, TRUE,    FALSE, TRUE),
    (206, 'early_bird',  1,    'very_tidy', 'on_campus',    'homebody', 'rarely',   FALSE, FALSE,   FALSE, FALSE),
    (207, 'night_owl',   4,    'tidy',      'from_home',    'social',   'often',    FALSE, FALSE,   FALSE, TRUE),
    (208, 'early_bird',  2,    'very_tidy', 'on_campus',    'balanced', 'weekends', FALSE, FALSE,   TRUE,  TRUE)
) AS v(n, sleep, noise, clean, work, social, guests, smoker, ok_smoke, pets, ok_pets);

INSERT INTO public.tenant_interests (tenant_id, interest)
SELECT pg_temp.uid(n), unnest(interests::TEXT[])
FROM (VALUES
    (200, '{Cooking,Football,Gaming,Travel}'),
    (201, '{Cooking,Hiking,Board games,Reading}'),
    (202, '{Guitar,Gaming,Cycling,Cooking}'),
    (203, '{Reading,Writing,Pub quizzes,Yoga}'),
    (204, '{Gym,Running,Netflix,Photography}'),
    (205, '{Sketching,Cooking,Coffee,Concerts}'),
    (206, '{Farmers'' markets,Baking,Pilates,Podcasts}'),
    (207, '{Gaming,Anime,Coffee,Walks}'),
    (208, '{GAA,Hiking,Reading,Cooking}')
) AS v(n, interests);

-- off for now, these are placeholders until the real 10 prompts are decided
-- INSERT INTO public.prompts (prompt_id, text) VALUES
--     ( 1, 'My ideal Sunday at home looks like...'),
--     ( 2, 'The house rule I''d never compromise on is...'),
--     ( 3, 'You''ll know I''m stressed when...'),
--     ( 4, 'The dish I''d cook for the house is...'),
--     ( 5, 'My most controversial take on chores is...'),
--     ( 6, 'A perfect housemate would...'),
--     ( 7, 'On a Friday night you''ll find me...'),
--     ( 8, 'My green flag as a housemate is...'),
--     ( 9, 'Something I''m weirdly particular about...'),
--     (10, 'I''ll win you over with...');

-- INSERT INTO public.tenant_prompt_answers (tenant_id, slot, prompt_id, answer)
-- SELECT pg_temp.uid(n), slot, prompt_id, answer
-- FROM (VALUES
--     (200, 1, 4,  'Biryani, big pot, enough for everyone.'),
--     (200, 2, 7,  'Five-a-side, then a late-night coding session.'),
--     (200, 3, 8,  'I take the bins out without being asked.'),
--     (201, 1, 1,  'Pancakes, a long walk, and a board game in the evening.'),
--     (201, 2, 2,  'Dishes done the same day.'),
--     (201, 3, 10, 'Weekend brunch.'),
--     (202, 1, 3,  'The guitar comes out (headphones on, promise).'),
--     (202, 2, 4,  'Dal makhani.'),
--     (202, 3, 7,  'Home for a gaming session, or out if it''s someone''s birthday.'),
--     (203, 1, 6,  'Respect quiet mornings and appreciate a good cup of tea.'),
--     (203, 2, 9,  'How tea is made. Bag out before the milk goes in.'),
--     (203, 3, 7,  'At a pub quiz on Oliver Plunkett Street.'),
--     (204, 1, 7,  'On the couch after the gym with a new series.'),
--     (204, 2, 5,  'A clean kitchen matters more than a clean living room.'),
--     (204, 3, 8,  'I always replace the milk I finish.'),
--     (205, 1, 1,  'Sunday roast for whoever is around.'),
--     (205, 2, 3,  'The house gets suspiciously tidy.'),
--     (205, 3, 10, 'Good coffee, freshly ground.'),
--     (206, 1, 2,  'Quiet after 11pm on weeknights.'),
--     (206, 2, 1,  'English Market in the morning, then baking all afternoon.'),
--     (206, 3, 8,  'A shared calendar for bins and bills.'),
--     (207, 1, 10, 'Late-night toasties.'),
--     (207, 2, 6,  'Be up for the odd anime marathon.'),
--     (207, 3, 5,  'A chore rota on the fridge actually works.'),
--     (208, 1, 4,  'Irish stew, the way my mam makes it.'),
--     (208, 2, 6,  'Say hello in the mornings and mind their own business after.'),
--     (208, 3, 1,  'A hike out at Crosshaven and the GAA on the telly.')
-- ) AS v(n, slot, prompt_id, answer);

INSERT INTO public.landlords (id) VALUES (pg_temp.uid(301)), (pg_temp.uid(302)), (pg_temp.uid(303));

INSERT INTO public.landlord_preferences (landlord_id, preferred_tenants, min_lease_months, references_required) VALUES
    (pg_temp.uid(301), 'student',      9,  FALSE),
    (pg_temp.uid(302), 'any',          5,  TRUE),
    (pg_temp.uid(303), 'professional', 12, TRUE);

INSERT INTO public.houses (house_id, landlord_id, title, area, address, rent, room_type, available_from, rooms_available, verified)
SELECT house_id, pg_temp.uid(ll), title, area, address, rent, rt::public.room_type, af::DATE, rooms, verified
FROM (VALUES
    (101, 301, 'Bright 3-bed near UCC',                'College Road',   '14 College Road, Cork',       750, 'double',   '2027-01-04', 2, TRUE),
    (102, 301, 'Modern apartment by the river',        'Victoria Cross', '3 Carrigrohane Road, Cork',   820, 'ensuite',  '2026-12-15', 1, TRUE),
    (103, 301, 'Quiet house with garden',              'Bishopstown',    '27 Bishopstown Avenue, Cork', 650, 'single',   '2027-01-11', 3, TRUE),
    (104, 302, 'City centre room above café',          'Shandon',        '8 John Redmond Street, Cork', 700, 'double',   '2026-12-01', 1, TRUE),
    (105, 302, 'Spacious duplex near Douglas village', 'Douglas',        '41 Maryborough Hill, Cork',   690, 'double',   '2027-02-01', 2, TRUE),
    (106, 302, 'Cosy terrace by the Lough',            'The Lough',      '5 Lough Road, Cork',          620, 'single',   '2027-01-18', 1, TRUE),
    (107, 303, 'Seaside flat in Blackrock',            'Blackrock',      '12 Blackrock Road, Cork',     780, 'ensuite',  '2027-03-01', 2, TRUE),
    (108, 303, 'Student house in Wilton',              'Wilton',         '9 Wilton Gardens, Cork',      600, 'single',   '2027-01-04', 4, TRUE)
) AS v(house_id, ll, title, area, address, rent, rt, af, rooms, verified);

-- the demo houses count as already checked by the VLM
UPDATE public.houses SET verification_status = 'verified' WHERE verified;

INSERT INTO public.house_preferences
    (house_id, pets_allowed, smoking_allowed, guest_policy, quiet_hours_start, quiet_hours_end,
     min_lease_months, max_occupants, extra_rules) VALUES
    (101, FALSE, FALSE, 'weekends',     '23:00', '07:00',  9, 3, 'Bins out Tuesday night.'),
    (102, FALSE, FALSE, 'no_overnight', '22:00', '08:00', 12, 2, 'No parties. Bikes in the bike store only.'),
    (103, TRUE,  FALSE, 'weekends',     '23:00', '07:00',  9, 4, 'Garden upkeep shared between tenants.'),
    (104, FALSE, FALSE, 'welcome',      NULL,    NULL,     5, 2, 'Café below opens at 7am, expect some morning noise.'),
    (105, FALSE, FALSE, 'weekends',     '23:00', '07:00',  5, 3, NULL),
    (106, TRUE,  FALSE, 'no_overnight', '22:00', '07:00',  9, 2, 'Small pets only (cats, small dogs).'),
    (107, FALSE, FALSE, 'no_overnight', '22:30', '07:30', 12, 3, 'Professionals preferred. References required.'),
    (108, FALSE, TRUE,  'welcome',      '00:00', '08:00',  9, 5, 'Smoking in the back garden only.');

-- same photo counts as houses.json, paths are inside the house-photos bucket
INSERT INTO public.house_photos (house_id, url, position)
SELECT h.house_id, h.house_id || '/' || p || '.jpg', p
FROM (VALUES (101, 7), (102, 5), (103, 4), (104, 6), (105, 8), (106, 3), (107, 5), (108, 4)) AS h(house_id, n)
CROSS JOIN LATERAL generate_series(0, h.n - 1) AS p;

-- null vlm_verified = not checked yet
INSERT INTO public.house_amenities (house_id, amenity_id, vlm_verified)
SELECT x.house_id, a.amenity_id, CASE WHEN h.verified THEN TRUE END
FROM (VALUES
    (101, 'WiFi'), (101, 'Washing machine'), (101, 'Study desk'),
    (102, 'WiFi'), (102, 'En-suite'), (102, 'Kitchen access'),
    (103, 'Garden'), (103, 'Parking'), (103, 'Washing machine'),
    (104, 'WiFi'), (104, 'Double bed'), (104, 'Bike storage'),
    (105, 'Parking'), (105, 'Dishwasher'), (105, 'Study desk'),
    (106, 'WiFi'), (106, 'Kitchen access'),
    (107, 'En-suite'), (107, 'Balcony'), (107, 'Washing machine'),
    (108, 'WiFi'), (108, 'Study desk'), (108, 'Bike storage')
) AS x(house_id, amenity)
JOIN public.amenities a ON a.name = x.amenity
JOIN public.houses h    ON h.house_id = x.house_id;

-- the swipes trigger makes the matches from these
INSERT INTO public.swipes (swiper_id, target_id, direction)
SELECT pg_temp.uid(s), pg_temp.uid(t), d::public.swipe_direction
FROM (VALUES
    -- demo tenant matches with Aanya and Rohan
    (200, 201, 'right'), (201, 200, 'right'),
    (202, 200, 'right'), (200, 202, 'right'),
    -- Liam and Priya
    (204, 206, 'right'), (206, 204, 'right'),
    -- for the demo tenant's likes tab
    (203, 200, 'right'),
    (208, 200, 'right'),
    -- Éabha likes Rohan, no reply yet
    (207, 202, 'right'),
    -- skips
    (200, 205, 'left'),
    (206, 207, 'left')
) AS v(s, t, d);

-- lines up with likedByMatches in houses.json (Aanya 101, 103 / Rohan 103, 105)
INSERT INTO public.house_likes (tenant_id, house_id)
SELECT pg_temp.uid(n), house_id
FROM (VALUES
    (200, 101), (200, 102), (200, 103),
    (201, 101), (201, 103),
    (202, 103), (202, 105),
    (204, 105), (206, 107),
    (203, 106), (207, 108)
) AS v(n, house_id);

-- a is the smaller uuid in the pair, with these ids that's just the smaller number
INSERT INTO public.match_houses (match_id, house_id, shared_by, a_applied_at, b_applied_at)
SELECT m.match_id, v.house_id, pg_temp.uid(v.shared_by), v.a_applied::TIMESTAMPTZ, v.b_applied::TIMESTAMPTZ
FROM (VALUES
    -- both applied, so the trigger sends an application to Mary
    (200, 201, 103, 200, '2026-11-10 18:00+00', '2026-11-11 09:30+00'),
    -- only Aanya applied
    (200, 201, 101, 201, NULL,                  '2026-11-12 12:00+00'),
    -- Rohan shared, nobody applied yet
    (200, 202, 105, 202, NULL,                  NULL),
    -- Liam and Priya, application goes to Niamh
    (204, 206, 107, 206, '2026-11-09 10:00+00', '2026-11-09 11:00+00')
) AS v(a, b, house_id, shared_by, a_applied, b_applied)
JOIN public.matches m ON m.tenant_a_id = pg_temp.uid(v.a) AND m.tenant_b_id = pg_temp.uid(v.b);

-- demo tenant only, scores copied from the frontend mocks
INSERT INTO public.house_recommendations (tenant_id, house_id, score)
SELECT pg_temp.uid(200), house_id, score
FROM (VALUES (101, 0.94), (102, 0.91), (103, 0.88), (104, 0.84),
             (105, 0.81), (106, 0.77), (107, 0.73), (108, 0.69)) AS v(house_id, score);

INSERT INTO public.profile_recommendations (tenant_id, candidate_id, score)
SELECT pg_temp.uid(200), pg_temp.uid(n), score
FROM (VALUES (201, 0.96), (202, 0.91), (203, 0.87), (204, 0.83),
             (205, 0.79), (206, 0.74), (207, 0.70), (208, 0.65)) AS v(n, score);

-- houses went in with fixed ids, so move the sequence past them
SELECT setval(pg_get_serial_sequence('public.houses', 'house_id'), (SELECT max(house_id) FROM public.houses));

COMMIT;
