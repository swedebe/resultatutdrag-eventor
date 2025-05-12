
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import AuthWrapper from "./components/AuthWrapper";
import RunDetail from "./pages/RunDetail";
import Settings from "./pages/Settings";
import EventorBatch from "./pages/EventorBatch"; // Import the new page

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/"
            element={
              <AuthWrapper>
                <Index />
              </AuthWrapper>
            }
          />
          <Route
            path="/batch-processing"
            element={
              <AuthWrapper>
                <EventorBatch />
              </AuthWrapper>
            }
          />
          <Route
            path="/run/:id"
            element={
              <AuthWrapper>
                <RunDetail />
              </AuthWrapper>
            }
          />
          <Route
            path="/settings"
            element={
              <AuthWrapper>
                <Settings />
              </AuthWrapper>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
