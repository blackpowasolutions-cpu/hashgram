import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

export interface AppUser {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  bio: string;
  website?: string;
  followers: number;
  following: number;
  likes: number;
  contactId?: string;
}

export interface UserFeedPost {
  id: string;
  userId: string;
  content: string;
  imageKey?: string;
  createdAt: string;
  likes: number;
  comments: number;
  shares: number;
}

export interface UserReel {
  id: string;
  userId: string;
  title: string;
  imageKey: string;
  plays: number;
  likes: number;
}

export const CONTACT_ID_MAP: Record<string, string> = {};

export const APP_USERS: AppUser[] = [];

export const USER_FEED_POSTS: Record<string, UserFeedPost[]> = {};

export const USER_REELS: Record<string, UserReel[]> = {};

const AVATAR_COLORS = [
  "#FF6B9D", "#6BCB77", "#4D96FF", "#FF8C42", "#C77DFF",
  "#25F4EE", "#F9C74F", "#F94144", "#90BE6D", "#577590",
  "#FE2C55", "#43AA8B",
];

function colorForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface SocialContextValue {
  followingSet: Set<string>;
  users: AppUser[];
  isFollowing: (userId: string) => boolean;
  toggleFollow: (userId: string) => void;
  getUser: (id: string) => AppUser | undefined;
  getUserFollowers: (userId: string) => AppUser[];
  getUserFollowing: (userId: string) => AppUser[];
}

const SocialContext = createContext<SocialContextValue | null>(null);

const STORAGE_KEY = "@reels_following_v1";

export function SocialProvider({ children }: { children: React.ReactNode }) {
  const [followingList, setFollowingList] = useState<string[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((val) => {
        if (val) setFollowingList(JSON.parse(val));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/users`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: unknown) => {
        if (!Array.isArray(data)) return;
        const mapped: AppUser[] = (data as Record<string, unknown>[]).map((u) => {
          const id = String(u.id ?? "");
          const username = String(u.username ?? "");
          return {
            id,
            username: username.startsWith("@") ? username : `@${username}`,
            displayName: String(u.displayName ?? ""),
            avatarColor: colorForId(id),
            bio: u.bio ? String(u.bio) : "",
            website: u.website ? String(u.website) : undefined,
            followers: 0,
            following: 0,
            likes: typeof u.points === "number" ? u.points : 0,
          };
        });
        setUsers(mapped);
        APP_USERS.splice(0, APP_USERS.length, ...mapped);
      })
      .catch(() => {});
  }, []);

  const followingSet = new Set(followingList);

  const isFollowing = useCallback(
    (userId: string) => followingSet.has(userId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [followingList]
  );

  const toggleFollow = useCallback((userId: string) => {
    setFollowingList((prev) => {
      const next = prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const getUser = useCallback(
    (id: string) => users.find((u) => u.id === id),
    [users]
  );

  const getUserFollowers = useCallback(
    (userId: string) => users.filter((u) => u.id !== userId).slice(0, 8),
    [users]
  );

  const getUserFollowing = useCallback(
    (userId: string) => users.filter((u) => u.id !== userId).slice(0, 5),
    [users]
  );

  return (
    <SocialContext.Provider
      value={{
        followingSet,
        users,
        isFollowing,
        toggleFollow,
        getUser,
        getUserFollowers,
        getUserFollowing,
      }}
    >
      {children}
    </SocialContext.Provider>
  );
}

export function useSocial() {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error("useSocial must be used within SocialProvider");
  return ctx;
}
