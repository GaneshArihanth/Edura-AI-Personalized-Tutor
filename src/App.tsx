import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TranslationProvider } from "@/components/TranslationProvider";
import { Navbar } from "@/components/Navbar";
import { useUserStore } from "@/store/userStore";
import { initializeAuth } from "@/services/authService";
import { TelemetryProvider } from "@/contexts/TelemetryContext";
import { useTelemetry } from "@/hooks/useTelemetry";
import { AmbientTutor } from "@/components/AmbientTutor";
import { FloatingChatbot } from "@/components/FloatingChatBot";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AIBot from "./pages/AIBot";
import Roadmap from "./pages/Roadmap";
import Notes from "./pages/Notes";
import FocusRoom from "./pages/FocusRoom";
import StudyVR from "./pages/StudyVR";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import Community from "./pages/Community";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import StudyPlanner from "./pages/StudyPlanner";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function RouteTracker() {
  const location = useLocation();
  const { trackEvent } = useTelemetry();

  useEffect(() => {
    trackEvent('page_view', { path: location.pathname });
  }, [location.pathname, trackEvent]);

  return null;
}

const App = () => {
  useEffect(() => {
    // Initialize auth state on app load
    initializeAuth();
  }, []);
  // Subscribe to DND mode to dim the main interface
  const dndMode = useUserStore((state) => state.dndMode);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TranslationProvider>
          <TooltipProvider>
            <TelemetryProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter
                future={{
                  v7_relativeSplatPath: true,
                  v7_startTransition: true,
                }}
              >
              <RouteTracker />
              <AmbientTutor />
              <FloatingChatbot />
              <div className="flex min-h-screen flex-col pt-20 relative">
                <div className="fixed inset-0 -z-50 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background"></div>
              <Navbar />
              <main className={`flex-1 transition-all duration-1000 ${dndMode ? 'brightness-50 saturate-50' : ''}`}>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/ai-bot"
                    element={
                      <ProtectedRoute>
                        <AIBot />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/roadmap"
                    element={
                      <ProtectedRoute>
                        <Roadmap />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/notes"
                    element={
                      <ProtectedRoute>
                        <Notes />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/focus"
                    element={
                      <ProtectedRoute>
                        <FocusRoom />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/study-vr"
                    element={
                      <ProtectedRoute>
                        <StudyVR />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/courses"
                    element={
                      <ProtectedRoute>
                        <Courses />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/courses/:courseId"
                    element={
                      <ProtectedRoute>
                        <CourseDetail />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/community"
                    element={
                      <ProtectedRoute>
                        <Community />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/analytics"
                    element={
                      <ProtectedRoute>
                        <Analytics />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/study-planner"
                    element={
                      <ProtectedRoute>
                        <StudyPlanner />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute>
                        <Settings />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
           </BrowserRouter>
          </TelemetryProvider>
        </TooltipProvider>
      </TranslationProvider>
    </ThemeProvider>
  </QueryClientProvider>
  );
};

export default App;
