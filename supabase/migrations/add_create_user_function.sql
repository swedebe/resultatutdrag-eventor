
-- Create a function that safely creates a user if they don't exist
-- This function uses ON CONFLICT DO NOTHING to prevent duplicate key errors
CREATE OR REPLACE FUNCTION public.create_user_if_not_exists(
  user_id uuid,
  user_email text,
  user_club_name text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (id, email, club_name)
  VALUES (user_id, user_email, user_club_name)
  ON CONFLICT (email) DO NOTHING;
  
  RETURN TRUE;
END;
$$;
