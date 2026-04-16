-- Migration: Backfill email column in profiles table from auth.users
-- This updates existing profiles with emails from auth.users table
-- Run this AFTER add_email_to_profiles.sql migration

-- Update profiles with email from auth.users
-- This uses a database function that has access to auth.users
UPDATE profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id 
  AND p.email IS NULL 
  AND au.email IS NOT NULL;

-- Verify the update
-- SELECT id, full_name, email, role FROM profiles WHERE email IS NOT NULL LIMIT 10;
