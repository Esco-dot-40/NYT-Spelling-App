import express from 'express';
import path from 'path';
import pg from 'pg';
import cors from 'cors';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Database Connection
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

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
        let redirect_uri = req.body.redirect_uri || 'http://localhost:5173'; // Prefer client provided

        if (!req.body.redirect_uri && origin) {
            if (origin.includes('spell.velarixsolutions.nl')) {
                // Ensure no trailing slash mismatch, typical standard is no trailing slash for origins
                redirect_uri = 'https://spell.velarixsolutions.nl';
            } else if (origin.includes('localhost')) {
                redirect_uri = 'http://localhost:5173';
            } else {
                redirect_uri = origin;
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
            // Return the specific error from Discord to help debug (e.g. invalid_redirect_uri)
            return res.status(400).json({
                error: 'Failed to get access token from Discord',
                details: tokenData,
                used_redirect_uri: params.get('redirect_uri')
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

        res.json({ success: true });
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
