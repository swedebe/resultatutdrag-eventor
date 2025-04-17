
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

-- Insert missing application texts for expired runs
INSERT INTO public.app_texts (key, value, category)
VALUES 
  ('expiredruns_title', 'Utgångna körningar (äldre än 2 år)', 'expiredruns'),
  ('expiredruns_description', 'Lista över körningar som är äldre än 2 år', 'expiredruns'),
  ('expiredruns_empty', 'Inga utgångna körningar hittades.', 'expiredruns')
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value, category = EXCLUDED.category;
