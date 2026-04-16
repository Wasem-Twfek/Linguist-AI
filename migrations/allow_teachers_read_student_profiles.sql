-- RLS Policy: Allow teachers to read profiles of students in their groups
-- This ensures teachers can see student names and emails when viewing group members

-- Drop existing policy if it exists (idempotent)
DROP POLICY IF EXISTS "Teachers can read student profiles in their groups" ON profiles;

-- Create policy: Teachers can SELECT profiles where the profile belongs to a student
-- who is a member of a group created by the teacher
CREATE POLICY "Teachers can read student profiles in their groups"
ON profiles
FOR SELECT
TO authenticated
USING (
  -- Allow if the profile belongs to the current user (self-access)
  id = auth.uid()
  OR
  -- Allow if the profile belongs to a student who is in a group created by the teacher
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
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

