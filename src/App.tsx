import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import { DashboardProvider } from "@/contexts/DashboardContext";
import Index from "./pages/Index";
import EvolutionLab from "./pages/EvolutionLab";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <DashboardProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/evolution-lab" element={<EvolutionLab />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </DashboardProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
