DROP POLICY IF EXISTS "Pillar champions can read reports" ON public.reports;
CREATE POLICY "Pillar champions can read reports"
ON public.reports FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'pillar_champion'::app_role)
);