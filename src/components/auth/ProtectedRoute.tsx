import { Navigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/use-user-role';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { unitCode } = useParams<{ unitCode: string }>();
  const location = useLocation();
  const { data: userRole, isLoading: roleLoading } = useUserRole();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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

  // isActive check
  if (!userRole.isActive) {
    // Sign out and show disabled message
    logout();
    return <Navigate to="/login" replace />;
  }

  const isAdminRoute = location.pathname.startsWith('/admin');
  const isUniversityRoute = location.pathname.startsWith('/university');
  const isUnitsRoute = location.pathname.startsWith('/units');
  const isPillarsRoute = location.pathname.startsWith('/pillars');
  const isHealthcareRoute = location.pathname.startsWith('/healthcare');
  const isHealthcareRole =
    userRole.role === 'healthcare_admin' ||
    userRole.role === 'healthcare_executive' ||
    userRole.role === 'healthcare_viewer';

  // ──── Role-based redirect from root ────
  if (location.pathname === '/') {
    if (userRole.role === 'admin') return <Navigate to="/admin" replace />;
    if (userRole.role === 'university_viewer') return <Navigate to="/university" replace />;
    if (userRole.role === 'board_member') return <Navigate to="/university" replace />;
    if (userRole.role === 'pillar_champion') return <Navigate to="/pillars" replace />;
    if (isHealthcareRole) return <Navigate to="/healthcare" replace />;
    if (userRole.role === 'unit_user') {
      if (userRole.unitId) return <Navigate to={`/units/${userRole.unitId}`} replace />;
      logout();
      return <Navigate to="/login" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  // ──── Guard: unit_user ────
  if (userRole.role === 'unit_user') {
    if (!userRole.unitId) {
      logout();
      return <Navigate to="/login" replace />;
    }
    if (isUniversityRoute || isAdminRoute || isPillarsRoute || isHealthcareRoute) {
      return <Navigate to={`/units/${userRole.unitId}`} replace />;
    }
    if (isUnitsRoute && unitCode && unitCode !== userRole.unitId) {
      return <Navigate to={`/units/${userRole.unitId}`} replace />;
    }
  }

  // ──── Guard: university_viewer & board_member ────
  if (userRole.role === 'university_viewer' || userRole.role === 'board_member') {
    if (isUnitsRoute || isAdminRoute || isPillarsRoute || isHealthcareRoute) {
      return <Navigate to="/university" replace />;
    }
  }

  // ──── Guard: pillar_champion ────
  if (userRole.role === 'pillar_champion') {
    if (isUnitsRoute || isAdminRoute || isUniversityRoute || isHealthcareRoute) {
      return <Navigate to="/pillars" replace />;
    }
  }

  // ──── Guard: healthcare_* roles ────
  if (isHealthcareRole) {
    if (isUnitsRoute || isAdminRoute || isUniversityRoute || isPillarsRoute) {
      return <Navigate to="/healthcare" replace />;
    }
  }

  // ──── Guard: admin — allowed everywhere ────

  return <>{children}</>;
}
