
-- Create profiles table for username-based login
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username text NOT NULL UNIQUE,
  auth_email text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS: users can read own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (user_id = auth.uid());

-- RLS: admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS: admins can manage profiles
CREATE POLICY "Admins can manage profiles"
  ON public.profiles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Function to lookup auth_email by username (security definer, no auth needed)
CREATE OR REPLACE FUNCTION public.get_auth_email_by_username(_username text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth_email
  FROM public.profiles
  WHERE username = lower(_username)
  LIMIT 1
$$;
