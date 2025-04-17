
-- Insert missing application texts for expired runs section
INSERT INTO public.app_texts (key, value, category)
VALUES 
  ('expiredruns_title', 'Utgångna körningar (äldre än 2 år)', 'expiredruns'),
  ('expiredruns_description', 'Lista över körningar som är äldre än 2 år', 'expiredruns'),
  ('expiredruns_empty', 'Inga utgångna körningar hittades.', 'expiredruns')
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value, category = EXCLUDED.category;

-- Insert missing application texts for run details page
INSERT INTO public.app_texts (key, value, category)
VALUES 
  ('rundetails_page_title', 'Körningsdetaljer', 'rundetails'),
  ('rundetails_info_title', 'Körningsinformation', 'rundetails'),
  ('rundetails_info_description', 'Information om denna analys', 'rundetails'),
  ('rundetails_name_label', 'Namn:', 'rundetails'),
  ('rundetails_event_count_label', 'Antal evenemang:', 'rundetails'),
  ('rundetails_result_count_label', 'Antal resultat:', 'rundetails'),
  ('rundetails_date_label', 'Datum:', 'rundetails'),
  ('rundetails_total_results', 'Totalt {0} resultat för klubben', 'rundetails')
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value, category = EXCLUDED.category;

-- Update app_text_category enum to include new categories if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_text_category') THEN
        -- If the enum doesn't exist, nothing to update
        RETURN;
    END IF;

    -- Add 'expiredruns' if it doesn't exist
    BEGIN
        ALTER TYPE app_text_category ADD VALUE IF NOT EXISTS 'expiredruns';
    EXCEPTION WHEN duplicate_object THEN
        -- Value already exists, ignore
    END;

    -- Add 'rundetails' if it doesn't exist
    BEGIN
        ALTER TYPE app_text_category ADD VALUE IF NOT EXISTS 'rundetails';
    EXCEPTION WHEN duplicate_object THEN
        -- Value already exists, ignore
    END;
END$$;
