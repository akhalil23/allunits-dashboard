
-- =========================================================
-- Monthly Snapshot Architecture
-- =========================================================

CREATE TABLE IF NOT EXISTS public.monthly_snapshot_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month text NOT NULL UNIQUE, -- YYYY-MM
  published_at timestamptz NOT NULL DEFAULT now(),
  total_units int NOT NULL,
  succeeded_units int NOT NULL,
  budget_included boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.monthly_unit_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES public.monthly_snapshot_publications(id) ON DELETE CASCADE,
  month text NOT NULL,
  unit_id text NOT NULL,
  view_type text NOT NULL, -- 'all' | 'cumulative' | 'yearly'
  payload jsonb NOT NULL,
  observed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (publication_id, unit_id, view_type)
);

CREATE INDEX IF NOT EXISTS idx_monthly_unit_snapshots_lookup
  ON public.monthly_unit_snapshots(month, unit_id, view_type);

CREATE TABLE IF NOT EXISTS public.monthly_budget_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL UNIQUE REFERENCES public.monthly_snapshot_publications(id) ON DELETE CASCADE,
  month text NOT NULL,
  payload jsonb NOT NULL,
  observed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.monthly_refresh_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month text NOT NULL,
  attempt_number int NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'in_progress', -- in_progress | success | failed
  duration_ms int,
  error_message text,
  units_succeeded int NOT NULL DEFAULT 0,
  units_failed int NOT NULL DEFAULT 0,
  budget_status text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  triggered_by text NOT NULL DEFAULT 'cron' -- cron | manual_admin | initial
);

CREATE INDEX IF NOT EXISTS idx_monthly_refresh_attempts_month
  ON public.monthly_refresh_attempts(month, started_at DESC);

CREATE TABLE IF NOT EXISTS public.monthly_refresh_state (
  id text PRIMARY KEY DEFAULT 'singleton' CHECK (id = 'singleton'),
  current_status text NOT NULL DEFAULT 'idle', -- idle | in_progress | pending_retry | failed | success
  active_month text,
  active_publication_id uuid REFERENCES public.monthly_snapshot_publications(id) ON DELETE SET NULL,
  last_success_at timestamptz,
  last_attempt_at timestamptz,
  attempts_this_month int NOT NULL DEFAULT 0,
  next_retry_at timestamptz,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.monthly_refresh_state (id) VALUES ('singleton')
  ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- RLS
-- =========================================================

ALTER TABLE public.monthly_snapshot_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_unit_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_budget_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_refresh_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_refresh_state ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read snapshot data (dashboard reads).
CREATE POLICY "Authenticated can read publications"
  ON public.monthly_snapshot_publications FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can read unit snapshots"
  ON public.monthly_unit_snapshots FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can read budget snapshots"
  ON public.monthly_budget_snapshots FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can read refresh state"
  ON public.monthly_refresh_state FOR SELECT TO authenticated USING (true);

-- Only admins can read raw attempt logs.
CREATE POLICY "Admins can read refresh attempts"
  ON public.monthly_refresh_attempts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- No INSERT/UPDATE/DELETE policies for non-service callers — service role bypasses RLS.
