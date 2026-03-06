import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function LogoutPage() {
  const { logout, isAuthenticated } = useAuth();
  const [done, setDone] = useState(false);

  useEffect(() => {
    const doLogout = async () => {
      if (isAuthenticated) {
        await logout();
      }
      setDone(true);
    };
    doLogout();
  }, []); // run once on mount

  if (done || !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
