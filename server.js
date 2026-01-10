import express from 'express';
import path from 'path';
import pg from 'pg';
import cors from 'cors';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Railway/Heroku/Vercel)
const PORT = process.env.PORT || 8080;

// Database Connection
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist'), {
    setHeaders: (res, pathStr) => {
        if (pathStr.endsWith('.html')) {
            // Force no-cache for index.html to ensure latest version load
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else {
            // Cache other assets (JS/CSS) normally
            res.setHeader('Cache-Control', 'public, max-age=31536000');
        }
    }
}));

// --- DB Init Helper ---
const initDB = async () => {
    try {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        uid VARCHAR(255) PRIMARY KEY,
        display_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS games (
        id SERIAL PRIMARY KEY,
        user_uid VARCHAR(255) REFERENCES users(uid),
        puzzle_id VARCHAR(255),
        score INTEGER,
        words_found TEXT[],
        pangrams_found TEXT[],
        rank VARCHAR(50),
        game_date DATE,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_uid, puzzle_id)
      );

      CREATE TABLE IF NOT EXISTS stats (
        user_uid VARCHAR(255) PRIMARY KEY REFERENCES users(uid),
        games_played INTEGER DEFAULT 0,
        current_streak INTEGER DEFAULT 0,
        best_streak INTEGER DEFAULT 0,
        best_rank VARCHAR(50),
        last_played_date DATE
      );
    `);
        console.log("Database tables checked/created.");

        // Ensure mock user exists for browser testing consistency
        await pool.query(
            `INSERT INTO users (uid, display_name) VALUES ('mock_user_123', 'Browser Developer') 
             ON CONFLICT (uid) DO NOTHING`
        );
    } catch (err) {
        console.error("Error initializing DB:", err);
    }
};

// Only init DB if we have a URL
if (process.env.DATABASE_URL) {
    initDB();
}

// --- API Routes ---

// OAuth Token Exchange & User Sync
app.post('/api/token', async (req, res) => {
    const { code } = req.body;
    if (!code) {
        console.error("Token Exchange Error: No code provided in request body.");
        return res.status(400).json({ error: 'No code provided' });
    }

    // Fallback for dev/mock mode
    if (code === 'mock_code') {
        return res.json({
            access_token: 'mock_token',
            user: {
                id: 'mock_user_id',
                username: 'Mock User',
                avatar: null
            }
        });
    }

    if (!process.env.DISCORD_CLIENT_SECRET) {
        console.warn("DISCORD_CLIENT_SECRET not set.");
        return res.status(503).json({ error: 'Server not configured for OAuth' });
    }

    try {
        // 1. Exchange Code for Token

        // Determine request origin or use provided redirect_uri
        const origin = req.headers.origin;
        let redirect_uri = process.env.PUBLIC_URL || req.body.redirect_uri;

        // Smart Fallback: If no PUBLIC_URL, try to guess from the SERVER'S host
        // This is better than 'origin' because 'origin' might be the Discord iframe (discordsays.com)
        // whereas 'host' is this backend app (e.g. app.railway.app), which is what we invited.
        if (!redirect_uri) {
            const forwardedHost = req.headers['x-forwarded-host'];
            // Handle comma-separated hosts (e.g. "client, proxy1, proxy2") - take the first one (client)
            const rawHost = forwardedHost || req.headers.host;
            const host = rawHost ? rawHost.split(',')[0].trim() : null;

            const proto = req.headers['x-forwarded-proto'] || 'http';

            if (host && !host.includes('localhost')) {
                redirect_uri = `${proto.includes('https') ? 'https' : 'http'}://${host}`;
                console.log(`[OAuth] Inferred redirect_uri from Host: ${redirect_uri}`);
            } else if (origin) {
                // Fallback to origin (mainly for localhost dev)
                redirect_uri = origin;
            } else {
                redirect_uri = 'http://localhost:5173';
            }
        }

        console.log(`[OAuth] Using redirect_uri: ${redirect_uri}`);

        const params = new URLSearchParams({
            client_id: process.env.DISCORD_CLIENT_ID,
            client_secret: process.env.DISCORD_CLIENT_SECRET,
            grant_type: 'authorization_code',
            code,
            redirect_uri
        });

        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params,
        });

        const tokenData = await tokenResponse.json();

        if (!tokenData.access_token) {
            console.error("OAuth Token Error:", tokenData);
            // Return failure with instructions
            return res.status(400).json({
                error: 'Discord OAuth Failed',
                details: tokenData,
                current_redirect_uri: redirect_uri, // Tell fe what we used
                message: "Please ensure this Redirect URI is added to your Discord Developer Portal."
            });
        }

        // 2. Fetch User Info
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: { authorization: `Bearer ${tokenData.access_token}` },
        });
        const userData = await userResponse.json();

        // 3. Upsert User into DB with real name (Prefer Global Name aka Display Name)
        await pool.query(
            'INSERT INTO users (uid, display_name) VALUES ($1, $2) ON CONFLICT (uid) DO UPDATE SET display_name = $2',
            [userData.id, userData.global_name || userData.username]
        );

        res.json({ access_token: tokenData.access_token, user: userData });

    } catch (err) {
        console.error("Token Exchange Error:", err);
        res.status(500).json({ error: 'Internal Server Error during Auth' });
    }
});

// Get Leaderboard (Top 10 by Games Played)
app.get('/api/leaderboard', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.display_name, s.games_played, s.current_streak, s.best_streak 
            FROM stats s 
            JOIN users u ON s.user_uid = u.uid 
            ORDER BY s.games_played DESC 
            LIMIT 10
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'DB Error' });
    }
});

// Get User Progress for a specific puzzle
app.get('/api/progress/:uid/:puzzleId', async (req, res) => {
    const { uid, puzzleId } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM games WHERE user_uid = $1 AND puzzle_id = $2',
            [uid, puzzleId]
        );
        res.json(result.rows[0] || null);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'DB Error' });
    }
});

// Save Progress
app.post('/api/progress', async (req, res) => {
    const { uid, puzzleId, score, words_found, pangrams_found, rank, game_date } = req.body;

    if (!uid) return res.status(400).json({ error: 'Missing UID' });

    try {
        // Ensure user exists (Upsert with NULL name if not already there, though /api/token should have handled this)
        await pool.query(
            'INSERT INTO users (uid) VALUES ($1) ON CONFLICT (uid) DO NOTHING',
            [uid]
        );

        // Save/Update Game
        await pool.query(`
      INSERT INTO games (user_uid, puzzle_id, score, words_found, pangrams_found, rank, game_date, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (user_uid, puzzle_id) 
      DO UPDATE SET 
        score = EXCLUDED.score,
        words_found = EXCLUDED.words_found,
        pangrams_found = EXCLUDED.pangrams_found,
        rank = EXCLUDED.rank,
        timestamp = NOW();
    `, [uid, puzzleId, score, words_found, pangrams_found, rank, game_date]);

        // --- Post-Save Stats Aggregation ---
        // Fetch all games for this user to calculate streaks and totals
        const gamesRes = await pool.query(
            'SELECT game_date, rank, score FROM games WHERE user_uid = $1 ORDER BY game_date ASC',
            [uid]
        );
        const games = gamesRes.rows;

        const games_played = games.length;

        // Calculate Streaks
        let current_streak = 0;
        let best_streak = 0;
        let temp_streak = 0;
        let last_date = null;

        // Simple streak calculation (dates are strings or objects)
        games.forEach(g => {
            const d = new Date(g.game_date);
            // Normalize to YYYY-MM-DD
            const dateStr = d.toISOString().split('T')[0];

            if (!last_date) {
                temp_streak = 1;
            } else {
                const prev = new Date(last_date);
                const diffTime = Math.abs(d - prev);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    temp_streak++;
                } else if (diffDays > 1) {
                    temp_streak = 1;
                }
                // if diffDays === 0 (same day), ignore/don't reset
            }
            if (temp_streak > best_streak) best_streak = temp_streak;
            last_date = dateStr;
        });

        // Current streak logic: check if last game was today or yesterday
        const today = new Date().toISOString().split('T')[0];
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterday = yesterdayDate.toISOString().split('T')[0];

        if (last_date === today || last_date === yesterday) {
            current_streak = temp_streak;
        } else {
            current_streak = 0;
        }

        // Find best rank (simple heuristic: just store the latest one or maybe we need an ordering)
        // For now, let's keep the user's best rank ever achieved? 
        // Or just let the FE decide? The Stats table has 'best_rank'.
        // Ranks: Beginner, Good, Solid... Queen Bee.
        const rankOrder = ["Beginner", "Good Start", "Moving Up", "Good", "Solid", "Nice", "Great", "Amazing", "Genius", "Queen Bee", "Perfect!"];
        let best_rank = "Beginner";
        let max_rank_idx = -1;

        games.forEach(g => {
            const idx = rankOrder.indexOf(g.rank);
            if (idx > max_rank_idx) {
                max_rank_idx = idx;
                best_rank = g.rank;
            }
        });

        // Update Stats Table
        await pool.query(`
            INSERT INTO stats (user_uid, games_played, current_streak, best_streak, best_rank, last_played_date)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (user_uid)
            DO UPDATE SET
                games_played = EXCLUDED.games_played,
                current_streak = EXCLUDED.current_streak,
                best_streak = EXCLUDED.best_streak,
                best_rank = EXCLUDED.best_rank,
                last_played_date = EXCLUDED.last_played_date;
        `, [uid, games_played, current_streak, best_streak, best_rank, last_date]);

        res.json({ success: true, stats_updated: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Save failed' });
    }
});

// Update Stats
app.post('/api/stats', async (req, res) => {
    const { uid, games_played, current_streak, best_streak, best_rank, last_played_date } = req.body;

    try {
        await pool.query(`
      INSERT INTO stats (user_uid, games_played, current_streak, best_streak, best_rank, last_played_date)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_uid)
      DO UPDATE SET
        games_played = EXCLUDED.games_played,
        current_streak = EXCLUDED.current_streak,
        best_streak = EXCLUDED.best_streak,
        best_rank = EXCLUDED.best_rank,
        last_played_date = EXCLUDED.last_played_date;
    `, [uid, games_played, current_streak, best_streak, best_rank, last_played_date]);

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Stats update failed' });
    }
});

// Get Stats
app.get('/api/stats/:uid', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT s.*, u.display_name 
            FROM stats s 
            JOIN users u ON s.user_uid = u.uid 
            WHERE user_uid = $1
        `, [req.params.uid]);
        res.json(result.rows[0] || {});
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'DB Error' });
    }
});

// Get History
app.get('/api/history/:uid', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM games WHERE user_uid = $1 ORDER BY timestamp DESC LIMIT 50',
            [req.params.uid]
        );
        res.json(result.rows[0] || {});
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'DB Error' });
    }
});


// Catch-all for SPA
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
