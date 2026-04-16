-- Migration: Create a database function to get user by email
-- This allows looking up users by email even if email column doesn't exist in profiles
-- This function has access to auth.users table

CREATE OR REPLACE FUNCTION get_user_by_email(search_email TEXT)
RETURNS TABLE (
  id UUID,
  role TEXT,
  full_name TEXT,
  email TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.role,
    p.full_name,
    au.email
  FROM auth.users au
  INNER JOIN profiles p ON p.id = au.id
  WHERE LOWER(au.email) = LOWER(search_email);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_by_email(TEXT) TO authenticated;
