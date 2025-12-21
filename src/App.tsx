import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { DiscordProvider, useDiscord } from "@/contexts/DiscordContext";
import { SoundProvider } from "@/contexts/SoundContext";
import { Navigation } from "@/components/Navigation";
import { VelarixButton } from "@/components/VelarixButton";
import Index from "./pages/Index";
import Statistics from "./pages/Statistics";
import History from "./pages/History";
import NotFound from "./pages/NotFound";
import EffectsOverlay from "./components/EffectsOverlay";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useState, useEffect } from "react";

const queryClient = new QueryClient();

const DiscordLoadingWrapper = ({ children }: { children: React.ReactNode }) => {
  const { isLoading, error } = useDiscord();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-foreground">
        <h2 className="text-2xl font-bold mb-4">Daily Spell</h2>
        <p className="text-muted-foreground animate-pulse">Connecting to Discord...</p>
      </div>
    );
  }

  if (error && window.location.search.includes('frame_id')) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-destructive p-4 text-center">
        <h2 className="text-2xl font-bold mb-4">Connection Failed</h2>
        <p>{error}</p>
        <p className="text-sm mt-4 text-muted-foreground">Try reloading the activity.</p>
      </div>
    );
  }

  return <>{children}</>;
};

const App = () => {
  const [showLoading, setShowLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoading(false);
    }, 3000); // Show for 3 seconds

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {showLoading && <LoadingScreen />}
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <DiscordProvider>
            <AuthProvider>
              <SoundProvider>
                <EffectsOverlay />
                <Toaster />
                <Sonner />
                <DiscordLoadingWrapper>
                  <BrowserRouter>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/statistics" element={
                        <>
                          <Navigation />
                          <Statistics />
                          <VelarixButton />
                        </>
                      } />
                      <Route path="/history" element={
                        <>
                          <Navigation />
                          <History />
                          <VelarixButton />
                        </>
                      } />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </BrowserRouter>
                </DiscordLoadingWrapper>
              </SoundProvider>
            </AuthProvider>
          </DiscordProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </>
  );
};

export default App;

