import React, { createContext, useContext, useState, useEffect } from "react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import type { User } from "@workspace/api-client-react";
import { getAuthToken, setAuthToken as setStorageToken, removeAuthToken } from "@/lib/auth";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [user, setUser] = useState<User | null>(null);

  const { data: fetchedUser, isLoading, error } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
      queryKey: getGetMeQueryKey(),
    }
  });

  useEffect(() => {
    if (fetchedUser) {
      if (fetchedUser.role === "admin") {
        setUser(fetchedUser);
      } else {
        logout();
      }
    } else if (error) {
      logout();
    }
  }, [fetchedUser, error]);

  const login = (newToken: string, newUser: User) => {
    setStorageToken(newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    removeAuthToken();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading: token ? isLoading : false,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
