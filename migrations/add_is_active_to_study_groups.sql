-- Migration: Add is_active column to study_groups for soft delete
-- This allows groups to be "deleted" (hidden) without removing data or violating FK constraints

ALTER TABLE study_groups 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_study_groups_is_active ON study_groups(is_active) WHERE is_active = true;

-- Update existing groups to be active (safety measure)
UPDATE study_groups SET is_active = true WHERE is_active IS NULL;
