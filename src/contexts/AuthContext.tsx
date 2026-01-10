import React, { createContext, useContext, useState, useEffect } from 'react';
import { useDiscord } from './DiscordContext';

// Define a simple User type for our app
interface SimpleUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthContextType {
  user: SimpleUser | null;
  idToken: string | null;
  playerData: any;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  saveProgress: (data: any) => Promise<void>;
  updatePlayerData: (data: any) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SimpleUser | null>(null);
  const [playerData, setPlayerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Get loading state from Discord context to prevent premature Guest fallback
  const { auth: discordAuth, isLoading: isDiscordLoading } = useDiscord();

  useEffect(() => {
    const initializeAuth = async () => {
      // 0. Wait for Discord SDK to initialize to avoid race conditions
      if (isDiscordLoading) return;

      // 1. Check if we have a REAL Discord authenticated user from our backend exchange
      if (discordAuth?.user) {
        const discordUser = discordAuth.user;
        const realUser: SimpleUser = {
          uid: discordUser.id,
          email: discordUser.email || null,
          // Prioritize global_name (Display Name) over username (Handle)
          displayName: discordUser.global_name || discordUser.username || 'Discord User',
          photoURL: `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        };

        setUser(realUser);

        // Persist this identity key for local lookups if needed
        const storageKey = 'alphabee_user_identity';
        localStorage.setItem(storageKey, JSON.stringify(realUser));

        finishLoading(realUser);
        return;
      }

      // 2. Fallback: Check for existing "Guest" or stored session in localStorage
      const storageKey = 'alphabee_user_identity';
      const storedIdentity = localStorage.getItem(storageKey);

      let currentUser: SimpleUser;

      if (storedIdentity) {
        currentUser = JSON.parse(storedIdentity);
      } else {
        // Create a new random identity
        currentUser = {
          uid: `guest_${Math.random().toString(36).substring(2, 15)}`,
          email: null,
          displayName: 'Guest Player',
          photoURL: null
        };
        localStorage.setItem(storageKey, JSON.stringify(currentUser));
      }

      setUser(currentUser);
      finishLoading(currentUser);
    };

    const finishLoading = (currentUser: SimpleUser) => {
      // Load their player data
      const dataKey = `alphabee_user_${currentUser.uid}`;
      const savedDataStr = localStorage.getItem(dataKey);
      if (savedDataStr) {
        setPlayerData(JSON.parse(savedDataStr));
      } else {
        const initialData = {
          displayName: currentUser.displayName,
          createdAt: new Date().toISOString(),
        };
        setPlayerData(initialData);
      }
      setLoading(false);
    };

    initializeAuth();
  }, [discordAuth, isDiscordLoading]); // Re-run when loading finishes or auth changes

  const login = async () => {
    // In this local-only / no-backend mode, "login" is automatic/persistent.
    console.log("Login requested - already authenticated as local user.");
  };

  const logout = async () => {
    // Clear local identity? Or just reload?
    console.log('User logged out (simulated)');
  };

  const saveProgress = async (data: any) => {
    if (!user) return;

    try {
      const storageKey = `alphabee_user_${user.uid}`;
      const existingStr = localStorage.getItem(storageKey);
      const existing = existingStr ? JSON.parse(existingStr) : {};
      const newData = { ...existing, ...data };

      localStorage.setItem(storageKey, JSON.stringify(newData));
      setPlayerData(newData);
    } catch (error) {
      console.error('Save failed:', error);
      throw error;
    }
  };

  const updatePlayerData = (data: any) => {
    setPlayerData(data);
  };

  return (
    <AuthContext.Provider value={{
      user,
      idToken: "mock-token",
      playerData,
      loading, // usage of internal loading state is correct
      login,
      logout,
      saveProgress,
      updatePlayerData
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
