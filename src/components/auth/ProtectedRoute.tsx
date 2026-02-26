import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/use-user-role';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { unitId } = useParams<{ unitId: string }>();
  const { data: userRole, isLoading: roleLoading } = useUserRole();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Still loading role
  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // No role assigned yet
  if (!userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <p className="text-sm text-foreground font-medium">Access not configured</p>
          <p className="text-xs text-muted-foreground">Please contact an administrator to assign your role.</p>
        </div>
      </div>
    );
  }

  // No unitId in URL → redirect to user's default unit
  if (!unitId) {
    if (userRole.role === 'admin') {
      return <Navigate to="/unit/GSR" replace />;
    }
    if (userRole.unitId) {
      return <Navigate to={`/unit/${userRole.unitId}`} replace />;
    }
    return <Navigate to="/login" replace />;
  }

  // unit_user trying to access a different unit
  if (userRole.role === 'unit_user' && userRole.unitId && unitId !== userRole.unitId) {
    return <Navigate to={`/unit/${userRole.unitId}`} replace />;
  }

  return <>{children}</>;
}
