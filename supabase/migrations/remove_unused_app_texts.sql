
-- Remove unused app texts
DELETE FROM public.app_texts WHERE key = 'register_title';

-- Add login-related texts that are used
INSERT INTO public.app_texts (key, value, category)
VALUES
  ('login_title', 'Logga in', 'auth'),
  ('login_description', 'Logga in för att hantera din klubbs resultat', 'auth')
ON CONFLICT (key)
DO UPDATE SET value = EXCLUDED.value, category = EXCLUDED.category;
