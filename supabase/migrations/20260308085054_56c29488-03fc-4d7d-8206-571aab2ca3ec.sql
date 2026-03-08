DROP POLICY "Authenticated users can insert snapshots" ON public.strategic_snapshots;
CREATE POLICY "Authenticated users can insert snapshots"
ON public.strategic_snapshots
FOR INSERT
TO authenticated
WITH CHECK (captured_by = auth.uid() AND (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'university_viewer')
));