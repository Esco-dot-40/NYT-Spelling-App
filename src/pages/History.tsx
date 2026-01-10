import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface GameHistory {
    game_date: string;
    score: number;
    words_found: string[];
    pangrams_found: string[];
    rank?: string;
    timestamp?: string;
    puzzle_id?: string;
}

const getRank = (score: number, maxScore: number = 500): string => {
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

export default function History() {
    const { user, loading: authLoading } = useAuth();
    const [history, setHistory] = useState<GameHistory[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            if (authLoading || !user) return;

            setLoading(true);
            setError(null);

            try {
                const gamesMap = new Map<string, GameHistory>();

                // Helper to add game to map (deduping by date/id)
                const addGame = (game: any) => {
                    // Normalize fields
                    const normalized: GameHistory = {
                        game_date: game.game_date,
                        score: game.score,
                        words_found: game.words_found || [],
                        pangrams_found: game.pangrams_found || [],
                        rank: game.rank,
                        timestamp: game.timestamp,
                        puzzle_id: game.puzzle_id || game.puzzleId // Handle both casing
                    };

                    // Use puzzle_id unique key, fallback to game_date
                    const key = normalized.puzzle_id || normalized.game_date;
                    if (key) {
                        // If exists, keep the one with higher score or newer timestamp
                        if (gamesMap.has(key)) {
                            const existing = gamesMap.get(key)!;
                            if ((normalized.score > existing.score)) {
                                gamesMap.set(key, normalized);
                            }
                        } else {
                            gamesMap.set(key, normalized);
                        }
                    }
                };

                // 1. Fetch from API
                try {
                    const res = await fetch(`/api/history/${user.uid}`);
                    if (res.ok) {
                        const apiGames = await res.json();
                        if (Array.isArray(apiGames)) {
                            apiGames.forEach(addGame);
                        }
                    }
                } catch (e) {
                    console.warn("API History Fetch Failed", e);
                }

                // 2. Fetch from LocalStorage (Always merge these in!)
                console.log("Fetching local games for user:", user.uid);
                const newPrefix = `spellorfail_game_${user.uid}_`;
                const oldPrefix = `alphabee_game_${user.uid}_`;

                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    // FIX: Ensure we use newPrefix here, not undefined 'prefix'
                    if (key && (key.startsWith(newPrefix) || key.startsWith(oldPrefix))) {
                        try {
                            const data = JSON.parse(localStorage.getItem(key) || "{}");
                            if (data && data.score !== undefined) {
                                // Extract puzzleId from key if possible
                                const parts = key.split('_');
                                const puzzleIdFromKey = parts[parts.length - 1];
                                addGame({ ...data, puzzleId: data.puzzleId || puzzleIdFromKey });
                            }
                        } catch (e) {
                            console.warn("Failed to parse game data for key:", key);
                        }
                    }
                }

                // Convert map to array and sort
                const games = Array.from(gamesMap.values());
                console.log("Found", games.length, "games (merged)");

                games.sort((a, b) => {
                    const aTime = a.timestamp || a.game_date || '';
                    const bTime = b.timestamp || b.game_date || '';
                    return bTime.localeCompare(aTime);
                });

                setHistory(games.slice(0, 50));
            } catch (err: any) {
                console.error("Error fetching history:", err);
                setError(err.message || "Failed to load history");
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [user, authLoading]);

    const toggleRow = (index: number) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    if (authLoading) return <div className="min-h-screen bg-game-bg flex items-center justify-center relative z-10">Checking...</div>;
    if (!user) return <div className="min-h-screen bg-game-bg flex items-center justify-center relative z-10">Please log in.</div>;
    if (loading) return <div className="min-h-screen bg-game-bg flex items-center justify-center relative z-10">Loading...</div>;

    return (
        <div className="min-h-screen bg-game-bg relative z-10">
            <div className="max-w-6xl mx-auto px-4 py-8">
                <h1 className="text-4xl md:text-5xl font-bold text-center mb-8">
                    <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        Game History
                    </span>
                </h1>

                {history.length === 0 ? (
                    <Card className="p-8 text-center">
                        <p className="text-lg text-muted-foreground">
                            No games played yet. Start playing to build your history!
                        </p>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {history.map((game, index) => (
                            <Collapsible key={index} open={expandedRows.has(index)} onOpenChange={() => toggleRow(index)}>
                                <Card>
                                    <CollapsibleTrigger asChild>
                                        <Button variant="ghost" className="w-full p-4 h-auto hover:bg-muted/50">
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center gap-4">
                                                    <div className="text-left">
                                                        <div className="font-semibold">
                                                            {format(new Date(game.game_date), "MMMM d, yyyy")}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {Array.isArray(game.words_found) ? game.words_found.length : 0} words • {game.score} points
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Badge variant="secondary" className="bg-gradient-to-r from-primary/10 to-accent/10">
                                                        {game.rank || getRank(game.score)}
                                                    </Badge>
                                                    <ChevronDown className={`h-5 w-5 transition-transform ${expandedRows.has(index) ? 'rotate-180' : ''}`} />
                                                </div>
                                            </div>
                                        </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <div className="px-4 pb-4 pt-2 border-t">
                                            <div className="flex flex-wrap gap-2">
                                                {Array.isArray(game.words_found) && game.words_found.length > 0 ? (
                                                    game.words_found.map((word, wordIndex) => {
                                                        const isPangram = Array.isArray(game.pangrams_found) && game.pangrams_found.includes(word);
                                                        return (
                                                            <Badge key={wordIndex} variant={isPangram ? "default" : "outline"}>
                                                                {word} {isPangram && " 🎉"}
                                                            </Badge>
                                                        );
                                                    })
                                                ) : <span>No words</span>}
                                            </div>
                                        </div>
                                    </CollapsibleContent>
                                </Card>
                            </Collapsible>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
