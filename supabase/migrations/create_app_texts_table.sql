
-- Create an enum for text categories to help organize app texts
CREATE TYPE app_text_category AS ENUM (
  'homepage', 
  'fileupload', 
  'settings', 
  'auth', 
  'general'
);

-- Create the app_texts table
CREATE TABLE public.app_texts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  category app_text_category NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_app_texts_modtime
BEFORE UPDATE ON public.app_texts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Insert some default texts
INSERT INTO public.app_texts (key, value, category) VALUES
  ('homepage_title', 'Resultatanalys', 'homepage'),
  ('homepage_description', 'Med detta verktyg kan du använda en eportfil från Eventor för att hämta banlängd och antal startande. Därefter kan du spara det som en ny excelfil.', 'homepage'),
  ('fileupload_instructions', 'Exportfilen från Eventor måste redigeras först. Du ska ta bort fliken Deltagare och spara filen som en xlsx-fil.', 'fileupload'),
  ('settings_profile_title', 'Profil', 'settings'),
  ('settings_profile_description', 'Uppdatera din personliga information', 'settings');
