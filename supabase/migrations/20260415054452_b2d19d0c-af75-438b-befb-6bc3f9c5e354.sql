
-- Drop and recreate unit_user policy to include per_unit filtering
DROP POLICY IF EXISTS "Unit users can read all reports" ON public.reports;
DROP POLICY IF EXISTS "Unit users can read reports" ON public.reports;
CREATE POLICY "Unit users can read reports"
ON public.reports FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'unit_user'::app_role) AND (
    scope = 'university'::report_scope
    OR scope = 'per_pillar'::report_scope
    OR (scope = 'per_unit'::report_scope AND unit_id = get_user_unit(auth.uid()))
  )
);

-- Recreate pillar champion policy
DROP POLICY IF EXISTS "Pillar champions can read reports" ON public.reports;
CREATE POLICY "Pillar champions can read reports"
ON public.reports FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'pillar_champion'::app_role) AND (
    scope = 'university'::report_scope
    OR (scope = 'per_pillar'::report_scope AND pillar = get_user_unit(auth.uid()))
  )
);

-- Recreate university viewer policy
DROP POLICY IF EXISTS "University viewers can read all reports" ON public.reports;
CREATE POLICY "University viewers can read all reports"
ON public.reports FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'university_viewer'::app_role));
