import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  bio?: string;
  website?: string;
  avatarUri?: string;
  avatarUrl?: string;
  followers: number;
  following: number;
  likes: number;
  points?: number;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    email: string,
    username: string,
    displayName: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "@reels_auth_token";
const USER_KEY = "@reels_auth_user_v2";

function mapApiUser(apiUser: Record<string, unknown>): User {
  const username = String(apiUser.username ?? "");
  return {
    id: String(apiUser.id ?? ""),
    username: username.startsWith("@") ? username : `@${username}`,
    displayName: String(apiUser.displayName ?? ""),
    email: String(apiUser.email ?? ""),
    bio: apiUser.bio ? String(apiUser.bio) : "",
    website: apiUser.website ? String(apiUser.website) : undefined,
    avatarUri: apiUser.avatarUrl ? String(apiUser.avatarUrl) : undefined,
    avatarUrl: apiUser.avatarUrl ? String(apiUser.avatarUrl) : undefined,
    followers: 0,
    following: 0,
    likes: 0,
    points: typeof apiUser.points === "number" ? apiUser.points : 0,
    role: apiUser.role ? String(apiUser.role) : "user",
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        if (storedToken) {
          const res = await fetch(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          if (res.ok) {
            const apiUser = await res.json();
            const mapped = mapApiUser(apiUser);
            setToken(storedToken);
            setUser(mapped);
          } else {
            await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
          }
        }
      } catch {
        const [storedUserRaw, storedToken] = await Promise.all([
          AsyncStorage.getItem(USER_KEY),
          AsyncStorage.getItem(TOKEN_KEY),
        ]);
        if (storedUserRaw && storedToken) {
          try {
            setUser(JSON.parse(storedUserRaw));
            setToken(storedToken);
          } catch {
            // corrupted cache — ignore
          }
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          return { success: false, error: data.error ?? "Login failed. Please try again." };
        }
        const mapped = mapApiUser(data.user);
        await AsyncStorage.setItem(TOKEN_KEY, data.token);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(mapped));
        setToken(data.token);
        setUser(mapped);
        return { success: true };
      } catch {
        return { success: false, error: "Network error. Please check your connection." };
      }
    },
    []
  );

  const register = useCallback(
    async (
      email: string,
      username: string,
      displayName: string,
      password: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetch(`${API_BASE}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, username, displayName, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          return { success: false, error: data.error ?? "Registration failed. Please try again." };
        }
        const mapped = mapApiUser(data.user);
        await AsyncStorage.setItem(TOKEN_KEY, data.token);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(mapped));
        setToken(data.token);
        setUser(mapped);
        return { success: true };
      } catch {
        return { success: false, error: "Network error. Please check your connection." };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      AsyncStorage.setItem(USER_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
