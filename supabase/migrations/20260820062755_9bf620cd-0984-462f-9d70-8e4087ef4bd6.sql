
CREATE TABLE public.hc_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  source_sheet text NOT NULL,
  goal_scope text NOT NULL DEFAULT 'Goal 3',
  imported_by uuid,
  imported_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active',
  row_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  warning_count integer NOT NULL DEFAULT 0,
  notes text
);

CREATE TABLE public.hc_periods (
  code text PRIMARY KEY,
  label text NOT NULL,
  sort_order integer NOT NULL,
  is_current boolean NOT NULL DEFAULT false
);

CREATE TABLE public.hc_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code integer NOT NULL UNIQUE,
  title text NOT NULL,
  champion text,
  display_order integer NOT NULL DEFAULT 0,
  import_batch_id uuid REFERENCES public.hc_import_batches(id) ON DELETE SET NULL,
  first_seen_batch_id uuid REFERENCES public.hc_import_batches(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.hc_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.hc_goals(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  action_kpi_text text,
  spoc text,
  display_order integer NOT NULL DEFAULT 0,
  import_batch_id uuid REFERENCES public.hc_import_batches(id) ON DELETE SET NULL,
  first_seen_batch_id uuid REFERENCES public.hc_import_batches(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.hc_action_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES public.hc_actions(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  intent text,
  owner text,
  priority integer,
  responsible text,
  accountable text,
  consulted text,
  informed text,
  display_order integer NOT NULL DEFAULT 0,
  source_row integer,
  import_batch_id uuid REFERENCES public.hc_import_batches(id) ON DELETE SET NULL,
  first_seen_batch_id uuid REFERENCES public.hc_import_batches(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.hc_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id uuid NOT NULL REFERENCES public.hc_action_steps(id) ON DELETE CASCADE,
  original_text text,
  kpi_type text,
  target_value numeric,
  target_value_raw text,
  target_unit text,
  target_date_raw text,
  direction text NOT NULL DEFAULT 'unvalidated',
  measurable boolean NOT NULL DEFAULT false,
  import_batch_id uuid REFERENCES public.hc_import_batches(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.hc_quarterly_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id uuid NOT NULL REFERENCES public.hc_action_steps(id) ON DELETE CASCADE,
  period_code text NOT NULL REFERENCES public.hc_periods(code),
  status text,
  execution_progress_pct numeric,
  kpi_actual_value numeric,
  kpi_actual_raw text,
  blocker_flag text,
  blocker_category text,
  blocker_details text,
  next_milestone text,
  expected_milestone_date_raw text,
  comments text,
  evidence text,
  import_batch_id uuid REFERENCES public.hc_import_batches(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (step_id, period_code, import_batch_id)
);

CREATE TABLE public.hc_budget_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id uuid NOT NULL REFERENCES public.hc_action_steps(id) ON DELETE CASCADE,
  year_label text NOT NULL,
  amount numeric,
  amount_raw text,
  note text,
  import_batch_id uuid REFERENCES public.hc_import_batches(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (step_id, year_label, import_batch_id)
);

CREATE TABLE public.hc_validation_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.hc_import_batches(id) ON DELETE CASCADE,
  severity text NOT NULL,
  issue_code text NOT NULL,
  message text NOT NULL,
  row_ref text,
  field text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.hc_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hc_import_batches TO authenticated;
GRANT ALL ON public.hc_import_batches TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hc_periods TO authenticated;
GRANT ALL ON public.hc_periods TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hc_goals TO authenticated;
GRANT ALL ON public.hc_goals TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hc_actions TO authenticated;
GRANT ALL ON public.hc_actions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hc_action_steps TO authenticated;
GRANT ALL ON public.hc_action_steps TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hc_kpis TO authenticated;
GRANT ALL ON public.hc_kpis TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hc_quarterly_updates TO authenticated;
GRANT ALL ON public.hc_quarterly_updates TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hc_budget_years TO authenticated;
GRANT ALL ON public.hc_budget_years TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hc_validation_issues TO authenticated;
GRANT ALL ON public.hc_validation_issues TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hc_config TO authenticated;
GRANT ALL ON public.hc_config TO service_role;

ALTER TABLE public.hc_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hc_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hc_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hc_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hc_action_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hc_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hc_quarterly_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hc_budget_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hc_validation_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hc_config ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.hc_can_read(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role)
      OR public.has_role(_user_id, 'healthcare_admin'::app_role)
      OR public.has_role(_user_id, 'healthcare_executive'::app_role)
      OR public.has_role(_user_id, 'healthcare_viewer'::app_role)
$$;

CREATE OR REPLACE FUNCTION public.hc_can_write(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role)
      OR public.has_role(_user_id, 'healthcare_admin'::app_role)
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['hc_import_batches','hc_periods','hc_goals','hc_actions','hc_action_steps','hc_kpis','hc_quarterly_updates','hc_budget_years','hc_validation_issues','hc_config']
  LOOP
    EXECUTE format('CREATE POLICY "Healthcare users can read %1$s" ON public.%1$s FOR SELECT TO authenticated USING (public.hc_can_read(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "Healthcare admins can manage %1$s" ON public.%1$s FOR ALL TO authenticated USING (public.hc_can_write(auth.uid())) WITH CHECK (public.hc_can_write(auth.uid()))', t);
  END LOOP;
END $$;
