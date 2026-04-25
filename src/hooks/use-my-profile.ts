/**
 * useMyProfile — Returns the current user's profile (display name, username).
 * Used to render personalized greetings (e.g. "Welcome, Mr. Mike Ahmar").
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MyProfile {
  user_id: string;
  username: string;
  display_name: string | null;
  auth_email: string;
}

export function useMyProfile() {
  const { user } = useAuth();

  return useQuery<MyProfile | null>({
    queryKey: ['my-profile', user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, auth_email')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as MyProfile | null;
    },
  });
}
