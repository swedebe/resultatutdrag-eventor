
-- Fix the create_user_from_admin function to properly handle user creation
CREATE OR REPLACE FUNCTION public.create_user_from_admin(
  user_email TEXT, 
  user_password TEXT, 
  user_name TEXT, 
  user_club_name TEXT DEFAULT NULL, 
  user_role TEXT DEFAULT 'regular'
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_user_id UUID;
  caller_role TEXT;
  auth_user RECORD;
  debug_message TEXT;
BEGIN
  -- Check if the caller is a superuser
  SELECT role INTO caller_role FROM public.users WHERE id = auth.uid();
  
  IF caller_role != 'superuser' THEN
    RETURN json_build_object('success', false, 'message', 'Only superusers can create users');
  END IF;

  -- First check if a user with this email already exists in auth.users
  SELECT id INTO auth_user FROM auth.users WHERE email = user_email;
  debug_message := 'Checking for existing auth user: ' || COALESCE(auth_user.id::text, 'NULL');
  RAISE NOTICE '%', debug_message;
  
  IF auth_user IS NOT NULL THEN
    -- User exists in auth.users, check if it exists in public.users
    DECLARE
      public_user_exists BOOLEAN;
    BEGIN
      SELECT EXISTS(SELECT 1 FROM public.users WHERE id = auth_user.id) INTO public_user_exists;
      debug_message := 'User exists in auth.users, checking public.users: ' || public_user_exists;
      RAISE NOTICE '%', debug_message;
      
      IF public_user_exists THEN
        RETURN json_build_object('success', false, 'message', 'User already exists with this email');
      ELSE
        -- Add to public.users only
        INSERT INTO public.users (id, email, name, club_name, role)
        VALUES (
          auth_user.id, 
          user_email, 
          user_name, 
          COALESCE(user_club_name, 'Din klubb'), 
          user_role
        );
        RETURN json_build_object('success', true, 'user_id', auth_user.id, 'message', 'User added to public.users');
      END IF;
    END;
  END IF;

  -- Create the user in auth.users
  RAISE NOTICE 'Creating new user in auth.users: %', user_email;
  INSERT INTO auth.users (
    instance_id, 
    email, 
    encrypted_password, 
    email_confirmed_at, 
    created_at, 
    updated_at, 
    raw_app_meta_data, 
    raw_user_meta_data, 
    is_super_admin
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', 
    user_email, 
    crypt(user_password, gen_salt('bf')), 
    now(), 
    now(), 
    now(), 
    '{"provider":"email","providers":["email"]}', 
    json_build_object('name', user_name, 'club_name', user_club_name), 
    false
  ) RETURNING id INTO new_user_id;
  
  -- Debug logging
  debug_message := 'Created auth user with ID: ' || COALESCE(new_user_id::text, 'NULL');
  RAISE NOTICE '%', debug_message;
  
  IF new_user_id IS NULL THEN
    RAISE EXCEPTION 'Failed to create user in auth.users - returned NULL ID';
  END IF;
  
  -- Create the user in public.users table
  INSERT INTO public.users (id, email, name, club_name, role)
  VALUES (
    new_user_id, 
    user_email, 
    user_name, 
    COALESCE(user_club_name, 'Din klubb'), 
    user_role
  );

  RETURN json_build_object('success', true, 'user_id', new_user_id, 'message', 'User created successfully');
EXCEPTION 
  WHEN others THEN
    RAISE NOTICE 'Error creating user: %', SQLERRM;
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Create a function to populate app_texts with predefined values if they don't exist
CREATE OR REPLACE FUNCTION public.populate_app_texts() RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Delete all existing texts to ensure consistency
  DELETE FROM app_texts;
  
  -- Homepage texts
  INSERT INTO app_texts (key, value, category) VALUES
    ('main_title', 'Resultatanalys', 'homepage'),
    ('welcome_message', 'Välkommen USER', 'homepage'),
    ('tool_description', 'Med detta verktyg kan du använda en exportfil från Eventor för att hämta banlängd och antal startande. Därefter kan du spara det som en ny excelfil.', 'homepage'),
    ('file_instructions', 'Exportfilen från Eventor måste redigeras först. Du ska ta bort fliken Deltagare och spara filen som en xlsx-fil.', 'homepage'),
    ('your_runs_title', 'Dina sparade körningar', 'homepage'),
    ('your_runs_subtitle', 'Tidigare sparade körningar och analyser', 'homepage');

  -- File upload page texts
  INSERT INTO app_texts (key, value, category) VALUES
    ('upload_title', 'Resultatanalys – Filuppladdning', 'fileupload'),
    ('upload_label', 'Ladda upp resultatfil (Excel)', 'fileupload'),
    ('upload_description', 'Ladda upp en Excel-fil med resultat för att automatiskt berika dem', 'fileupload'),
    ('delay_label', 'Delay mellan anrop (sekunder):', 'fileupload'),
    ('delay_hint', '(Högre värde förhindrar rate-limiting från Eventor)', 'fileupload');

  -- Settings page texts
  INSERT INTO app_texts (key, value, category) VALUES
    ('settings_title', 'Inställningar', 'settings'),
    ('profile_settings_title', 'Profil', 'settings'),
    ('profile_settings_description', 'Uppdatera din personliga information', 'settings');

  -- Auth page texts
  INSERT INTO app_texts (key, value, category) VALUES
    ('login_title', 'Logga in', 'auth'),
    ('login_description', 'Logga in för att hantera din klubbs resultat', 'auth'),
    ('reset_password_title', 'Återställ lösenord', 'auth'),
    ('update_password_title', 'Skapa nytt lösenord', 'auth'),
    ('password_label', 'Lösenord', 'auth'),
    ('email_label', 'E-post', 'auth');
END;
$$;

-- Call the function to populate texts
SELECT public.populate_app_texts();
