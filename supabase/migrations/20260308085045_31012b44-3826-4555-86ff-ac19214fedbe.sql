CREATE TABLE public.strategic_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  captured_by UUID NOT NULL,
  reporting_cycle TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  term TEXT NOT NULL,
  view_type TEXT NOT NULL DEFAULT 'cumulative',
  completion_pct NUMERIC NOT NULL DEFAULT 0,
  risk_index NUMERIC NOT NULL DEFAULT 0,
  budget_utilization NUMERIC NOT NULL DEFAULT 0,
  on_track_pct NUMERIC NOT NULL DEFAULT 0,
  below_target_pct NUMERIC NOT NULL DEFAULT 0,
  applicable_items INTEGER NOT NULL DEFAULT 0,
  total_items INTEGER NOT NULL DEFAULT 0,
  pillar_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  unit_data JSONB NOT NULL DEFAULT '[]'::jsonb
);

ALTER TABLE public.strategic_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read snapshots"
ON public.strategic_snapshots
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert snapshots"
ON public.strategic_snapshots
FOR INSERT
TO authenticated
WITH CHECK (captured_by = auth.uid());