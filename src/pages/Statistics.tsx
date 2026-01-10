import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Trophy, Target, Flame, Calendar, Users, Globe } from "lucide-react";
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
    <div className="min-h-screen bg-game-bg">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-8">
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {user?.displayName ? `${user.displayName}'s Statistics` : 'Your Statistics'}
          </span>
        </h1>

        {stats.gamesPlayed === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            No games played yet. Start playing to see your statistics!
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {statCards.map((stat, index) => (
              <Card key={index} className="p-6 shadow-[var(--velarix-glow)] hover:scale-105 transition-transform">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-lg bg-gradient-to-r ${stat.color}`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <h3 className="text-sm text-muted-foreground mb-2">{stat.title}</h3>
                <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{stat.value}</p>
              </Card>
            ))}
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
                <span className="flex items-center gap-2"><Globe className="w-4 h-4" /> Global</span>
              </button>
              <button
                onClick={() => isInGuild && setLeaderboardMode('server')}
                disabled={!isInGuild}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${leaderboardMode === 'server' ? 'bg-primary text-primary-foreground shadow' : 'hover:bg-muted/50 text-muted-foreground'
                  } ${!isInGuild ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={!isInGuild ? "Launch in a Discord Server to see Server Leaderboard" : ""}
              >
                <span className="flex items-center gap-2"><Users className="w-4 h-4" /> Server</span>
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
        if (Array.isArray(data)) setLeaders(data);
        else setLeaders([]);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load leaderboard", err);
        setLoading(false);
      });
  }, [mode, guildId]);

  if (loading) return <div className="text-center text-muted-foreground py-8">Loading leaders...</div>;

  if (leaders.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        {mode === 'server'
          ? "No one in this server has played yet. Be the first!"
          : "No global stats yet."}
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50 text-left">
              <th className="p-4 font-semibold text-foreground">Rank</th>
              <th className="p-4 font-semibold text-foreground">Player</th>
              <th className="p-4 font-semibold text-foreground">Games</th>
              <th className="p-4 font-semibold text-foreground">Streak</th>
            </tr>
          </thead>
          <tbody>
            {leaders.map((player, i) => (
              <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
                <td className="p-4 flex items-center gap-2">
                  {i === 0 && <Trophy className="w-4 h-4 text-yellow-500" />}
                  {i === 1 && <Trophy className="w-4 h-4 text-gray-400" />}
                  {i === 2 && <Trophy className="w-4 h-4 text-amber-600" />}
                  <span className="font-mono text-muted-foreground">#{i + 1}</span>
                </td>
                <td className="p-4 font-medium text-primary">{player.display_name || "Unknown"}</td>
                <td className="p-4">{player.games_played}</td>
                <td className="p-4 flex items-center gap-1">
                  {player.current_streak > 0 && <Flame className="w-3 h-3 text-orange-500" />}
                  {player.current_streak}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
