
-- Create enums for report fields
CREATE TYPE public.reporting_period AS ENUM ('mid_year', 'end_of_year');
CREATE TYPE public.report_scope AS ENUM ('university', 'per_pillar');
CREATE TYPE public.report_type AS ENUM ('executive', 'full');

-- Create reports table
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporting_period reporting_period NOT NULL,
  scope report_scope NOT NULL,
  report_type report_type NOT NULL,
  pillar TEXT CHECK (pillar IN ('PI', 'PII', 'PIII', 'PIV', 'PV') OR pillar IS NULL),
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Enforce: university scope => no pillar, per_pillar => pillar required
  CONSTRAINT scope_pillar_check CHECK (
    (scope = 'university' AND pillar IS NULL) OR
    (scope = 'per_pillar' AND pillar IS NOT NULL)
  )
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins can manage reports"
ON public.reports FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- University viewers can read all reports
CREATE POLICY "University viewers can read all reports"
ON public.reports FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'university_viewer'));

-- Pillar champions can only read per-pillar reports for their pillar
CREATE POLICY "Pillar champions can read their pillar reports"
ON public.reports FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'pillar_champion')
  AND scope = 'per_pillar'
  AND pillar = get_user_unit(auth.uid())
);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_reports_updated_at
BEFORE UPDATE ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.update_reports_updated_at();

-- Create storage bucket for reports
INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', true);

-- Storage policies
CREATE POLICY "Anyone can read report files"
ON storage.objects FOR SELECT
USING (bucket_id = 'reports');

CREATE POLICY "Admins can upload report files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'reports' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update report files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'reports' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete report files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'reports' AND has_role(auth.uid(), 'admin'));
