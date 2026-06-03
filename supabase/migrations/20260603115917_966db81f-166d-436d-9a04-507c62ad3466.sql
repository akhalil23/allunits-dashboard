
-- 1) Harden has_role and get_user_unit to ignore deactivated roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_unit(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT unit_id
  FROM public.user_roles
  WHERE user_id = _user_id
    AND is_active = true
  LIMIT 1
$$;

-- 2) Restrict snapshot tables to admin only (reads happen via service role in edge functions)
DROP POLICY IF EXISTS "Authenticated can read unit snapshots" ON public.monthly_unit_snapshots;
CREATE POLICY "Admins can read unit snapshots"
ON public.monthly_unit_snapshots FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated can read budget snapshots" ON public.monthly_budget_snapshots;
CREATE POLICY "Admins can read budget snapshots"
ON public.monthly_budget_snapshots FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3) Restrict strategic_snapshots reads to roles that already may insert them
DROP POLICY IF EXISTS "Authenticated users can read snapshots" ON public.strategic_snapshots;
CREATE POLICY "Authorized roles can read strategic snapshots"
ON public.strategic_snapshots FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'university_viewer'::app_role)
  OR public.has_role(auth.uid(), 'board_member'::app_role)
);

-- 4) Replace the open "Anyone can read report files" storage policy with one
--    that mirrors the row-level access rules already enforced on public.reports.
DROP POLICY IF EXISTS "Anyone can read report files" ON storage.objects;
CREATE POLICY "Authorized users can read report files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'reports'
  AND EXISTS (
    SELECT 1
    FROM public.reports r
    WHERE r.file_path = storage.objects.name
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'university_viewer'::app_role)
        OR public.has_role(auth.uid(), 'pillar_champion'::app_role)
        OR (
          public.has_role(auth.uid(), 'board_member'::app_role)
          AND r.scope IN ('university'::report_scope, 'per_pillar'::report_scope)
        )
        OR (
          public.has_role(auth.uid(), 'unit_user'::app_role)
          AND (
            r.scope IN ('university'::report_scope, 'per_pillar'::report_scope)
            OR (r.scope = 'per_unit'::report_scope AND r.unit_id = public.get_user_unit(auth.uid()))
          )
        )
      )
  )
);
