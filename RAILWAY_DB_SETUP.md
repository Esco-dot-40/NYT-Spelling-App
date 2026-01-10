# Database Setup Guide (Railway)

Since you requested a database, I've set up the code to support **PostgreSQL** hosted on Railway.

## 1. Create a Database on Railway
1. Go to your **Railway Project**.
2. Click **"New"** -> **"Database"** -> **"PostgreSQL"**.
3. Wait for it to deploy.

## 2. Connect Your App
1. Click on the new **PostgreSQL** service in Railway.
2. Go to the **"Variables"** tab.
3. Click **"Copy"** on `DATABASE_URL`.
4. Go to your **App Service** (where this code is deployed).
5. Go to **"Variables"**.
6. Add `DATABASE_URL` and paste the value.
7. Railway will redeploy your app.

## 3. That's it!
- The app will automatically create the necessary tables (`users`, `games`, `stats`) when it starts.
- Your `useGamePersistence` hook is now dual-mode:
    - It saves to **LocalStorage** immediately (for speed).
    - It sends a copy to the **Database** via the `/api/progress` endpoint (for cross-device sync).
