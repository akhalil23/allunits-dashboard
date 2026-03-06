import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import { DashboardProvider } from "@/contexts/DashboardContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import EvolutionLab from "./pages/EvolutionLab";
import Login from "./pages/Login";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import AdminPanel from "./pages/AdminPanel";
import LogoutPage from "./pages/Logout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/logout" element={<LogoutPage />} />
              {/* Root redirect — ProtectedRoute handles role-based redirect */}
              <Route path="/" element={
                <ProtectedRoute>
                  <></>
                </ProtectedRoute>
              } />
              {/* University executive dashboard */}
              <Route path="/university" element={
                <ProtectedRoute>
                  <DashboardProvider>
                    <ExecutiveDashboard />
                  </DashboardProvider>
                </ProtectedRoute>
              } />
              {/* Unit dashboards */}
              <Route path="/units/:unitCode" element={
                <ProtectedRoute>
                  <DashboardProvider>
                    <Index />
                  </DashboardProvider>
                </ProtectedRoute>
              } />
              <Route path="/units/:unitCode/evolution-lab" element={
                <ProtectedRoute>
                  <DashboardProvider>
                    <EvolutionLab />
                  </DashboardProvider>
                </ProtectedRoute>
              } />
              {/* Legacy route redirect */}
              <Route path="/unit/:unitId" element={<LegacyUnitRedirect />} />
              <Route path="/unit/:unitId/*" element={<LegacyUnitRedirect />} />
              {/* Admin */}
              <Route path="/admin" element={
                <ProtectedRoute>
                  <AdminPanel />
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

// Legacy /unit/:unitId → /units/:unitCode redirect
function LegacyUnitRedirect() {
  const params = new URL(window.location.href);
  const path = params.pathname.replace(/^\/unit\//, '/units/');
  return <Navigate to={path} replace />;
}

// Temporary placeholder for university dashboard (Phase 2)
function UniversityPlaceholder() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <h1 className="text-xl font-display font-bold text-foreground">University Executive Dashboard</h1>
        <p className="text-sm text-muted-foreground">Coming soon — being migrated to this platform.</p>
      </div>
    </div>
  );
}

export default App;
