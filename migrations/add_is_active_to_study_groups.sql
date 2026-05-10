-- الملف: migrations/add_is_active_to_study_groups.sql
-- النوع: Database migration / PostgreSQL
-- وظيفة الملف: يضيف is_active إلى study_groups عشان ندعم soft delete.
-- مستخدم بواسطة: Supabase SQL editor أو migration runner.

-- Migration: Add is_active column to study_groups for soft delete
-- This allows groups to be "deleted" (hidden) without removing data or violating FK constraints

-- is_active=true يعني group ظاهرة، false يعني مخفية بدون حذف بياناتها.
ALTER TABLE study_groups 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;

-- Create index for faster filtering
-- index يساعد queries التي تجيب active groups فقط.
CREATE INDEX IF NOT EXISTS idx_study_groups_is_active ON study_groups(is_active) WHERE is_active = true;

-- Update existing groups to be active (safety measure)
-- أي groups قديمة تصبح active افتراضيا.
UPDATE study_groups SET is_active = true WHERE is_active IS NULL;

-- ملخص الملف:
-- - يضيف soft delete للgroups.
-- - يحافظ على history بدلا من الحذف النهائي.
-- - يسرع filtering للgroups النشطة.
