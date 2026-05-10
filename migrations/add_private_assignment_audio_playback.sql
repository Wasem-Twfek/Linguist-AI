-- Migration: private playback for assignment audio
-- Adds a durable storage object path and limits playback to authorized users.

ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS audio_path text;

UPDATE public.sessions
SET audio_path = CASE
  WHEN audio_url LIKE '%/storage/v1/object/public/assignment-audio/%'
    THEN substring(audio_url FROM '/storage/v1/object/public/assignment-audio/(.*)$')
  WHEN audio_url IS NOT NULL AND audio_url !~* '^https?://'
    THEN trim(leading '/' FROM audio_url)
  ELSE audio_path
END
WHERE audio_path IS NULL
  AND audio_url IS NOT NULL;

UPDATE storage.buckets
SET public = false
WHERE id = 'assignment-audio';

DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Students can upload own assignment audio" ON storage.objects;
DROP POLICY IF EXISTS "Students can read own assignment audio" ON storage.objects;
DROP POLICY IF EXISTS "Students can delete own assignment audio" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can read assignment audio for owned assignments" ON storage.objects;

CREATE POLICY "Students can upload own assignment audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'assignment-audio'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Students can read own assignment audio"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'assignment-audio'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Students can delete own assignment audio"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'assignment-audio'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Teachers can read assignment audio for owned assignments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'assignment-audio'
  AND EXISTS (
    SELECT 1
    FROM public.sessions s
    JOIN public.assignments a ON a.id = s.assignment_id
    WHERE s.audio_path = storage.objects.name
      AND a.created_by = auth.uid()
  )
);
