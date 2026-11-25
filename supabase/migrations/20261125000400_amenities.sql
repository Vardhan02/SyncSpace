-- The 15 amenities the listing form offers (AMENITIES in frontend/src/lib/onboardingOptions.ts).
-- Some were already there from the seed, those are skipped.
INSERT INTO public.amenities (name) VALUES
    ('WiFi'), ('Bills included'), ('Central heating'), ('Kitchen access'), ('Washing machine'),
    ('Dryer'), ('Dishwasher'), ('Study desk'), ('Double bed'), ('En-suite'),
    ('Garden'), ('Balcony'), ('Parking'), ('Bike storage'), ('Lift')
ON CONFLICT (name) DO NOTHING;
