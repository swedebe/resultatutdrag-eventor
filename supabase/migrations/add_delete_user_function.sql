
-- This function is no longer used as we're now using an Edge Function for user deletion
-- The Edge Function approach provides better security and flexibility

-- Create function to delete a user from auth.users (must be run as superuser)
CREATE OR REPLACE FUNCTION public.delete_user(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- Check if the caller is a superuser
  SELECT role INTO caller_role FROM public.users WHERE id = auth.uid();
  
  IF caller_role != 'superuser' THEN
    RAISE EXCEPTION 'Only superusers can delete users';
  END IF;

  -- Delete the user from auth.users
  DELETE FROM auth.users WHERE id = user_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;
