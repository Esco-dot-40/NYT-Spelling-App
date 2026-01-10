import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Trophy, Target, Flame, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

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

        // 1. Fetch API Stats
        try {
          const res = await fetch(`/api/stats/${user.uid}`);
          if (res.ok) {
            apiStats = await res.json();
          }
        } catch (e) {
          console.warn("API Stats Fetch Failed", e);
        }

        // 2. Fetch Local Stats (Always calculate)
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

        // 3. Merge Logic: Max(API, Local)
        // This ensures if API is 0 (fresh db) but Local has 5 games, we show 5.
        // If API has 10 (played elsewhere) and Local has 2, we show 10.
        const mergedGamesPlayed = Math.max(
          (apiStats.games_played || 0),
          (storedLocalStats.games_played || localGameCount || 0)
        );

        const mergedBestStreak = Math.max(
          (apiStats.best_streak || 0),
          (storedLocalStats.best_streak || 0)
        );

        const mergedCurrentStreak = Math.max(
          (apiStats.current_streak || 0),
          (storedLocalStats.current_streak || 0)
        );

        // Calculate average score (prefer local calculation if valid, otherwise 0)
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
    {
      title: "Games Played",
      value: stats.gamesPlayed,
      icon: Calendar,
      color: "from-primary to-accent",
    },
    {
      title: "Average Score",
      value: stats.averageScore,
      icon: Target,
      color: "from-accent to-primary",
    },
    {
      title: "Best Rank",
      value: stats.bestRank,
      icon: Trophy,
      color: "from-primary to-accent",
    },
    {
      title: "Current Streak",
      value: `${stats.currentStreak} ${stats.currentStreak === 1 ? "day" : "days"}`,
      icon: Flame,
      color: "from-accent to-primary",
    },
    {
      title: "Best Streak",
      value: `${stats.bestStreak} ${stats.bestStreak === 1 ? "day" : "days"}`,
      icon: Flame,
      color: "from-primary to-accent",
    },
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
          <Card className="p-8 text-center">
            <p className="text-lg text-muted-foreground">
              No games played yet. Start playing to see your statistics!
            </p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {statCards.map((stat, index) => (
              <Card
                key={index}
                className="p-6 shadow-[var(--velarix-glow)] hover:scale-105 transition-transform"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-lg bg-gradient-to-r ${stat.color}`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <h3 className="text-sm text-muted-foreground mb-2">{stat.title}</h3>
                <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {stat.value}
                </p>
              </Card>
            ))}
          </div>
        )}

        {/* Leaderboard Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-center mb-6 text-white">Global Leaderboard</h2>
          <LeaderboardTable />
        </div>

      </div>
    </div>
  );
}

function LeaderboardTable() {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) setLeaders(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load leaderboard", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-center text-muted-foreground">Loading leaders...</div>;
  if (leaders.length === 0) return <div className="text-center text-muted-foreground">No global stats yet. Be the first!</div>;

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
