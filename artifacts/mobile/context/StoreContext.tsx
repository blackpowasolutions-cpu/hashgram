import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

// ─── Level config (backend-configurable later) ────────────────────────────────

export const LEVEL_THRESHOLDS = [
  { level: 1, minPoints: 0,     label: "Bronze",   color: "#CD7F32", next: 1000   },
  { level: 2, minPoints: 1000,  label: "Silver",   color: "#A8A9AD", next: 5000   },
  { level: 3, minPoints: 5000,  label: "Gold",     color: "#FFD700", next: 8000   },
  { level: 4, minPoints: 8000,  label: "Platinum", color: "#E5E4E2", next: 12000  },
  { level: 5, minPoints: 12000, label: "Diamond",  color: "#B9F2FF", next: null   },
] as const;

export function getUserLevel(points: number) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= LEVEL_THRESHOLDS[i].minPoints) return LEVEL_THRESHOLDS[i];
  }
  return LEVEL_THRESHOLDS[0];
}

// ─── Gift card data (backend-configurable later) ──────────────────────────────

export interface GiftCard {
  id: string;
  brand: string;
  category: "Gaming" | "Food" | "Entertainment" | "Shopping" | "Travel";
  value: string;
  pointsCost: number;
  minLevel: 1 | 2 | 3 | 4 | 5;
  gradient: [string, string];
  emoji: string;
  description: string;
}

export const GIFT_CARDS: GiftCard[] = [
  // ── Level 1 ──────────────────────────────────────────────────────────────
  {
    id: "gc_spotify_5",
    brand: "Spotify",
    category: "Entertainment",
    value: "$5",
    pointsCost: 200,
    minLevel: 1,
    gradient: ["#1DB954", "#158a3e"],
    emoji: "🎵",
    description: "1 month Premium for new subscribers",
  },
  {
    id: "gc_gplay_5",
    brand: "Google Play",
    category: "Gaming",
    value: "$5",
    pointsCost: 220,
    minLevel: 1,
    gradient: ["#4285F4", "#1a5fc8"],
    emoji: "🎮",
    description: "Apps, games & in-app purchases",
  },
  {
    id: "gc_starbucks_5",
    brand: "Starbucks",
    category: "Food",
    value: "$5",
    pointsCost: 230,
    minLevel: 1,
    gradient: ["#00704A", "#005236"],
    emoji: "☕",
    description: "Your next handcrafted drink",
  },
  {
    id: "gc_youtube_10",
    brand: "YouTube",
    category: "Entertainment",
    value: "$10",
    pointsCost: 420,
    minLevel: 1,
    gradient: ["#FF0000", "#b30000"],
    emoji: "▶️",
    description: "Premium, movies & channel memberships",
  },

  // ── Level 2 ──────────────────────────────────────────────────────────────
  {
    id: "gc_netflix_15",
    brand: "Netflix",
    category: "Entertainment",
    value: "$15",
    pointsCost: 650,
    minLevel: 2,
    gradient: ["#E50914", "#8b0000"],
    emoji: "🎬",
    description: "Stream anywhere, cancel anytime",
  },
  {
    id: "gc_amazon_10",
    brand: "Amazon",
    category: "Shopping",
    value: "$10",
    pointsCost: 480,
    minLevel: 2,
    gradient: ["#FF9900", "#c47600"],
    emoji: "📦",
    description: "Millions of products, Prime eligible",
  },
  {
    id: "gc_doordash_15",
    brand: "DoorDash",
    category: "Food",
    value: "$15",
    pointsCost: 680,
    minLevel: 2,
    gradient: ["#FF3008", "#b82000"],
    emoji: "🛵",
    description: "Food delivery from your favourites",
  },
  {
    id: "gc_steam_10",
    brand: "Steam",
    category: "Gaming",
    value: "$10",
    pointsCost: 500,
    minLevel: 2,
    gradient: ["#1B2838", "#374e6f"],
    emoji: "🕹️",
    description: "Thousands of PC games & DLC",
  },

  // ── Level 3 ──────────────────────────────────────────────────────────────
  {
    id: "gc_apple_25",
    brand: "Apple",
    category: "Shopping",
    value: "$25",
    pointsCost: 1100,
    minLevel: 3,
    gradient: ["#555555", "#222222"],
    emoji: "🍎",
    description: "App Store, iTunes & Apple services",
  },
  {
    id: "gc_xbox_25",
    brand: "Xbox",
    category: "Gaming",
    value: "$25",
    pointsCost: 1150,
    minLevel: 3,
    gradient: ["#107C10", "#0a5a0a"],
    emoji: "🎮",
    description: "Games, DLC & Xbox Game Pass",
  },
  {
    id: "gc_airbnb_50",
    brand: "Airbnb",
    category: "Travel",
    value: "$50",
    pointsCost: 2200,
    minLevel: 3,
    gradient: ["#FF5A5F", "#c03c40"],
    emoji: "🏠",
    description: "Stays, experiences & adventures",
  },
  {
    id: "gc_target_25",
    brand: "Target",
    category: "Shopping",
    value: "$25",
    pointsCost: 1100,
    minLevel: 3,
    gradient: ["#CC0000", "#990000"],
    emoji: "🎯",
    description: "Groceries, clothing, electronics & more",
  },

  // ── Level 4 ──────────────────────────────────────────────────────────────
  {
    id: "gc_psn_50",
    brand: "PlayStation",
    category: "Gaming",
    value: "$50",
    pointsCost: 2200,
    minLevel: 4,
    gradient: ["#003087", "#00489e"],
    emoji: "🎮",
    description: "PS Store: games, add-ons & PS Plus",
  },
  {
    id: "gc_amazon_50",
    brand: "Amazon",
    category: "Shopping",
    value: "$50",
    pointsCost: 2200,
    minLevel: 4,
    gradient: ["#FF9900", "#c47600"],
    emoji: "📦",
    description: "Millions of products, Prime eligible",
  },
  {
    id: "gc_uber_30",
    brand: "Uber",
    category: "Travel",
    value: "$30",
    pointsCost: 1350,
    minLevel: 4,
    gradient: ["#000000", "#1a1a1a"],
    emoji: "🚗",
    description: "Rides, Uber Eats & Uber One",
  },

  // ── Level 5 ──────────────────────────────────────────────────────────────
  {
    id: "gc_apple_100",
    brand: "Apple",
    category: "Shopping",
    value: "$100",
    pointsCost: 4500,
    minLevel: 5,
    gradient: ["#444", "#111"],
    emoji: "🍎",
    description: "App Store, iTunes & Apple services",
  },
  {
    id: "gc_visa_100",
    brand: "Visa",
    category: "Shopping",
    value: "$100",
    pointsCost: 4500,
    minLevel: 5,
    gradient: ["#1A1F71", "#131854"],
    emoji: "💳",
    description: "Spend anywhere Visa is accepted",
  },
  {
    id: "gc_psn_100",
    brand: "PlayStation",
    category: "Gaming",
    value: "$100",
    pointsCost: 4500,
    minLevel: 5,
    gradient: ["#003087", "#00489e"],
    emoji: "🎮",
    description: "PS Store: games, add-ons & PS Plus",
  },
];

// ─── Context ──────────────────────────────────────────────────────────────────

interface RedemptionRecord {
  cardId: string;
  code: string;
  redeemedAt: string;
}

interface StoreContextValue {
  userPoints: number;
  redeemedCards: RedemptionRecord[];
  addPoints: (amount: number) => void;
  deductPoints: (amount: number) => boolean;
  recordPurchase: (cardId: string, code: string, redeemedAt: string, pointsCost: number) => void;
  getRedemption: (cardId: string) => RedemptionRecord | undefined;
}

const StoreContext = createContext<StoreContextValue | null>(null);

const STORAGE_KEY_REDEEMED = "@reels_store_redeemed";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { user, updateUser } = useAuth();
  const [redeemedCards, setRedeemedCards] = useState<RedemptionRecord[]>([]);

  const userPoints = user?.points ?? 0;

  // Hydrate purchase history from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const redeemed = await AsyncStorage.getItem(STORAGE_KEY_REDEEMED);
        if (redeemed !== null) setRedeemedCards(JSON.parse(redeemed));
      } catch {}
    })();
  }, []);

  const persistRedeemed = useCallback(async (records: RedemptionRecord[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_REDEEMED, JSON.stringify(records));
    } catch {}
  }, []);

  const addPoints = useCallback(
    (amount: number) => {
      updateUser({ points: (user?.points ?? 0) + amount });
    },
    [user, updateUser]
  );

  const deductPoints = useCallback(
    (amount: number): boolean => {
      const current = user?.points ?? 0;
      if (current < amount) return false;
      updateUser({ points: current - amount });
      return true;
    },
    [user, updateUser]
  );

  const recordPurchase = useCallback(
    (cardId: string, code: string, redeemedAt: string, pointsCost: number) => {
      deductPoints(pointsCost);
      const record: RedemptionRecord = { cardId, code, redeemedAt };
      setRedeemedCards((prev) => {
        const next = [...prev, record];
        persistRedeemed(next);
        return next;
      });
    },
    [deductPoints, persistRedeemed]
  );

  const getRedemption = useCallback(
    (cardId: string) => redeemedCards.find((r) => r.cardId === cardId),
    [redeemedCards]
  );

  return (
    <StoreContext.Provider
      value={{ userPoints, redeemedCards, addPoints, deductPoints, recordPurchase, getRedemption }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
