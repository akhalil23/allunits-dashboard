-- Allow unit_users to read all reports
CREATE POLICY "Unit users can read all reports"
ON public.reports FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'unit_user'::app_role));

-- Drop old restrictive pillar champion policy
DROP POLICY IF EXISTS "Pillar champions can read their pillar reports" ON public.reports;

-- Recreate: pillar champions can read university reports AND their own pillar reports
CREATE POLICY "Pillar champions can read reports"
ON public.reports FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'pillar_champion'::app_role) AND (
    scope = 'university'::report_scope
    OR (scope = 'per_pillar'::report_scope AND pillar = get_user_unit(auth.uid()))
  )
);