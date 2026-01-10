# Firebase Setup Guide for AlphaBee

Your application is pre-configured to use **Firebase** for Authentication and Database (Firestore). Follow these steps to set up your own persistent database.

## 1. Create a Firebase Project
1. Go to [console.firebase.google.com](https://console.firebase.google.com/).
2. Click **"Add project"**.
3. Name it `alphabee-game` (or whatever you prefer).
4. Disable Google Analytics for now (simpler setup).
5. Click **"Create project"**.

## 2. Enable Authentication
1. In your new project dashboard, clicking **"Build"** > **"Authentication"** in the left sidebar.
2. Click **"Get started"**.
3. Select **"Google"** from the Sign-in method list.
4. Toggle **"Enable"**.
5. Pick a support email and click **"Save"**.

## 3. Create the Database (Firestore)
1. In the left sidebar, click **"Build"** > **"Firestore Database"**.
2. Click **"Create database"**.
3. Choose a location (e.g., `nam5 (us-central)`).
4. **Important**: Start in **Test mode** (for now) or **Production mode**.
   - If you choose *Production mode*, you MUST update the rules immediately (see step 4).
   - If you choose *Test mode*, anyone can read/write for 30 days.

## 4. Set Security Rules
Go to the **"Rules"** tab in Firestore and paste these rules to allow users to read/write ONLY their own data:

```plaintext
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read/write their own user document and subcollections
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
Click **"Publish"**.

## 5. Connect Your App
1. Click the **Gear icon** (Project settings) next to "Project Overview" in the top left.
2. Scroll down to "Your apps" and click the **Web icon (`</>`)**.
3. Register app (Nickname: `AlphaBee Web`).
4. You will see a `firebaseConfig` object. COPY IT.

## 6. Update Your Code
Open `src/firebase.js` in your project and replace the existing `firebaseConfig` with your new one:

```javascript
// src/firebase.js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "...",
  appId: "...",
  measurementId: "..."
};
```

## 7. Verify Data
1. Run your app (`npm run dev`).
2. Login with Google.
3. Play a game (find a word).
4. Refresh the page. Your score and words found should persist!
5. Check your Firestore dashboard; you should see a `users` collection created with your User ID.
