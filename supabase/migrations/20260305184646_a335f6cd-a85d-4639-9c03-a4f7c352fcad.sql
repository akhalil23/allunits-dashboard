
-- 1. Add 'university_viewer' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'university_viewer';

-- 2. Add is_active column to user_roles table with default true
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 3. Create/replace function to get is_active status
CREATE OR REPLACE FUNCTION public.get_user_is_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT is_active FROM public.user_roles WHERE user_id = _user_id LIMIT 1),
    false
  )
$$;
