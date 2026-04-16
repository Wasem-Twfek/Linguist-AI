-- Migration: Add email column to profiles table
-- This allows teachers to search for students by email when adding them to groups
-- The column is nullable to support existing data

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Update existing profiles with email from auth.users (if accessible)
-- Note: This requires appropriate permissions. If this fails, emails will be populated
-- automatically when users sign up with the updated signup code.
