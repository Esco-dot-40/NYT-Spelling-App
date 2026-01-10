import { GameBoard } from "@/components/GameBoard";
import { Navigation } from "@/components/Navigation";
import { Link } from "react-router-dom";
import { Lightbulb, ArrowRight, Bug } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDiscord } from "@/contexts/DiscordContext";

const Index = () => {
  const { user } = useAuth();
  const { authError } = useDiscord();
  const isDiscord = window.location.search.includes('frame_id');

  return (
    <>
      <Navigation />

      {/* Main Content Wrapper - Relative z-10 to sit above particle background */}
      <div className="relative z-10">

        {/* DEBUG: Version & Reset */}
        <div className="flex flex-col gap-1 justify-center items-center px-4 py-6 opacity-30 text-[10px] font-mono hover:opacity-100 transition-opacity">
          <div className="flex gap-4">
            <span>v1.3.1</span>
            <span>Mode: {isDiscord ? "DISCORD" : "WEB"}</span>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="text-red-400 hover:text-red-300 hover:underline cursor-pointer font-bold"
            >
              [RESET DATA]
            </button>
          </div>
          <div className="max-w-[300px] truncate text-[8px] text-center">
            Params: {window.location.search || "None"}
          </div>
        </div>

        {/* DEBUG: Auth Error Banner */}
        {isDiscord && authError && (
          <div className="mx-auto max-w-3xl px-4 pt-4">
            <div className="bg-destructive/10 border-2 border-destructive/50 text-foreground p-6 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-destructive/20 rounded-full">
                  <Bug className="w-6 h-6 text-destructive" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-destructive mb-2">Authentication Failed</h3>
                  <p className="text-sm mb-4 opacity-90">{authError}</p>

                  {/* Heuristic: If it looks like a Redirect Mismatch, show the fix */}
                  {(authError.includes('redirect_uri') || authError.includes('Redirect')) && (
                    <div className="bg-black/20 p-4 rounded-md mt-2">
                      <p className="text-xs font-mono mb-2 uppercase tracking-wider opacity-70">Action Required</p>
                      <p className="text-sm mb-2">Add this URL to your <strong>Discord Developer Portal</strong> &rarr; <strong>OAuth2</strong> &rarr; <strong>Redirects</strong>:</p>
                      <code className="block bg-black/40 p-2 rounded text-xs break-all select-all font-mono text-yellow-400">
                        {/* Try to parse out the URI if it's in the text, otherwise ask them to check server logs or infer it */}
                        {window.location.protocol}//{window.location.host}
                      </code>
                      <p className="text-xs mt-2 text-muted-foreground">(Or check the Railway logs for the exact URL the server tried to use)</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Welcome Greeting */}
        <div className="mx-auto max-w-5xl px-4 pt-6 text-center md:text-left">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Welcome back, <span className="text-primary">{user?.displayName || "Player"}</span>!
          </h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Ready to challenge your vocabulary today?
          </p>
        </div>

        {/* Suggestions Banner - Reduced padding/height for cleaner look */}
        <div className="mx-auto max-w-5xl px-4 pt-4">
          <Link to="/suggestions" className="block group">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-yellow-500/20 via-yellow-400/20 to-orange-500/20 border-2 border-yellow-500/30 hover:border-yellow-400 transition-all duration-300 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-300/10 to-transparent group-hover:animate-shimmer"></div>

              <div className="relative p-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* Icons */}
                  <div className="flex -space-x-2">
                    <div className="w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center border-2 border-black">
                      <Lightbulb className="w-6 h-6 text-black" />
                    </div>
                    <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center border-2 border-black">
                      <Bug className="w-6 h-6 text-white" />
                    </div>
                  </div>

                  {/* Text Content */}
                  <div>
                    <h3 className="text-xl font-bold text-yellow-400 mb-1">
                      Got Feedback?
                    </h3>
                    <p className="text-gray-300 text-sm">
                      Report bugs or share suggestions • <span className="text-yellow-400 font-mono">/suggestions</span>
                    </p>
                    <p className="text-gray-400 text-xs mt-1">
                      💾 Progress saves automatically
                    </p>
                  </div>
                </div>

                {/* CTA Button */}
                <div className="flex items-center gap-2 px-6 py-3 rounded-lg bg-yellow-500 text-black font-semibold group-hover:bg-yellow-400 transition-colors">
                  <span>Submit Feedback</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </Link>
        </div>

        <GameBoard />
      </div>
    </>
  );
};

export default Index;
