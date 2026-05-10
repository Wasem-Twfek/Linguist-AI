-- الملف: migrations/add_email_to_profiles.sql
-- النوع: Database migration / PostgreSQL
-- وظيفة الملف: يضيف email column إلى profiles عشان المدرس يقدر يبحث عن الطالب بالemail.
-- مستخدم بواسطة: Supabase SQL editor أو migration runner.

-- Migration: Add email column to profiles table
-- This allows teachers to search for students by email when adding them to groups
-- The column is nullable to support existing data

-- ADD COLUMN IF NOT EXISTS يعني لو العمود موجود بالفعل، migration لا تفشل.
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index for faster email lookups
-- index يسرع البحث بالemail عند addStudentToGroup.
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Update existing profiles with email from auth.users (if accessible)
-- Note: This requires appropriate permissions. If this fails, emails will be populated
-- automatically when users sign up with the updated signup code.

-- ملخص الملف:
-- - يضيف profiles.email.
-- - يضيف index للبحث السريع.
-- - يساعد teacher يضيف student بالemail.
