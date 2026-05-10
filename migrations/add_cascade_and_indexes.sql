-- الملف: migrations/add_cascade_and_indexes.sql
-- النوع: Database migration / PostgreSQL + Supabase Storage
-- وظيفة الملف: يضيف cascade للgroup_members، policy لحذف audio من storage، وindexes لتحسين الأداء.
-- مستخدم بواسطة: Supabase SQL editor أو migration runner.

-- Migration: Add CASCADE deletion and performance indexes
-- This improves data integrity and query performance

-- 1. Add CASCADE deletion for group_members
-- When a group is deleted, automatically delete its members
-- هنا بنعيد تعريف foreign key بحيث حذف group يحذف membership rows المرتبطة بها.
ALTER TABLE public.group_members
DROP CONSTRAINT IF EXISTS group_members_group_id_fkey;

ALTER TABLE public.group_members
ADD CONSTRAINT group_members_group_id_fkey 
FOREIGN KEY (group_id) 
REFERENCES public.study_groups(id) 
ON DELETE CASCADE;

-- 2. Add storage delete policy for audio cleanup
-- policy دي تسمح للمستخدمين authenticated يحذفوا ملفات من bucket assignment-audio.
CREATE POLICY IF NOT EXISTS "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'assignment-audio' );

-- 3. Performance indexes for common queries
-- indexes بتسرع queries المستخدمة كثيرا في dashboards وsecurity checks.
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_group_id ON public.assignments(group_id);
CREATE INDEX IF NOT EXISTS idx_assignments_created_by ON public.assignments(created_by);
CREATE INDEX IF NOT EXISTS idx_assignments_is_active ON public.assignments(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sessions_assignment_id ON public.sessions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_results_session_id ON public.results(session_id);
CREATE INDEX IF NOT EXISTS idx_study_groups_created_by ON public.study_groups(created_by);

-- ملخص الملف:
-- - يضبط cascade بين study_groups وgroup_members.
-- - يضيف policy لحذف ملفات audio.
-- - يضيف indexes للqueries المتكررة.
