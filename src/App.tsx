import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { DiscordProvider, useDiscord } from "@/contexts/DiscordContext";
import { Navigation } from "@/components/Navigation";
import { VelarixButton } from "@/components/VelarixButton";
import Index from "./pages/Index";
import Statistics from "./pages/Statistics";
import History from "./pages/History";
import NotFound from "./pages/NotFound";

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <DiscordProvider>
        <AuthProvider>
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
        </AuthProvider>
      </DiscordProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
