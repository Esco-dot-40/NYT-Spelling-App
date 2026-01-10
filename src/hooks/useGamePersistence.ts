import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export const useGamePersistence = () => {
  const { user } = useAuth();
  const [isLoaded, setIsLoaded] = useState(false);

  // Toggle this to use LocalStorage vs API
  const USE_API = true;

  const loadProgress = useCallback(async (puzzleId: string) => {
    if (!user) {
      setIsLoaded(true);
      return null;
    }

    // API Mode
    if (USE_API && import.meta.env.PROD) { // Only use API in PROD or if server running
      try {
        const res = await fetch(`/api/progress/${user.uid}/${puzzleId}`);
        if (res.ok) {
          const data = await res.json();
          setIsLoaded(true);
          return data;
        }
      } catch (e) {
        console.error("API Load Error", e);
      }
    }

    // Local Storage Fallback (Dev or Offline)
    try {
      const storageKey = `alphabee_game_${user.uid}_${puzzleId}`;
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
      setIsLoaded(true);
      return null;
    }
  }, [user]);

  const saveProgress = useCallback(async (puzzleId: string, score: number, wordsFound: string[], pangramsFound: string[], maxScore: number) => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];

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

      const gameData = {
        uid: user.uid,
        puzzleId: puzzleId,
        score,
        words_found: wordsFound,
        pangrams_found: pangramsFound,
        rank: currentRank,
        game_date: today,
        timestamp: new Date().toISOString()
      };

      // 1. Save to LocalStorage (Always for speed/offline)
      const storageKey = `alphabee_game_${user.uid}_${puzzleId}`;
      localStorage.setItem(storageKey, JSON.stringify(gameData));

      // 2. Save to API (if enabled)
      if (USE_API) {
        // Fire and forget - don't await blocking
        fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(gameData)
        }).then(res => {
          if (!res.ok) console.warn("Failed to sync to DB");
        }).catch(err => console.warn("API Sync Error", err));
      }

    } catch (error: any) {
      console.error('Error saving progress:', error);
    }
  }, [user]);

  return { loadProgress, saveProgress, isLoaded, sessionId: user?.uid };
};
