import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserRole {
  role: 'admin' | 'unit_user' | 'university_viewer';
  unitId: string | null;
  isActive: boolean;
}

async function fetchUserRole(userId: string): Promise<UserRole> {
  const [{ data: roleData }, { data: unitData }, { data: isActiveData }] = await Promise.all([
    supabase.rpc('get_user_role', { _user_id: userId }),
    supabase.rpc('get_user_unit', { _user_id: userId }),
    supabase.rpc('get_user_is_active', { _user_id: userId }),
  ]);

  return {
    role: (roleData as string as 'admin' | 'unit_user' | 'university_viewer') || 'unit_user',
    unitId: unitData as string | null,
    isActive: isActiveData as boolean ?? true,
  };
}

export function useUserRole() {
  const { user } = useAuth();

  return useQuery<UserRole>({
    queryKey: ['user-role', user?.id],
    queryFn: () => fetchUserRole(user!.id),
    enabled: !!user?.id,
    staleTime: 0,
    retry: 1,
  });
}
