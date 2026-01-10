import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export const useGamePersistence = () => {
  const { user } = useAuth();
  const [isLoaded, setIsLoaded] = useState(false);

  // Helper to get storage key
  const getStorageKey = (uid: string, puzzleId: string) => `alphabee_game_${uid}_${puzzleId}`;
  const getStatsKey = (uid: string) => `alphabee_stats_${uid}`;

  const loadProgress = useCallback(async (puzzleId: string) => {
    // If no user, we can't load user-specific data yet. 
    // Ideally we could support "guest" play with a generic ID, but the app flow expects a user for now.
    if (!user) {
      setIsLoaded(true);
      return null;
    }

    try {
      const storageKey = getStorageKey(user.uid, puzzleId);
      const savedDataString = localStorage.getItem(storageKey);

      if (savedDataString) {
        const savedData = JSON.parse(savedDataString);
        setIsLoaded(true);
        return savedData;
      }

      setIsLoaded(true);
      return null;
    } catch (error: any) {
      console.error('Error loading progress:', error);
      // Don't toast on load failure usually, just log
      setIsLoaded(true);
      return null;
    }
  }, [user]);

  const saveProgress = useCallback(async (puzzleId: string, score: number, wordsFound: string[], pangramsFound: string[], maxScore: number) => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const storageKey = getStorageKey(user.uid, puzzleId);
      const statsKey = getStatsKey(user.uid);

      // Calculate rank
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

      const currentRank = getRank(score, maxScore);

      // Get user stats for streak
      const statsJson = localStorage.getItem(statsKey);
      const stats = statsJson ? JSON.parse(statsJson) : {
        current_streak: 0,
        best_streak: 0,
        last_played_date: null,
        best_rank: "Beginner",
        games_played: 0
      };

      let currentStreak = stats.current_streak || 0;
      let bestStreak = stats.best_streak || 0;
      let bestRank = stats.best_rank || "Beginner";
      let gamesPlayed = stats.games_played || 0;

      // Check current rank vs best rank helper
      const rankValue = (rank: string) => {
        const ranks = ["Beginner", "Good Start", "Moving Up", "Good", "Solid", "Nice", "Great", "Amazing", "Genius", "Queen Bee", "Perfect!"];
        return ranks.indexOf(rank);
      };

      // Update streaks logic
      // Note: "last_played_date" tracks the last day they played *any* game
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (stats.last_played_date !== today) {
        if (stats.last_played_date === yesterdayStr) {
          currentStreak += 1;
        } else if (stats.last_played_date && stats.last_played_date < yesterdayStr) {
          // Reset streak if we missed a day
          currentStreak = 1;
        } else if (!stats.last_played_date) {
          // First game ever
          currentStreak = 1;
        }
        // If playing multiple times today, streak doesn't increase, but also doesn't reset
        gamesPlayed += 1;
      }

      bestStreak = Math.max(currentStreak, bestStreak);

      if (rankValue(currentRank) > rankValue(bestRank)) {
        bestRank = currentRank;
      }

      const gameData = {
        score,
        words_found: wordsFound,
        pangrams_found: pangramsFound,
        game_date: today,
        puzzle_id: puzzleId,
        rank: currentRank,
        timestamp: new Date().toISOString()
      };

      // Save Game
      localStorage.setItem(storageKey, JSON.stringify(gameData));

      // Save Stats
      localStorage.setItem(statsKey, JSON.stringify({
        current_streak: currentStreak,
        best_streak: bestStreak,
        last_played_date: today,
        best_rank: bestRank,
        games_played: gamesPlayed
      }));

    } catch (error: any) {
      console.error('Error saving progress:', error);
    }
  }, [user]);

  return { loadProgress, saveProgress, isLoaded, sessionId: user?.uid };
};
