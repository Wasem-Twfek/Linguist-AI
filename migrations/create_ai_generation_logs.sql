-- الملف: migrations/create_ai_generation_logs.sql
-- النوع: Database migration / PostgreSQL + RLS
-- وظيفة الملف: ينشئ جدول ai_generation_logs لتحديد عدد مرات توليد الدروس بالAI.
-- مستخدم بواسطة: generateAssignment في teacher dashboard actions.

-- Migration: Create ai_generation_logs table for rate limiting
-- This table tracks AI generation requests per user to prevent spam

-- الجدول يسجل user_id ووقت الطلب فقط.
CREATE TABLE IF NOT EXISTS public.ai_generation_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create index for fast rate limit queries
-- index يسرع query التي تعد الطلبات في آخر دقيقتين.
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_user_created 
ON public.ai_generation_logs(user_id, created_at DESC);

-- Enable RLS
-- تفعيل RLS عشان كل مستخدم يرى logs الخاصة به فقط.
ALTER TABLE public.ai_generation_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own logs
-- SELECT policy: المستخدم يشوف logs بتاعته فقط.
CREATE POLICY "Users can view own generation logs"
ON public.ai_generation_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can insert their own logs
-- INSERT policy: المستخدم يضيف log لنفسه فقط.
CREATE POLICY "Users can insert own generation logs"
ON public.ai_generation_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ملخص الملف:
-- - ينشئ ai_generation_logs.
-- - يستخدم للrate limiting.
-- - يضيف index سريع.
-- - يضيف RLS policies للقراءة والإضافة.

