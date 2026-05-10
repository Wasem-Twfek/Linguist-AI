-- الملف: migrations/allow_teachers_read_student_profiles.sql
-- النوع: Database migration / RLS Policy
-- وظيفة الملف: يسمح للمدرس يقرأ profiles للطلاب الموجودين في groups التي أنشأها.
-- مستخدم بواسطة: Supabase SQL editor أو migration runner.

-- RLS Policy: Allow teachers to read profiles of students in their groups
-- This ensures teachers can see student names and emails when viewing group members

-- Drop existing policy if it exists (idempotent)
-- نحذف policy القديمة بنفس الاسم لو موجودة عشان نعيد إنشاءها بأمان.
DROP POLICY IF EXISTS "Teachers can read student profiles in their groups" ON profiles;

-- Create policy: Teachers can SELECT profiles where the profile belongs to a student
-- who is a member of a group created by the teacher
CREATE POLICY "Teachers can read student profiles in their groups"
ON profiles
FOR SELECT
TO authenticated
USING (
  -- Allow if the profile belongs to the current user (self-access)
  -- المستخدم يقدر يشوف profile بتاعه.
  id = auth.uid()
  OR
  -- Allow if the profile belongs to a student who is in a group created by the teacher
  -- المدرس يقدر يشوف student profile لو الطالب في group يملكها المدرس.
  EXISTS (
    SELECT 1
    FROM group_members gm
    INNER JOIN study_groups sg ON gm.group_id = sg.id
    WHERE gm.user_id = profiles.id
      AND sg.created_by = auth.uid()
      AND profiles.role = 'student'
  )
);

-- Ensure RLS is enabled on profiles table
-- RLS لازم يكون enabled عشان policies تطبق.
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ملخص الملف:
-- - يضيف policy على profiles.
-- - يسمح self-access.
-- - يسمح للteacher يشوف طلاب groups بتاعته.
-- - مهم لعرض أسماء الطلاب في group members dialog.

