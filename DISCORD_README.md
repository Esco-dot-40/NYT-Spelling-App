# AlphaBee - Discord Activity

This application has been configured to run as a **Discord Embedded App** (Activity).

## 🚀 Key Features
- **Local Persistence**: Game progress, stats, and history are saved automatically to your local browser storage. No database required.
- **Discord SDK Integration**: The app initializes the Discord Embedded App SDK (`@discord/embedded-app-sdk`).
- **Responsive Design**: Optimized for the Discord Activity iframe (Mobile & Desktop).

## 🛠️ How to Test in Discord
To run this inside Discord, you need to execute it on a **public HTTPS URL**.

1. **Start the server**:
   ```bash
   npm run dev
   ```
2. **Tunnel (Optional)**:
   Use a service like **Cloudflare Quick Tunnel** or **ngrok** to expose port `8080` to the internet.
   ```bash
   cloudflared tunnel --url http://localhost:8080
   ```
3. **Developer Portal**:
   - Go to [Discord Developer Portal](https://discord.com/developers/applications).
   - Create an Application -> **Activities**.
   - Set the **URL Mapping** to your public Tunnel URL.
   - Enable "Embedded App" toggle.
4. **Launch**:
   - Use the "Activity Launcher" in a voice channel or text chat to start your app.

## 📦 Deployment
For production, deploy this app to **Vercel**, **Cloudflare Pages**, or **Netlify**.
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **SPA Note**: Ensure your host rewrites all routes to `index.html` (Vite SPA).

## 🔒 Content Security Policy (CSP)
Discord requires a strict CSP. If you deploy to a simplified host, you might need to configure headers to allow `frame-ancestors 'self' https://*.discord.com`.

## 📝 Persistent Data
Currently, data is saved to **LocalStorage** on the client.
- If you play on PC, your stats are on PC.
- If you play on Mobile, your stats are on Mobile.
- To sync across devices, you would need to re-enable a backend (like Firebase or Supabase) and implement the Discord OAuth Token Exchange flow.
