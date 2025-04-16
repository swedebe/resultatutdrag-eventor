
-- Fix the create_user_from_admin function to properly handle existing users
CREATE OR REPLACE FUNCTION public.create_user_from_admin(
  user_email TEXT, 
  user_password TEXT, 
  user_name TEXT, 
  user_club_name TEXT DEFAULT NULL, 
  user_role TEXT DEFAULT 'regular'
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_user_id UUID;
  existing_auth_user UUID;
  caller_role TEXT;
  debug_message TEXT;
BEGIN
  -- Check if the caller is a superuser
  SELECT role INTO caller_role FROM public.users WHERE id = auth.uid();
  
  IF caller_role != 'superuser' THEN
    RETURN json_build_object('success', false, 'message', 'Only superusers can create users');
  END IF;

  -- First check if a user with this email already exists in auth.users
  SELECT id INTO existing_auth_user FROM auth.users WHERE email = user_email LIMIT 1;
  RAISE NOTICE 'Checking if user with email % exists in auth.users: %', user_email, existing_auth_user;
  
  IF existing_auth_user IS NOT NULL THEN
    -- Check if this user already exists in public.users
    DECLARE
      existing_public_user UUID;
    BEGIN
      SELECT id INTO existing_public_user FROM public.users WHERE id = existing_auth_user;
      RAISE NOTICE 'Checking if user exists in public.users: %', existing_public_user;
      
      IF existing_public_user IS NOT NULL THEN
        -- User exists in both auth and public tables
        RETURN json_build_object('success', false, 'message', 'User with this email already exists');
      ELSE
        -- User exists in auth but not in public, we can add them to public.users
        RAISE NOTICE 'User exists in auth.users but not public.users. Adding to public.users with ID: %', existing_auth_user;
        INSERT INTO public.users (id, email, name, club_name, role)
        VALUES (
          existing_auth_user, 
          user_email, 
          user_name, 
          COALESCE(user_club_name, 'Din klubb'), 
          user_role
        );
        
        RETURN json_build_object('success', true, 'user_id', existing_auth_user, 'message', 'User added to public.users');
      END IF;
    END;
  END IF;
  
  -- If we got here, user does not exist in auth.users, so create new user
  BEGIN
    RAISE NOTICE 'Creating new user in auth.users with email: %', user_email;
    
    -- Create the user in auth.users - Use explicit variable to capture the INSERT result
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
    
    -- Debug logging for new_user_id
    debug_message := 'After auth.users INSERT, new_user_id = ' || COALESCE(new_user_id::text, 'NULL');
    RAISE NOTICE '%', debug_message;
    
    IF new_user_id IS NULL THEN
      RAISE NOTICE 'Failed to create user in auth.users, returning error';
      RETURN json_build_object('success', false, 'message', 'Failed to create auth user - ID is NULL');
    END IF;
    
    -- Create the user in public.users table
    RAISE NOTICE 'Creating user in public.users with ID: %', new_user_id;
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
    WHEN unique_violation THEN
      -- This might happen if the user was created in auth.users in a concurrent operation
      RAISE NOTICE 'Unique violation error creating user: %', SQLERRM;
      RETURN json_build_object('success', false, 'message', 'User with this email already exists');
    WHEN others THEN
      RAISE NOTICE 'Error creating user: %', SQLERRM;
      RETURN json_build_object('success', false, 'message', SQLERRM);
  END;
END;
$$;
