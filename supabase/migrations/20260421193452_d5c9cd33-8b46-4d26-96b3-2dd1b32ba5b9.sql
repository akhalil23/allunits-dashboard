-- Create user_session_snapshots table for per-user private snapshot history
CREATE TABLE public.user_session_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  label TEXT NOT NULL DEFAULT 'Session Snapshot',
  notes TEXT,
  academic_year TEXT NOT NULL,
  term TEXT NOT NULL,
  reporting_cycle TEXT NOT NULL,
  view_type TEXT NOT NULL DEFAULT 'cumulative',
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  pillar_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  unit_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_items INTEGER NOT NULL DEFAULT 0,
  applicable_items INTEGER NOT NULL DEFAULT 0,
  on_track_pct NUMERIC NOT NULL DEFAULT 0,
  below_target_pct NUMERIC NOT NULL DEFAULT 0,
  completion_pct NUMERIC NOT NULL DEFAULT 0,
  budget_utilization NUMERIC NOT NULL DEFAULT 0,
  risk_index NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_session_snapshots_user_id ON public.user_session_snapshots(user_id);
CREATE INDEX idx_user_session_snapshots_created_at ON public.user_session_snapshots(created_at DESC);

ALTER TABLE public.user_session_snapshots ENABLE ROW LEVEL SECURITY;

-- Users can view only their own snapshots
CREATE POLICY "Users can view their own session snapshots"
  ON public.user_session_snapshots
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all (for support)
CREATE POLICY "Admins can view all session snapshots"
  ON public.user_session_snapshots
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Users can create their own snapshots
CREATE POLICY "Users can create their own session snapshots"
  ON public.user_session_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own snapshots
CREATE POLICY "Users can update their own session snapshots"
  ON public.user_session_snapshots
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own snapshots
CREATE POLICY "Users can delete their own session snapshots"
  ON public.user_session_snapshots
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Updated-at trigger
CREATE OR REPLACE FUNCTION public.update_user_session_snapshots_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_user_session_snapshots_updated_at
  BEFORE UPDATE ON public.user_session_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_session_snapshots_updated_at();

-- Grant board_member read access to university + per_pillar reports
CREATE POLICY "Board members can read reports"
  ON public.reports
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'board_member'::app_role)
    AND (scope = 'university'::report_scope OR scope = 'per_pillar'::report_scope)
  );

-- Allow board_member to insert global strategic_snapshots (existing tracker)
DROP POLICY IF EXISTS "Authenticated users can insert snapshots" ON public.strategic_snapshots;
CREATE POLICY "Authenticated users can insert snapshots"
  ON public.strategic_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (
    captured_by = auth.uid()
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'university_viewer'::app_role)
      OR public.has_role(auth.uid(), 'board_member'::app_role)
    )
  );
