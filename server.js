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
    } catch (err) {
        console.error("Error initializing DB:", err);
    }
};

// Only init DB if we have a URL
if (process.env.DATABASE_URL) {
    initDB();
}

// --- API Routes ---

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
        // Ensure user exists
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
        const result = await pool.query('SELECT * FROM stats WHERE user_uid = $1', [req.params.uid]);
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
        res.json(result.rows);
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
