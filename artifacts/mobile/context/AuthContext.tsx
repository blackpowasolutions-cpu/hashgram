import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface User {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  website?: string;
  followers: number;
  following: number;
  likes: number;
  avatarUri?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "@reels_auth_user";

const MOCK_USERS: Record<string, { password: string; user: User }> = {
  demo: {
    password: "password",
    user: {
      id: "1",
      username: "@demo",
      displayName: "Demo User",
      bio: "Creating awesome content every day 🎬",
      followers: 12400,
      following: 348,
      likes: 89000,
    },
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch {
          // ignore
        }
      }
      setIsLoading(false);
    });
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    const key = username.toLowerCase().replace("@", "");
    const entry = MOCK_USERS[key];
    if (!entry || entry.password !== password) {
      // Allow any non-empty login for demo purposes
      if (username.trim() && password.trim()) {
        const newUser: User = {
          id: Date.now().toString(),
          username: `@${username.toLowerCase().replace(/\s+/g, "")}`,
          displayName: username.trim(),
          bio: "Just joined Reels! 🎬",
          followers: 0,
          following: 0,
          likes: 0,
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
        setUser(newUser);
        return true;
      }
      return false;
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entry.user));
    setUser(entry.user);
    return true;
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
