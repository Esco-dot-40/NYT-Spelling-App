# Architecture & Handling (Explained)

## How It Works: The "Hybrid" Identity System

Since we are running as a **Discord Embedded Actvity** but previously lacked a full OAuth2 backend, we use a hybrid approach that is robust, fast, and easy to maintain.

### 1. Identity Layout
We distinguish between "Authentication" (proving who you are) and "Identification" (knowing who you are).

- **In Discord:** The app initializes the Discord SDK (`@discord/embedded-app-sdk`). It asks permission to `identify` the user.
  - *If successful:* We get an authorization `code`. If we had a full backend token exchange, we would swap this for an Access Token to get your Avatar and real Username securely.
  - *Currently:* We use the session to establish a consistent **User ID**. If the SDK authenticates, we use that context.
  
- **In Browser / Dev / Offline:** We generate a **Guest ID** (`guest_xyz...`) and store it in your browser's Local Storage. This ensures you can play immediately without "logging in."

### 2. Data Persistence (The "Dual-Saves" Strategy)
We don't want you to lose progress if the internet flickers, but we also want your stats to follow you if you switch devices (PC -> Mobile).

- **Layer 1: Local Storage (Instant)**
  - Every time you finish a game or find a word, it saves **immediately** to your device's browser storage.
  - *Benefit:* Zero latency, works offline, instant load times.
  
- **Layer 2: Database Sync (Background)**
  - We have a lightweight **PostgreSQL** database connected via Railway.
  - When you save locally, we *also* fire a background request to `/api/progress` to back up your score to the cloud.
  - *Benefit:* If you clear your cache or switch devices, we can (in the future strict implementation) pull your "Cloud Save" down.

### 3. The Backend
We run a **Node.js / Express** server that serves two purposes:
1. **Web Server:** It sends the actual React App (HTML/JS) to the Discord iframe.
2. **API Server:** It listens for stats updates and writes them to the SQL database.

### Summary for "The Pitch"
> "The app uses a hybrid persistent architecture. It primarily runs as a client-side specialized web app for maximum responsiveness within Discord. It leverages Local Storage for immediate data availability and syncs securely to a PostgreSQL database in the background to ensure data longevity. Identity is handled via the Discord Embedded SDK, allowing for a seamless, password-less experience."
