import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Moon, Sun, BarChart3, History, Home, LogIn, User, Volume2, VolumeX, Lightbulb, CornerDownLeft, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/contexts/SoundContext";
import { useEffect, useState } from "react";

export const Navigation = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, login, logout, loading } = useAuth();
  const { volume, setVolume } = useSound();
  const location = useLocation();
  const [zoomLevel, setZoomLevel] = useState(0.7);

  const isActive = (path: string) => location.pathname === path;

  // Apply zoom to #ui-content-wrapper instead of #root
  useEffect(() => {
    const wrapper = document.getElementById('ui-content-wrapper');
    if (wrapper) {
      wrapper.style.transform = `scale(${zoomLevel})`;
      // Increase width/height to compensate for scale down so it still covers the area
      wrapper.style.width = `${100 / zoomLevel}%`;
      wrapper.style.minHeight = `${100 / zoomLevel}vh`;
    }
  }, [zoomLevel]);

  const handleLinkClick = (path: string) => {
    console.log(`Navigating to ${path}`);
  };

  const handleAuth = async () => {
    try {
      if (user) {
        await logout();
      } else {
        await login();
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error("Authentication failed", {
        description: error.message || "Please check your authorized domains in Firebase Console."
      });
    }
  };

  return (
    // Z-index increased to 50 to ensure it's above the canvas background
    <nav className="w-full bg-card/80 backdrop-blur-sm border-b border-border relative z-50">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex flex-col items-start group select-none">
            <div className="bg-gradient-to-br from-primary via-primary to-accent bg-clip-text text-transparent leading-none">
              <h1 className="text-3xl md:text-4xl font-[900] tracking-tighter italic">SpellOrFail</h1>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              asChild
              className={isActive("/") ? "bg-muted" : ""}
            >
              <Link to="/" onClick={() => handleLinkClick("/")}>
                <Home className="h-5 w-5" />
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              asChild
              className={isActive("/statistics") ? "bg-muted" : ""}
            >
              <Link to="/statistics" onClick={() => handleLinkClick("/statistics")}>
                <BarChart3 className="h-5 w-5" />
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              asChild
              className={isActive("/history") ? "bg-muted" : ""}
            >
              <Link to="/history" onClick={() => handleLinkClick("/history")}>
                <History className="h-5 w-5" />
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              asChild
              className={isActive("/suggestions") ? "bg-muted" : ""}
            >
              <Link to="/suggestions" onClick={() => handleLinkClick("/suggestions")}>
                <Lightbulb className="h-5 w-5" />
              </Link>
            </Button>

            {/* Zoom Slider Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" title="Adjust Zoom">
                  <ZoomIn className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 z-50">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium leading-none flex items-center gap-2">
                      Interface Scale
                    </h4>
                    <span className="w-12 rounded-md border border-transparent px-2 py-0.5 text-right text-sm text-muted-foreground hover:border-border">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[zoomLevel]}
                    min={0.5}
                    max={1.2}
                    step={0.05}
                    onValueChange={(value) => setZoomLevel(value[0])}
                  />
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon">
                  {volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 z-50">
                <div className="flex flex-col gap-4">
                  {/* SFX Volume */}
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium leading-none flex items-center gap-2">
                      <Volume2 className="h-4 w-4" />
                      Sound Effects
                    </h4>
                    <span className="w-12 rounded-md border border-transparent px-2 py-0.5 text-right text-sm text-muted-foreground hover:border-border">
                      {Math.round(volume * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[volume]}
                    max={1}
                    step={0.01}
                    onValueChange={(value) => setVolume(value[0])}
                  />
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
            >
              {theme === "light" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </Button>

            {/* Login/Logout Button with Help Hint */}
            <div className="relative group">
              <Button
                variant={user ? "ghost" : "default"}
                size="icon"
                onClick={handleAuth}
                disabled={loading}
                title={user ? `Signed in as ${user.displayName}` : "Sign in with Google"}
              >
                {user ? (
                  user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="Profile"
                      className="h-5 w-5 rounded-full"
                    />
                  ) : (
                    <User className="h-5 w-5" />
                  )
                ) : (
                  <LogIn className="h-5 w-5" />
                )}
              </Button>

              {/* Onboarding Hint Tooltip for new users */}
              {!user && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-popover text-popover-foreground text-xs p-3 rounded-md shadow-md border border-border animate-in fade-in slide-in-from-top-1 z-50 hidden group-hover:block">
                  <p className="font-bold mb-1">Link Account</p>
                  Click here to link your Discord account and save your history forever!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
