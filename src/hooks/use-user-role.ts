import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserRole {
  role: 'admin' | 'unit_user';
  unitId: string | null;
}

async function fetchUserRole(): Promise<UserRole> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: roleData } = await supabase.rpc('get_user_role', { _user_id: user.id });
  const { data: unitData } = await supabase.rpc('get_user_unit', { _user_id: user.id });

  return {
    role: (roleData as string as 'admin' | 'unit_user') || 'unit_user',
    unitId: unitData as string | null,
  };
}

export function useUserRole() {
  return useQuery<UserRole>({
    queryKey: ['user-role'],
    queryFn: fetchUserRole,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
