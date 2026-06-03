-- Restrict internal refresh state and publication metadata to admins only
DROP POLICY IF EXISTS "Authenticated can read refresh state" ON public.monthly_refresh_state;
CREATE POLICY "Admins can read refresh state"
ON public.monthly_refresh_state
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated can read publications" ON public.monthly_snapshot_publications;
CREATE POLICY "Admins can read publications"
ON public.monthly_snapshot_publications
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));