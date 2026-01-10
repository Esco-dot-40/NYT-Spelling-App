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
        let loadedFromApi = false;
        let apiStats: any = {};

        // 1. Try API first
        if (import.meta.env.PROD) {
          try {
            const res = await fetch(`/api/stats/${user.uid}`);
            if (res.ok) {
              apiStats = await res.json();
              // Basic check to see if we got real data
              if (apiStats && (apiStats.games_played !== undefined || apiStats.current_streak !== undefined)) {
                loadedFromApi = true;
              }
            }
          } catch (e) {
            console.warn("API Stats Fetch Failed", e);
          }
        }

        if (loadedFromApi) {
          setStats({
            gamesPlayed: apiStats.games_played || 0,
            averageScore: 0, // Not currently tracked in SQL stats table, would need aggregation query
            bestRank: apiStats.best_rank || "Beginner",
            currentStreak: apiStats.current_streak || 0,
            bestStreak: apiStats.best_streak || 0,
          });
        } else {
          // 2. LocalStorage Fallback (Updated with new keys)
          const statsKey = `spellorfail_stats_${user.uid}`;
          const prefix = `spellorfail_game_${user.uid}_`;
          let totalScore = 0;
          let gameCount = 0;

          // Also check for legacy 'alphabee' keys just in case
          const legacyPrefix = `alphabee_game_${user.uid}_`;

          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith(prefix) || key.startsWith(legacyPrefix))) {
              try {
                const data = JSON.parse(localStorage.getItem(key) || "{}");
                if (data && data.score !== undefined) {
                  totalScore += data.score;
                  gameCount++;
                }
              } catch (e) {
                // ignore
              }
            }
          }

          const statsStr = localStorage.getItem(statsKey);
          const storedStats = statsStr ? JSON.parse(statsStr) : {};

          setStats({
            gamesPlayed: storedStats.games_played || gameCount || 0,
            averageScore: gameCount > 0 ? Math.round(totalScore / gameCount) : 0,
            bestRank: storedStats.best_rank || "Beginner",
            currentStreak: storedStats.current_streak || 0,
            bestStreak: storedStats.best_streak || 0,
          });
        }

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
      </div>
    </div>
  );
}
