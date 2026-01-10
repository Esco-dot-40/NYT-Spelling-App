import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { DiscordProvider, useDiscord } from "@/contexts/DiscordContext";
import { SoundProvider } from "@/contexts/SoundContext";
import { Navigation } from "@/components/Navigation";
import Index from "./pages/Index";
import Statistics from "./pages/Statistics";
import History from "./pages/History";
import Suggestions from "./pages/Suggestions";
import NotFound from "./pages/NotFound";
import Analytics from "./pages/Analytics";
import EffectsOverlay from "./components/EffectsOverlay";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useState, useEffect } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";

// Analytics Tracker Component
const AnalyticsTracker = () => {
  useAnalytics();
  return null;
};

const queryClient = new QueryClient();

const DiscordLoadingWrapper = ({ children }: { children: React.ReactNode }) => {
  const { isLoading, error } = useDiscord();
  const [forceShow, setForceShow] = useState(false);

  useEffect(() => {
    // If still loading after 4 seconds, just show the app
    const timer = setTimeout(() => {
      setForceShow(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading && !forceShow) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-foreground z-50 relative">
        <h2 className="text-2xl font-bold mb-4">SpellOrFail</h2>
        <p className="text-muted-foreground animate-pulse">Connecting to Discord...</p>
      </div>
    );
  }

  if (error && window.location.search.includes('frame_id') && !forceShow) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-destructive p-4 text-center z-50 relative">
        <h2 className="text-2xl font-bold mb-4">Connection Failed</h2>
        <p>{error}</p>
        <p className="text-sm mt-4 text-muted-foreground">Try reloading the activity.</p>
        <button
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          onClick={() => setForceShow(true)}
        >
          Continue Anyway
        </button>
      </div>
    );
  }

  // Removed transition-transform and origin-top to support CSS 'zoom' scaling
  return <div id="ui-content-wrapper" className="w-full">{children}</div>;
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
      <EffectsOverlay /> {/* Background stays OUTSIDE the zoomed wrapper */}

      {showLoading && <LoadingScreen />} {/* Loading Screen stays OUTSIDE the zoomed wrapper */}

      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <DiscordProvider>
            <AuthProvider>
              <SoundProvider>
                <Toaster />
                <Sonner />

                {/* The Wrapper controls the zoom of the UI */}
                <DiscordLoadingWrapper>
                  <BrowserRouter>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/statistics" element={
                        <>
                          <Navigation />
                          <Statistics />
                        </>
                      } />
                      <Route path="/history" element={
                        <>
                          <Navigation />
                          <History />
                        </>
                      } />
                      <Route path="/suggestions" element={
                        <>
                          <Navigation />
                          <Suggestions />
                        </>
                      } />
                      <Route path="/analytics" element={<Analytics />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                    <AnalyticsTracker />
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
