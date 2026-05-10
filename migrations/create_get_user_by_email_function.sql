-- الملف: migrations/create_get_user_by_email_function.sql
-- النوع: Database migration / PostgreSQL Function
-- وظيفة الملف: ينشئ function تبحث عن user بالemail داخل auth.users وتربطه بprofiles.
-- مستخدم بواسطة: addStudentToGroup في teacher dashboard actions.

-- Migration: Create a database function to get user by email
-- This allows looking up users by email even if email column doesn't exist in profiles
-- This function has access to auth.users table

-- SECURITY DEFINER يعني function تعمل بصلاحيات مالكها، فتقدر تقرأ auth.users.
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
  -- نرجع profile info مع email من auth.users لو email مطابق.
  RETURN QUERY
  SELECT 
    p.id,
    p.role,
    p.full_name,
    au.email::TEXT
  FROM auth.users au
  INNER JOIN profiles p ON p.id = au.id
  WHERE LOWER(TRIM(au.email)) = LOWER(TRIM(search_email));
END;
$$;

-- Grant execute permission to authenticated users
-- نسمح للمستخدمين logged in ينادوا function.
GRANT EXECUTE ON FUNCTION get_user_by_email(TEXT) TO authenticated;

-- ملخص الملف:
-- - ينشئ get_user_by_email.
-- - يساعد teacher يضيف student بالemail.
-- - يستخدم auth.users وprofiles.
-- - يعطي execute permission للمستخدمين authenticated.
