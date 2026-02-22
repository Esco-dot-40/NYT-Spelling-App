import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Trophy, Target, Flame, Calendar, Globe } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDiscord } from "@/contexts/DiscordContext";

// ... (getRank function remains same)
const getRank = (score: number, maxScore: number): string => {
  const percentage = (score / maxScore) * 100;
  if (percentage === 0) return "Beginner";
  if (percentage < 5) return "Good Start";
  if (percentage < 10) return "Moving Up";
  if (percentage < 20) return "Good";
  if (percentage < 30) return "Solid";
  if (percentage < 40) return "Nice";
  if (percentage < 50) return "Great";
  if (percentage < 60) return "Amazing";
  if (percentage < 70) return "Genius";
  if (percentage < 100) return "Queen Bee";
  return "Perfect!";
};

interface Stats {
  gamesPlayed: number;
  averageScore: number;
  bestRank: string;
  currentStreak: number;
  bestStreak: number;
}

export default function Statistics() {
  const { user, loading: authLoading } = useAuth();
  const { discordSdk } = useDiscord();
  const [leaderboardMode, setLeaderboardMode] = useState<'global' | 'server'>('global');

  // Check if we are in a guild to enable Server tab
  const isInGuild = !!discordSdk?.guildId;

  // ... (stats fetching logic remains largely the same, just keeping it here for context if replaced block is large)
  const [stats, setStats] = useState<Stats>({
    gamesPlayed: 0,
    averageScore: 0,
    bestRank: "Beginner",
    currentStreak: 0,
    bestStreak: 0,
  });
  const [loading, setLoading] = useState(true);
  const { loginWithDiscord } = useDiscord();

  useEffect(() => {
    const fetchStats = async () => {
      if (authLoading || !user) {
        if (!authLoading) setLoading(false);
        return;
      }

      try {
        let apiStats: any = {};
        try {
          const res = await fetch(`/api/stats/${user.uid}`);
          if (res.ok) apiStats = await res.json();
        } catch (e) { console.warn("API Stats Fetch Failed", e); }

        const statsKey = `spellorfail_stats_${user.uid}`;
        const prefix = `spellorfail_game_${user.uid}_`;
        const legacyPrefix = `alphabee_game_${user.uid}_`;

        let localTotalScore = 0;
        let localGameCount = 0;

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith(prefix) || key.startsWith(legacyPrefix))) {
            try {
              const data = JSON.parse(localStorage.getItem(key) || "{}");
              if (data && data.score !== undefined) {
                localTotalScore += data.score;
                localGameCount++;
              }
            } catch (e) { }
          }
        }

        const statsStr = localStorage.getItem(statsKey);
        const storedLocalStats = statsStr ? JSON.parse(statsStr) : {};

        const mergedGamesPlayed = Math.max((apiStats.games_played || 0), (storedLocalStats.games_played || localGameCount || 0));
        const mergedBestStreak = Math.max((apiStats.best_streak || 0), (storedLocalStats.best_streak || 0));
        const mergedCurrentStreak = Math.max((apiStats.current_streak || 0), (storedLocalStats.current_streak || 0));
        const avgScore = localGameCount > 0 ? Math.round(localTotalScore / localGameCount) : 0;

        setStats({
          gamesPlayed: mergedGamesPlayed,
          averageScore: avgScore,
          bestRank: (apiStats.best_rank && apiStats.best_rank !== "Beginner") ? apiStats.best_rank : (storedLocalStats.best_rank || "Beginner"),
          currentStreak: mergedCurrentStreak,
          bestStreak: mergedBestStreak,
        });

      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, authLoading]);

  const statCards = [
    { title: "Games Played", value: stats.gamesPlayed, icon: Calendar, color: "from-primary to-accent" },
    { title: "Average Score", value: stats.averageScore, icon: Target, color: "from-accent to-primary" },
    { title: "Best Rank", value: stats.bestRank, icon: Trophy, color: "from-primary to-accent" },
    { title: "Current Streak", value: `${stats.currentStreak} ${stats.currentStreak === 1 ? "day" : "days"}`, icon: Flame, color: "from-accent to-primary" },
    { title: "Best Streak", value: `${stats.bestStreak} ${stats.bestStreak === 1 ? "day" : "days"}`, icon: Flame, color: "from-primary to-accent" },
  ];

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-game-bg flex items-center justify-center">
        <div className="text-xl text-muted-foreground">Loading statistics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-game-bg pt-24 pb-12">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-8">
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {user?.displayName ? `${user.displayName}'s Statistics` : 'Your Statistics'}
          </span>
        </h1>

        {stats.gamesPlayed === 0 ? (
          <Card className="p-8 text-center text-muted-foreground bg-black/40 backdrop-blur-md border border-white/10">
            No games played yet. Start playing to see your statistics!
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {statCards.map((stat, index) => (
              <Card key={index} className="p-4 bg-black/60 backdrop-blur-md border border-white/10 shadow-lg hover:shadow-primary/20 hover:scale-[1.02] transition-all flex flex-col items-center text-center">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color} mb-3`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{stat.title}</h3>
                <p className="text-2xl font-bold bg-gradient-to-r from-primary via-white to-accent bg-clip-text text-transparent">{stat.value || 0}</p>
              </Card>
            ))}
          </div>
        )}

        {/* Sync Button — visible on web (not inside Discord iframe) */}
        {!window.location.search.includes('frame_id') && (
          <div className="mt-8 flex justify-center">
            <Card className="p-6 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 backdrop-blur-xl max-w-2xl w-full">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-center md:text-left">
                  <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2 justify-center md:justify-start">
                    <svg className="w-6 h-6 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.369a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" /></svg>
                    Sync with Discord
                  </h3>
                  <p className="text-sm text-indigo-200/80">
                    Connect your Discord account to save your progress across web & Discord and compete on the leaderboards from any device!
                  </p>
                </div>
                <button
                  onClick={() => loginWithDiscord()}
                  className="px-6 py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-full font-bold shadow-lg shadow-[#5865F2]/20 transition-all flex items-center gap-2 whitespace-nowrap active:scale-95"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.369a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" /></svg>
                  Connect Discord
                </button>
              </div>
            </Card>
          </div>
        )}

        {/* Leaderboard Section */}
        <div className="mt-12">
          <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
            <h2 className="text-2xl font-bold text-white">Leaderboard</h2>

            {/* Toggle Tabs */}
            <div className="flex bg-muted/30 p-1 rounded-lg">
              <button
                onClick={() => setLeaderboardMode('global')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${leaderboardMode === 'global' ? 'bg-primary text-primary-foreground shadow' : 'hover:bg-muted/50 text-muted-foreground'
                  }`}
              >
                <span className="flex items-center gap-2"> Global</span>
              </button>
              <button
                onClick={() => isInGuild && setLeaderboardMode('server')}
                disabled={!isInGuild}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${leaderboardMode === 'server' ? 'bg-primary text-primary-foreground shadow' : 'hover:bg-muted/50 text-muted-foreground'
                  } ${!isInGuild ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={!isInGuild ? "Launch in a Discord Server to see Server Leaderboard" : ""}
              >
                <span className="flex items-center gap-2"> Server</span>
              </button>
            </div>
          </div>

          <LeaderboardTable mode={leaderboardMode} guildId={discordSdk?.guildId || undefined} />
        </div>

      </div>
    </div>
  );
}

function LeaderboardTable({ mode, guildId }: { mode: 'global' | 'server', guildId?: string }) {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [extraStats, setExtraStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    let url = '/api/leaderboard';
    if (mode === 'server' && guildId) {
      url += `?guild_id=${guildId}`;
    }

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then(data => {
        if (data.leaders) setLeaders(data.leaders);
        else if (Array.isArray(data)) setLeaders(data); // Fallback for old API

        if (data.stats) setExtraStats(data.stats);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load leaderboard", err);
        setLoading(false);
      });
  }, [mode, guildId]);

  if (loading) return <div className="text-center text-muted-foreground py-8">Loading leaders...</div>;
  if (!leaders || !Array.isArray(leaders) || leaders.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        {mode === 'server'
          ? "No one in this server has played yet. Be the first!"
          : "No global stats yet."}
      </Card>
    );
  }

  // Calculate Highlights
  const streakMaster = [...leaders].sort((a, b) => (b.current_streak || 0) - (a.current_streak || 0))[0];
  const busyBee = [...leaders].sort((a, b) => (b.games_played || 0) - (a.games_played || 0))[0];
  const topRank = leaders[0]; // Already sorted by games_played/rank default

  return (
    <div>
      {/* Friend Highlights - Always show some global stats if available */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        {mode === 'server' && (
          <Card className="p-4 bg-yellow-500/10 border-yellow-500/20 border backdrop-blur">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <span className="font-bold text-yellow-500">Server Champion</span>
            </div>
            <div className="text-2xl font-bold truncate">{topRank?.display_name || "None"}</div>
            <div className="text-xs text-muted-foreground">Rank #1 Overall</div>
          </Card>
        )}

        <Card className="p-4 bg-orange-500/10 border-orange-500/20 border backdrop-blur">
          <div className="flex items-center gap-3 mb-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <span className="font-bold text-orange-500">Streak Master</span>
          </div>
          <div className="text-2xl font-bold truncate">{streakMaster?.display_name || "None"}</div>
          <div className="text-xs text-muted-foreground">{streakMaster?.current_streak || 0} Day Streak</div>
        </Card>

        <Card className="p-4 bg-blue-500/10 border-blue-500/20 border backdrop-blur">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-5 h-5 text-blue-500" />
            <span className="font-bold text-blue-500">Busy Bee</span>
          </div>
          <div className="text-2xl font-bold truncate">{busyBee?.display_name || "None"}</div>
          <div className="text-xs text-muted-foreground">{busyBee?.games_played || 0} Games Played</div>
        </Card>

        {extraStats && (
          <Card className="p-4 bg-emerald-500/10 border-emerald-500/20 border backdrop-blur col-span-1 md:col-span-3 lg:col-span-1">
            <div className="flex items-center gap-3 mb-2">
              <Globe className="w-5 h-5 text-emerald-500" />
              <span className="font-bold text-emerald-500">Global Trends</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total Players</span>
                <span className="font-bold">{extraStats.total_players}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Returning</span>
                <span className="font-bold text-emerald-400">{Math.round((extraStats.returning_players / extraStats.total_players) * 100)}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Avg Streak</span>
                <span className="font-bold text-orange-400">{extraStats.avg_streak}d</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Best Overall</span>
                <span className="font-bold text-yellow-400">{extraStats.best_overall_streak}d</span>
              </div>
              <div className="mt-1 pt-1 border-t border-white/5 text-[10px] text-muted-foreground truncate italic">
                Most common rank: {extraStats.most_common_rank}
              </div>
            </div>
          </Card>
        )}
      </div>

      <Card className="overflow-hidden bg-black/40 backdrop-blur border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-black/20 text-left border-b border-white/5">
                <th className="p-3 font-semibold text-foreground text-sm">#</th>
                <th className="p-3 font-semibold text-foreground text-sm">Player</th>
                <th className="p-3 font-semibold text-foreground text-sm">UID</th>
                <th className="p-3 font-semibold text-foreground text-sm text-center">Games</th>
                <th className="p-3 font-semibold text-foreground text-sm text-center">Best Rank</th>
                <th className="p-3 font-semibold text-foreground text-sm text-center">Streak</th>
                <th className="p-3 font-semibold text-foreground text-sm text-center">Best Streak</th>
                <th className="p-3 font-semibold text-foreground text-sm">Last Played</th>
              </tr>
            </thead>
            <tbody>
              {leaders.map((player, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      {i === 0 && <Trophy className="w-4 h-4 text-yellow-500" />}
                      {i === 1 && <Trophy className="w-4 h-4 text-gray-400" />}
                      {i === 2 && <Trophy className="w-4 h-4 text-amber-600" />}
                      <span className="font-mono text-muted-foreground text-sm">#{i + 1}</span>
                    </div>
                  </td>
                  <td className="p-3 font-medium text-primary">{player?.display_name || "Unknown"}</td>
                  <td className="p-3 font-mono text-[11px] text-muted-foreground">{player?.uid || "—"}</td>
                  <td className="p-3 text-center">{player?.games_played || 0}</td>
                  <td className="p-3 text-center">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {player?.best_rank || "—"}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className="flex items-center justify-center gap-1">
                      {(player?.current_streak || 0) > 0 && <Flame className="w-3 h-3 text-orange-500" />}
                      {player?.current_streak || 0}
                    </span>
                  </td>
                  <td className="p-3 text-center text-muted-foreground">{player?.best_streak || 0}</td>
                  <td className="p-3 text-xs text-muted-foreground">{player?.last_played_date ? new Date(player.last_played_date).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-white/5 text-xs text-muted-foreground text-center">
          Showing {leaders.length} players
        </div>
      </Card>
    </div>
  );
}
