# Discord Embedded App Authentication Setup

Here are the reusable code snippets to properly implement Discord Username Authentication in any new project.

These snippets handle the **full OAuth2 flow** required by Discord Embedded Apps:
1.  **Frontend**: Initializes the SDK and requests an Auth Code.
2.  **Backend**: Exchanges that Code for an Access Token & User Profile.
3.  **Database**: Upserts the user so you have a permanent record.

### 1. Dependencies
**Frontend**:
```bash
npm install @discord/embedded-app-sdk
```

**Backend**:
```bash
npm install express cors dotenv pg
```

### 2. Frontend: `DiscordContext.tsx`
This context handles the complex SDK logic. It detects if you are running locally (mocking data) or in Discord (performing real auth).

```tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { DiscordSDK, DiscordSDKMock } from "@discord/embedded-app-sdk";

// REPLACE THIS WITH YOUR CLIENT ID FROM DISCORD DEVELOPER PORTAL
const DISCORD_CLIENT_ID = "YOUR_CLIENT_ID_HERE";

interface DiscordContextType {
    discordSdk: DiscordSDK | DiscordSDKMock | null;
    auth: {
        access_token: string;
        user: {
            id: string;
            username: string;
            discriminator: string;
            global_name: string | null;
            avatar: string | null;
        };
        scopes: string[];
    } | null;
    isLoading: boolean;
    error: string | null;
}

const DiscordContext = createContext<DiscordContextType>({
    discordSdk: null,
    auth: null,
    isLoading: true,
    error: null,
});

export const useDiscord = () => useContext(DiscordContext);

export const DiscordProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [discordSdk, setDiscordSdk] = useState<DiscordSDK | DiscordSDKMock | null>(null);
    const [auth, setAuth] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const setupDiscord = async () => {
            try {
                // 1. Detect Environment
                const isDiscord = window.location.search.includes('frame_id');
                let sdk: DiscordSDK | DiscordSDKMock;

                if (isDiscord) {
                    sdk = new DiscordSDK(DISCORD_CLIENT_ID);
                } else {
                    console.log("Running in browser mode, mocking Discord SDK.");
                    sdk = new DiscordSDKMock(DISCORD_CLIENT_ID, "mock_guild_id", "mock_channel_id");
                    setDiscordSdk(sdk);
                    setAuth({
                        access_token: "mock_token",
                        user: {
                            id: "mock_user_123",
                            username: "Browser Dev",
                            discriminator: "0000",
                            global_name: "Browser Developer",
                            avatar: null
                        },
                        scopes: []
                    });
                    setIsLoading(false);
                    return;
                }

                // 2. Initialize SDK
                await sdk.ready();
                
                // 3. Authorize with Discord Client
                // This does NOT give us a token, only a temporary code
                const { code } = await sdk.commands.authorize({
                    client_id: DISCORD_CLIENT_ID,
                    response_type: "code",
                    state: "",
                    prompt: "none",
                    scope: ["identify", "guilds"] // Add other scopes if needed
                });

                // 4. Exchange Code for Token via Backend
                const response = await fetch('/api/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code }),
                });

                if (!response.ok) {
                    throw new Error(`Auth Failed: ${response.statusText}`);
                }

                const data = await response.json();
                
                setAuth(data);
                setDiscordSdk(sdk);
            } catch (err: any) {
                console.error("Discord SDK Error:", err);
                setError(err.message || "Unknown Auth Error");
            } finally {
                setIsLoading(false);
            }
        };

        setupDiscord();
    }, []);

    return (
        <DiscordContext.Provider value={{ discordSdk, auth, isLoading, error }}>
            {children}
        </DiscordContext.Provider>
    );
};
```

### 3. Backend: `server.js` (Express)
Create an endpoint to handle the secure token exchange.

```javascript
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());

// Database Connection
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Setup User Table
const initDB = async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        uid VARCHAR(255) PRIMARY KEY,
        display_name VARCHAR(255),
        username VARCHAR(255),
        avatar VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
};
if (process.env.DATABASE_URL) initDB();

// --- THE CRITICAL ENDPOINT ---
app.post('/api/token', async (req, res) => {
    const { code } = req.body;
    
    // Quick return for dev/mock mode
    if (code === 'mock_code') return res.json({ access_token: 'mock', user: {} });

    try {
        // 1. Exchange Code for Access Token
        const params = new URLSearchParams({
            client_id: process.env.DISCORD_CLIENT_ID,
            client_secret: process.env.DISCORD_CLIENT_SECRET,
            grant_type: 'authorization_code',
            code,
             // IMPORTANT: In embedded apps, redirect_uri usually needs to match 
             // where the iframe is hosted, or be handled dynamically. 
             // For strict mode, use your configured endpoint in Dev Portal.
             // We often infer it from the host to handle tunnel urls automatically.
            redirect_uri: `https://${req.headers.host}` 
        });

        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params,
        });

        const tokenData = await tokenResponse.json();
        
        if (!tokenData.access_token) {
            console.error(tokenData);
            return res.status(400).json({ error: 'Failed to exchange token', details: tokenData });
        }

        // 2. Fetch User Profile
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: { authorization: `Bearer ${tokenData.access_token}` },
        });
        const userData = await userResponse.json();

        // 3. Upsert User into Database
        await pool.query(
            `INSERT INTO users (uid, display_name, username, avatar) 
             VALUES ($1, $2, $3, $4) 
             ON CONFLICT (uid) 
             DO UPDATE SET display_name = $2, username = $3, avatar = $4`,
            [userData.id, userData.global_name || userData.username, userData.username, userData.avatar]
        );

        // Return everything to frontend
        res.json({ 
            access_token: tokenData.access_token, 
            user: userData,
            scopes: tokenData.scope ? tokenData.scope.split(' ') : []
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(8080, () => console.log('Server running on 8080'));
```

### 4. Usage in Components
How to actually display the user's name or avatar.

```tsx
import { useDiscord } from './contexts/DiscordContext';

export default function UserProfile() {
  const { auth, isLoading, error } = useDiscord();

  if (isLoading) return <div>Loading Discord...</div>;
  if (error) return <div>Error: {error}</div>;

  const user = auth?.user;

  return (
    <div className="flex items-center gap-4">
      {user?.avatar && (
        <img 
          src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`} 
          alt="Avatar"
          className="w-12 h-12 rounded-full"
        />
      )}
      <div>
        <h1 className="text-xl font-bold">{user?.global_name || user?.username}</h1>
        <span className="text-gray-500">@{user?.username}</span>
      </div>
    </div>
  );
}
```

### 5. Environment Variables (`.env`)
```env
DISCORD_CLIENT_ID=your_id
DISCORD_CLIENT_SECRET=your_secret
DATABASE_URL=postgres://user:pass@host:5432/db
```
