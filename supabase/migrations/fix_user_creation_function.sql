
-- Fix the create_user_from_admin function to properly handle user creation with more debugging
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
  existing_user_id UUID;
  debug_message TEXT;
BEGIN
  -- Check if the caller is a superuser
  SELECT role INTO caller_role FROM public.users WHERE id = auth.uid();
  RAISE LOG 'User with ID % attempting to create user, has role: %', auth.uid(), caller_role;
  
  IF caller_role != 'superuser' THEN
    RAISE LOG 'Permission denied: User is not a superuser';
    RETURN json_build_object('success', false, 'message', 'Only superusers can create users');
  END IF;

  -- First check if a user with this email already exists
  SELECT id INTO existing_user_id FROM auth.users WHERE email = user_email;
  
  IF existing_user_id IS NOT NULL THEN
    RAISE LOG 'User with email % already exists with ID %', user_email, existing_user_id;
    RETURN json_build_object('success', false, 'message', 'User with this email already exists');
  END IF;

  -- Create the user in auth.users with explicit error handling
  BEGIN
    RAISE LOG 'Creating new user in auth.users with email: %', user_email;
    
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
    ) 
    VALUES (
      '00000000-0000-0000-0000-000000000000', 
      user_email, 
      crypt(user_password, gen_salt('bf')), 
      now(), 
      now(), 
      now(), 
      '{"provider":"email","providers":["email"]}', 
      jsonb_build_object('name', user_name, 'club_name', user_club_name), 
      false
    ) 
    RETURNING id INTO new_user_id;
    
    -- Debug logging for new_user_id
    debug_message := 'Created auth user with ID: ' || COALESCE(new_user_id::text, 'NULL');
    RAISE LOG '%', debug_message;
    
    IF new_user_id IS NULL THEN
      RAISE EXCEPTION 'Failed to create user in auth.users - returned NULL ID';
    END IF;
    
    -- Now create the user in public.users table
    RAISE LOG 'Creating user in public.users with ID: %', new_user_id;
    
    INSERT INTO public.users (id, email, name, club_name, role)
    VALUES (
      new_user_id, 
      user_email, 
      user_name, 
      COALESCE(user_club_name, 'Din klubb'), 
      user_role
    );
    
    RAISE LOG 'Successfully created user with ID % in both auth and public tables', new_user_id;
    RETURN json_build_object('success', true, 'user_id', new_user_id, 'message', 'User created successfully');
  
  EXCEPTION 
    WHEN unique_violation THEN
      RAISE LOG 'Unique violation creating user: %', SQLERRM;
      RETURN json_build_object('success', false, 'message', 'User with this email already exists');
    WHEN others THEN
      RAISE LOG 'Error creating user: % - %', SQLERRM, SQLSTATE;
      RETURN json_build_object('success', false, 'message', SQLERRM);
  END;
END;
$$;

-- Update AddUserForm to include a component that we can use to display errors in the client
