
DROP POLICY IF EXISTS "Pillar champions can read reports" ON public.reports;
CREATE POLICY "Pillar champions can read reports"
ON public.reports FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'pillar_champion'::app_role) AND (
    scope = 'university'::report_scope
    OR scope = 'per_unit'::report_scope
    OR (scope = 'per_pillar'::report_scope AND pillar = get_user_unit(auth.uid()))
  )
);
