-- Migration: Create ai_generation_logs table for rate limiting
-- This table tracks AI generation requests per user to prevent spam

CREATE TABLE IF NOT EXISTS public.ai_generation_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create index for fast rate limit queries
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_user_created 
ON public.ai_generation_logs(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.ai_generation_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own logs
CREATE POLICY "Users can view own generation logs"
ON public.ai_generation_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can insert their own logs
CREATE POLICY "Users can insert own generation logs"
ON public.ai_generation_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

