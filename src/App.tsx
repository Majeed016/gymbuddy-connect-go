
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import RequireAuth from "@/components/RequireAuth";
import RequireFitnessProfile from "@/components/RequireFitnessProfile";
import Header from "@/components/Header";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import SetupProfile from "./pages/SetupProfile";
import SetupFitnessProfile from "./pages/SetupFitnessProfile";
import Profile from "./pages/Profile";
import Matches from "./pages/Matches";
import Chat from "./pages/Chat";
import Workouts from "./pages/Workouts";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/setup-profile" element={
                  <RequireAuth>
                    <SetupProfile />
                  </RequireAuth>
                } />
                <Route path="/setup-fitness-profile" element={
                  <RequireAuth>
                    <SetupFitnessProfile />
                  </RequireAuth>
                } />
                <Route path="/profile" element={
                  <RequireAuth>
                    <Profile />
                  </RequireAuth>
                } />
                <Route path="/matches" element={
                  <RequireAuth>
                    <RequireFitnessProfile>
                      <Matches />
                    </RequireFitnessProfile>
                  </RequireAuth>
                } />
                <Route path="/chat" element={
                  <RequireAuth>
                    <RequireFitnessProfile>
                      <Chat />
                    </RequireFitnessProfile>
                  </RequireAuth>
                } />
                <Route path="/workouts" element={
                  <RequireAuth>
                    <RequireFitnessProfile>
                      <Workouts />
                    </RequireFitnessProfile>
                  </RequireAuth>
                } />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
