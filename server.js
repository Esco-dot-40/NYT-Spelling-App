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
        last_played_date DATE,
        guild_id VARCHAR(255)
      );

      CREATE TABLE IF NOT EXISTS visitor_logs (
        id SERIAL PRIMARY KEY,
        uid VARCHAR(255),
        
        -- Location & IP
        ip VARCHAR(50),
        city VARCHAR(100),
        country VARCHAR(100),
        region VARCHAR(100),
        postal VARCHAR(20),
        lat FLOAT,
        lng FLOAT,
        timezone VARCHAR(100),
        timezone_offset INTEGER,
        
        -- Page Info
        path VARCHAR(500),
        domain VARCHAR(100),
        full_url TEXT,
        referrer TEXT,
        
        -- Platform & Browser
        platform_type VARCHAR(50),
        platform_os VARCHAR(100),
        user_agent TEXT,
        browser_language VARCHAR(50),
        browser_languages VARCHAR(255),
        browser_vendor VARCHAR(100),
        cookies_enabled BOOLEAN,
        do_not_track VARCHAR(20),
        
        -- Screen & Display
        screen_width INTEGER,
        screen_height INTEGER,
        viewport_width INTEGER,
        viewport_height INTEGER,
        color_depth INTEGER,
        pixel_ratio FLOAT,
        
        -- Device Capabilities
        hardware_concurrency VARCHAR(20),
        device_memory VARCHAR(20),
        max_touch_points INTEGER,
        touch_support BOOLEAN,
        
        -- Connection
        connection_type VARCHAR(50),
        connection_downlink VARCHAR(20),
        connection_rtt VARCHAR(20),
        connection_save_data BOOLEAN,
        
        -- Battery
        battery_level VARCHAR(20),
        battery_charging VARCHAR(20),
        
        -- GPU
        gpu_renderer TEXT,
        
        -- Storage
        local_storage_enabled BOOLEAN,
        session_storage_enabled BOOLEAN,
        
        -- ISP
        isp VARCHAR(255),
        asn VARCHAR(100),
        
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // Manual Migration for existing tables
        try {
            await pool.query("ALTER TABLE stats ADD COLUMN IF NOT EXISTS guild_id VARCHAR(255)");

            // Comprehensive migration for visitor_logs
            const columns = [
                "region VARCHAR(100)", "postal VARCHAR(20)", "timezone VARCHAR(100)",
                "timezone_offset INTEGER", "full_url TEXT", "referrer TEXT",
                "platform_type VARCHAR(50)", "platform_os VARCHAR(100)",
                "browser_language VARCHAR(50)", "browser_languages VARCHAR(255)",
                "browser_vendor VARCHAR(100)", "cookies_enabled BOOLEAN",
                "do_not_track VARCHAR(20)", "screen_width INTEGER",
                "screen_height INTEGER", "viewport_width INTEGER",
                "viewport_height INTEGER", "color_depth INTEGER",
                "pixel_ratio FLOAT", "hardware_concurrency VARCHAR(20)",
                "device_memory VARCHAR(20)", "max_touch_points INTEGER",
                "touch_support BOOLEAN", "connection_type VARCHAR(50)",
                "connection_downlink VARCHAR(20)", "connection_rtt VARCHAR(20)",
                "connection_save_data BOOLEAN", "battery_level VARCHAR(20)",
                "battery_charging VARCHAR(20)", "gpu_renderer TEXT",
                "local_storage_enabled BOOLEAN", "session_storage_enabled BOOLEAN",
                "isp VARCHAR(255)", "asn VARCHAR(100)", "domain VARCHAR(100)"
            ];

            for (const col of columns) {
                const colName = col.split(' ')[0];
                await pool.query(`ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS ${col}`);
            }
        } catch (e) { console.log("Migration note: schema update check", e); }

        console.log("Database tables checked/created.");

        // Ensure mock user exists for browser testing consistency
        await pool.query(
            `INSERT INTO users (uid, display_name) VALUES ('mock_user_123', 'Browser Developer') 
             ON CONFLICT (uid) DO NOTHING`
        );
    } catch (err) {
        console.error("❌ Error initializing DB:", err.message);
        if (err.code === 'ECONNREFUSED') {
            console.error("Check if your DATABASE_URL is correct and the DB is reachable.");
        }
    }
};

// Only init DB if we have a URL
if (process.env.DATABASE_URL) {
    initDB();
}

// --- API Routes ---

// Health Check
app.get('/api/health', async (req, res) => {
    try {
        const dbCheck = await pool.query('SELECT NOW()');
        res.json({
            status: 'ok',
            database: 'connected',
            server_time: new Date().toISOString(),
            db_time: dbCheck.rows[0].now
        });
    } catch (err) {
        console.error("Health check failed:", err);
        res.status(500).json({
            status: 'error',
            database: 'disconnected',
            error: err.message
        });
    }
});

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

// Get Leaderboard (Global or Guild)
app.get('/api/leaderboard', async (req, res) => {
    const { guild_id } = req.query;
    try {
        let query = `
            SELECT u.display_name, s.games_played, s.current_streak, s.best_streak 
            FROM stats s 
            JOIN users u ON s.user_uid = u.uid 
        `;

        const params = [];
        if (guild_id) {
            query += ` WHERE s.guild_id = $1 `;
            params.push(guild_id);
        }

        query += ` ORDER BY s.games_played DESC LIMIT 50`;

        const result = await pool.query(query, params);
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
    const { uid, puzzleId, score, words_found, pangrams_found, rank, game_date, guild_id } = req.body;

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

        // --- Post-Save Stats Aggregation ---
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

        games.forEach(g => {
            const d = new Date(g.game_date);
            const dateStr = d.toISOString().split('T')[0];
            if (!last_date) {
                temp_streak = 1;
            } else {
                const prev = new Date(last_date);
                const diffTime = Math.abs(d - prev);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays === 1) temp_streak++;
                else if (diffDays > 1) temp_streak = 1;
            }
            if (temp_streak > best_streak) best_streak = temp_streak;
            last_date = dateStr;
        });

        // Current streak logic
        const today = new Date().toISOString().split('T')[0];
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterday = yesterdayDate.toISOString().split('T')[0];

        if (last_date === today || last_date === yesterday) {
            current_streak = temp_streak;
        } else {
            current_streak = 0;
        }

        // Best Rank Logic
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

        // Update Stats Table (Include Guild ID)
        await pool.query(`
            INSERT INTO stats (user_uid, games_played, current_streak, best_streak, best_rank, last_played_date, guild_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (user_uid)
            DO UPDATE SET
                games_played = EXCLUDED.games_played,
                current_streak = EXCLUDED.current_streak,
                best_streak = EXCLUDED.best_streak,
                best_rank = EXCLUDED.best_rank,
                last_played_date = EXCLUDED.last_played_date,
                guild_id = COALESCE($7, stats.guild_id); 
        `, [uid, games_played, current_streak, best_streak, best_rank, last_date, guild_id]); // Use COALESCE to keep old guild if new is null

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


// --- Analytics Endpoints ---

// Log Visit
app.post('/api/analytics/visit', async (req, res) => {
    const data = req.body;
    try {
        await pool.query(`
            INSERT INTO visitor_logs (
                uid, ip, city, country, region, postal, lat, lng, timezone, timezone_offset,
                path, domain, full_url, referrer,
                platform_type, platform_os, user_agent, browser_language, browser_languages, 
                browser_vendor, cookies_enabled, do_not_track,
                screen_width, screen_height, viewport_width, viewport_height, color_depth, pixel_ratio,
                hardware_concurrency, device_memory, max_touch_points, touch_support,
                connection_type, connection_downlink, connection_rtt, connection_save_data,
                battery_level, battery_charging, gpu_renderer,
                local_storage_enabled, session_storage_enabled, isp, asn
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14,
                $15, $16, $17, $18, $19, $20, $21, $22,
                $23, $24, $25, $26, $27, $28,
                $29, $30, $31, $32,
                $33, $34, $35, $36,
                $37, $38, $39,
                $40, $41, $42, $43
            )
        `, [
            data.uid, data.ip, data.city, data.country, data.region, data.postal,
            data.lat, data.lng, data.timezone, data.timezone_offset,
            data.path, data.domain, data.full_url, data.referrer,
            data.platform_type, data.platform_os, data.user_agent, data.browser_language,
            data.browser_languages, data.browser_vendor, data.cookies_enabled, data.do_not_track,
            data.screen_width, data.screen_height, data.viewport_width, data.viewport_height,
            data.color_depth, data.pixel_ratio,
            data.hardware_concurrency, data.device_memory, data.max_touch_points, data.touch_support,
            data.connection_type, data.connection_downlink, data.connection_rtt, data.connection_save_data,
            data.battery_level, data.battery_charging, data.gpu_renderer,
            data.local_storage_enabled, data.session_storage_enabled, data.isp, data.asn
        ]);
        res.json({ success: true });
    } catch (err) {
        console.error("Analytics Log Error:", err);
        res.json({ success: false });
    }
});

// Get Analytics Summary
app.get('/api/analytics/summary', async (req, res) => {
    try {
        const totalRes = await pool.query('SELECT COUNT(*) FROM visitor_logs');
        const total_visits = parseInt(totalRes.rows[0].count);

        const uniqueRes = await pool.query('SELECT COUNT(DISTINCT ip) FROM visitor_logs');
        const unique_visitors = parseInt(uniqueRes.rows[0].count);

        const platformRes = await pool.query(`
            SELECT platform_type, COUNT(*) as count 
            FROM visitor_logs 
            WHERE platform_type IS NOT NULL
            GROUP BY platform_type
        `);

        const osRes = await pool.query(`
            SELECT platform_os, COUNT(*) as count 
            FROM visitor_logs 
            WHERE platform_os IS NOT NULL
            GROUP BY platform_os
            ORDER BY count DESC
            LIMIT 10
        `);

        const screenRes = await pool.query(`
            SELECT CONCAT(screen_width, 'x', screen_height) as resolution, COUNT(*) as count
            FROM visitor_logs
            WHERE screen_width IS NOT NULL AND screen_height IS NOT NULL
            GROUP BY screen_width, screen_height
            ORDER BY count DESC
            LIMIT 10
        `);

        const connectionRes = await pool.query(`
            SELECT connection_type, COUNT(*) as count
            FROM visitor_logs
            WHERE connection_type IS NOT NULL AND connection_type != 'unknown'
            GROUP BY connection_type
            ORDER BY count DESC
        `);

        const timezoneRes = await pool.query(`
            SELECT timezone, COUNT(*) as count
            FROM visitor_logs
            WHERE timezone IS NOT NULL
            GROUP BY timezone
            ORDER BY count DESC
            LIMIT 10
        `);

        const referrerRes = await pool.query(`
            SELECT referrer, COUNT(*) as count
            FROM visitor_logs
            WHERE referrer IS NOT NULL AND referrer != 'direct'
            GROUP BY referrer
            ORDER BY count DESC
            LIMIT 10
        `);

        const ispRes = await pool.query(`
            SELECT isp, COUNT(*) as count
            FROM visitor_logs
            WHERE isp IS NOT NULL AND isp != 'unknown'
            GROUP BY isp
            ORDER BY count DESC
            LIMIT 10
        `);

        const deviceCapabilities = await pool.query(`
            SELECT 
                AVG(CAST(hardware_concurrency AS INTEGER)) FILTER (WHERE hardware_concurrency != 'unknown') as avg_cores,
                AVG(CAST(device_memory AS INTEGER)) FILTER (WHERE device_memory != 'unknown') as avg_memory,
                COUNT(*) FILTER (WHERE touch_support = true) as touch_devices,
                COUNT(*) FILTER (WHERE touch_support = false) as non_touch_devices
            FROM visitor_logs
        `);

        const recentRes = await pool.query(`
            SELECT * FROM visitor_logs 
            ORDER BY timestamp DESC 
            LIMIT 100
        `);

        const geoRes = await pool.query(`
            SELECT lat, lng, city, country, COUNT(*) as count
            FROM visitor_logs
            WHERE lat IS NOT NULL AND lng IS NOT NULL
            GROUP BY lat, lng, city, country
        `);

        // Active now (last 5 minutes)
        const activeNowRes = await pool.query(`
            SELECT COUNT(DISTINCT ip) FROM visitor_logs
            WHERE timestamp > NOW() - INTERVAL '5 minutes'
        `);
        const active_now = parseInt(activeNowRes.rows[0].count);

        // New vs Returning
        const newVsReturningRes = await pool.query(`
            SELECT 
                COUNT(DISTINCT ip) FILTER (WHERE visit_count = 1) as new_visitors,
                COUNT(DISTINCT ip) FILTER (WHERE visit_count > 1) as returning_visitors
            FROM (
                SELECT ip, COUNT(*) as visit_count
                FROM visitor_logs
                GROUP BY ip
            ) AS visitor_counts
        `);

        res.json({
            total_visits,
            unique_visitors,
            active_now,
            new_vs_returning: newVsReturningRes.rows[0],
            platforms: platformRes.rows,
            operating_systems: osRes.rows,
            screen_resolutions: screenRes.rows,
            connection_types: connectionRes.rows,
            timezones: timezoneRes.rows,
            top_referrers: referrerRes.rows,
            top_isps: ispRes.rows,
            device_capabilities: deviceCapabilities.rows[0],
            recent_visits: recentRes.rows,
            geo_data: geoRes.rows
        });
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
