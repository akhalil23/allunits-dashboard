
-- Add per_unit to report_scope enum
ALTER TYPE public.report_scope ADD VALUE IF NOT EXISTS 'per_unit';

-- Add unit_id column to reports
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS unit_id text;
