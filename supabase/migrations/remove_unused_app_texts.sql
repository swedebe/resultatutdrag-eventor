
-- Remove unused app texts
DELETE FROM public.app_texts WHERE key = 'register_title';

-- Add login-related texts that are used
INSERT INTO public.app_texts (key, value, category)
VALUES
  ('login_title', 'Logga in', 'auth'),
  ('login_description', 'Logga in för att hantera din klubbs resultat', 'auth'),
  ('reset_password_title', 'Återställ lösenord', 'auth'),
  ('update_password_title', 'Skapa nytt lösenord', 'auth'),
  ('password_label', 'Lösenord', 'auth'),
  ('email_label', 'E-post', 'auth')
ON CONFLICT (key)
DO UPDATE SET value = EXCLUDED.value, category = EXCLUDED.category;
