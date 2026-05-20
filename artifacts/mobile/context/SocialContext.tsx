import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

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

export const CONTACT_ID_MAP: Record<string, string> = {
  "1": "user_1",
  "2": "user_3",
  "3": "user_4",
  "4": "user_2",
  "5": "user_5",
};

export const APP_USERS: AppUser[] = [
  {
    id: "1",
    username: "@dancequeen",
    displayName: "Dance Queen",
    avatarColor: "#FF6B9D",
    bio: "Professional dancer & content creator 💃 Choreography videos every week!",
    website: "linktr.ee/dancequeen",
    followers: 482000,
    following: 1240,
    likes: 8920000,
    contactId: "user_1",
  },
  {
    id: "2",
    username: "@sk8er_pro",
    displayName: "Sk8er Pro",
    avatarColor: "#6BCB77",
    bio: "Skateboarder 🛹 | Trick tips | Street & park | Never give up",
    followers: 893000,
    following: 890,
    likes: 15600000,
    contactId: "user_3",
  },
  {
    id: "3",
    username: "@wanderlust",
    displayName: "Wanderlust",
    avatarColor: "#4D96FF",
    bio: "Travel blogger 🌍 | Hidden gems | Adventure seeker | 50+ countries",
    website: "wanderlust.travel",
    followers: 1200000,
    following: 2100,
    likes: 22000000,
    contactId: "user_4",
  },
  {
    id: "4",
    username: "@streetfoodking",
    displayName: "Street Food King",
    avatarColor: "#FF8C42",
    bio: "Street food explorer 👨‍🍳 | Recipe secrets | Grandma approved dishes",
    followers: 271000,
    following: 530,
    likes: 3100000,
    contactId: "user_2",
  },
  {
    id: "5",
    username: "@stylequeen",
    displayName: "Style Queen",
    avatarColor: "#C77DFF",
    bio: "Sustainable fashion ✨ | Thrift queen | Outfit inspo | Style tips",
    website: "stylequeen.co",
    followers: 567000,
    following: 1800,
    likes: 9800000,
    contactId: "user_5",
  },
  {
    id: "6",
    username: "@techguru",
    displayName: "Tech Guru",
    avatarColor: "#25F4EE",
    bio: "Tech reviews & hot takes 🖥️ | Gadgets | AI & future tech",
    followers: 320000,
    following: 670,
    likes: 5400000,
  },
  {
    id: "7",
    username: "@fitnessmotiv",
    displayName: "Fitness Motiv",
    avatarColor: "#F9C74F",
    bio: "Fitness coach 💪 | Daily workouts | Nutrition tips | Mindset",
    followers: 198000,
    following: 420,
    likes: 3200000,
  },
  {
    id: "8",
    username: "@artbylucy",
    displayName: "Art by Lucy",
    avatarColor: "#F94144",
    bio: "Digital artist 🎨 | Commissions open | Art process videos",
    followers: 145000,
    following: 380,
    likes: 2100000,
  },
  {
    id: "9",
    username: "@musicvibes",
    displayName: "Music Vibes",
    avatarColor: "#90BE6D",
    bio: "Music producer & DJ 🎵 | Original tracks | Beat making tutorials",
    followers: 112000,
    following: 290,
    likes: 1800000,
  },
  {
    id: "10",
    username: "@coolgamer",
    displayName: "Cool Gamer",
    avatarColor: "#577590",
    bio: "Gamer 🎮 | FPS & RPG | Streaming daily | Clip highlights",
    followers: 89000,
    following: 210,
    likes: 1400000,
  },
];

export const USER_FEED_POSTS: Record<string, UserFeedPost[]> = {
  "1": [
    { id: "fp_1_1", userId: "1", content: "Studio day ✨ The new choreo is 🔥 and I cannot wait for you all to see it. Keep your notifications on!", imageKey: "reel1", createdAt: "6h ago", likes: 782, comments: 93, shares: 61 },
    { id: "fp_1_2", userId: "1", content: "When the vibe hits different 💃 Drop your favorite song in the comments and I'll choreograph it!", createdAt: "1d ago", likes: 1456, comments: 234, shares: 108 },
    { id: "fp_1_3", userId: "1", content: "New collab dropping this Friday! Can you guess who it is? 👀🎵", createdAt: "3d ago", likes: 2890, comments: 567, shares: 312 },
  ],
  "2": [
    { id: "fp_2_1", userId: "2", content: "Finally landed that trick I've been working on for 3 months 🛹 Hard work pays off! Who else grinds until they get it?", imageKey: "reel3", createdAt: "14 min ago", likes: 312, comments: 38, shares: 12 },
    { id: "fp_2_2", userId: "2", content: "New spot found 🎯 The concrete is smooth and the vibes are immaculate. Dropping the full session tomorrow!", createdAt: "2d ago", likes: 891, comments: 145, shares: 67 },
  ],
  "3": [
    { id: "fp_3_1", userId: "3", content: "Reminder that you can change your mind, change your path, and change your life at any point. You're not too late. 🌍✨", createdAt: "1h ago", likes: 891, comments: 104, shares: 87 },
    { id: "fp_3_2", userId: "3", content: "Just landed in my 51st country 🇵🇦 Panama is STUNNING. Thread of hidden gems below 👇", imageKey: "reel4", createdAt: "5d ago", likes: 3240, comments: 456, shares: 289 },
  ],
  "4": [
    { id: "fp_4_1", userId: "4", content: "Made my grandma's secret noodle recipe tonight 🍜 Some things are just too good to keep to yourself. Recipe in the comments!", imageKey: "reel2", createdAt: "2h ago", likes: 543, comments: 267, shares: 54 },
    { id: "fp_4_2", userId: "4", content: "Night market in Bangkok hits different at 2am 🌙 The smell, the sounds, the food... unreal.", createdAt: "4d ago", likes: 1780, comments: 321, shares: 198 },
  ],
  "5": [
    { id: "fp_5_1", userId: "5", content: "Today's outfit is giving main character energy 💜 Thrifted every single piece — total cost $14. Fashion doesn't have to be expensive.", imageKey: "reel5", createdAt: "3h ago", likes: 1204, comments: 189, shares: 143 },
    { id: "fp_5_2", userId: "5", content: "Current thrift haul era 💜 17 pieces, $42 total. Sustainability looks good on everyone 🌿", createdAt: "6d ago", likes: 4567, comments: 678, shares: 456 },
  ],
  "6": [
    { id: "fp_6_1", userId: "6", content: "Hot take: Social media isn't making us antisocial — it's just shifting where our social energy goes. What do you think? 🤔", createdAt: "5h ago", likes: 432, comments: 312, shares: 78 },
    { id: "fp_6_2", userId: "6", content: "Just unboxed the new GPU and it's absolutely wild what $400 gets you now. Full benchmark breakdown dropping soon.", createdAt: "8d ago", likes: 2100, comments: 567, shares: 234 },
  ],
  "7": [
    { id: "fp_7_1", userId: "7", content: "5am workout hits different when you're consistent for 90 days straight 💪 No excuses, just results.", createdAt: "3h ago", likes: 876, comments: 134, shares: 89 },
  ],
  "8": [
    { id: "fp_8_1", userId: "8", content: "Finished this commission piece after 14 hours straight 🎨 The client cried when they saw it. Worth every second.", createdAt: "1d ago", likes: 2340, comments: 456, shares: 234 },
  ],
  "9": [
    { id: "fp_9_1", userId: "9", content: "New beat just dropped on SoundCloud 🎵 Link in bio. This one took 3 weeks and it's my favorite yet.", createdAt: "4h ago", likes: 567, comments: 89, shares: 45 },
  ],
  "10": [
    { id: "fp_10_1", userId: "10", content: "Just hit Diamond rank after 200 hours this season 💎 The grind was REAL. New highlight reel dropping tonight.", createdAt: "2h ago", likes: 1234, comments: 234, shares: 123 },
  ],
};

export const USER_REELS: Record<string, UserReel[]> = {
  "1": [
    { id: "r_1_1", userId: "1", title: "Dance Drop", imageKey: "reel1", plays: 120000, likes: 48200 },
    { id: "r_1_2", userId: "1", title: "New Choreo", imageKey: "reel1", plays: 89000, likes: 34100 },
    { id: "r_1_3", userId: "1", title: "Behind the Scenes", imageKey: "reel1", plays: 67000, likes: 22800 },
    { id: "r_1_4", userId: "1", title: "Collab Teaser", imageKey: "reel1", plays: 234000, likes: 78900 },
  ],
  "2": [
    { id: "r_2_1", userId: "2", title: "Sk8 Trick", imageKey: "reel3", plays: 98000, likes: 38900 },
    { id: "r_2_2", userId: "2", title: "Street Session", imageKey: "reel3", plays: 71000, likes: 24500 },
    { id: "r_2_3", userId: "2", title: "Park Highlights", imageKey: "reel3", plays: 45000, likes: 18200 },
  ],
  "3": [
    { id: "r_3_1", userId: "3", title: "Mountain View", imageKey: "reel4", plays: 87000, likes: 29500 },
    { id: "r_3_2", userId: "3", title: "Hidden Beach", imageKey: "reel4", plays: 145000, likes: 54800 },
    { id: "r_3_3", userId: "3", title: "City Night", imageKey: "reel4", plays: 62000, likes: 21300 },
    { id: "r_3_4", userId: "3", title: "Street Market", imageKey: "reel4", plays: 78000, likes: 28900 },
  ],
  "4": [
    { id: "r_4_1", userId: "4", title: "Street Food", imageKey: "reel2", plays: 71000, likes: 22100 },
    { id: "r_4_2", userId: "4", title: "Noodle Recipe", imageKey: "reel2", plays: 89000, likes: 31200 },
  ],
  "5": [
    { id: "r_5_1", userId: "5", title: "GRWM", imageKey: "reel5", plays: 62000, likes: 18700 },
    { id: "r_5_2", userId: "5", title: "Thrift Haul", imageKey: "reel5", plays: 94000, likes: 32400 },
    { id: "r_5_3", userId: "5", title: "Style Guide", imageKey: "reel5", plays: 78000, likes: 28100 },
  ],
  "6": [
    { id: "r_6_1", userId: "6", title: "GPU Review", imageKey: "reel1", plays: 55000, likes: 15400 },
    { id: "r_6_2", userId: "6", title: "AI Tools 2025", imageKey: "reel1", plays: 43000, likes: 12800 },
  ],
  "7": [
    { id: "r_7_1", userId: "7", title: "Morning Workout", imageKey: "reel2", plays: 48000, likes: 12800 },
    { id: "r_7_2", userId: "7", title: "Meal Prep Sunday", imageKey: "reel2", plays: 67000, likes: 18400 },
  ],
  "8": [
    { id: "r_8_1", userId: "8", title: "Speed Art", imageKey: "reel3", plays: 41000, likes: 10200 },
    { id: "r_8_2", userId: "8", title: "Commission Process", imageKey: "reel3", plays: 28000, likes: 8900 },
  ],
  "9": [
    { id: "r_9_1", userId: "9", title: "Beat Making", imageKey: "reel4", plays: 36000, likes: 8900 },
    { id: "r_9_2", userId: "9", title: "Live DJ Set", imageKey: "reel4", plays: 54000, likes: 14200 },
  ],
  "10": [
    { id: "r_10_1", userId: "10", title: "FPS Highlights", imageKey: "reel5", plays: 30000, likes: 7200 },
    { id: "r_10_2", userId: "10", title: "RPG Playthrough", imageKey: "reel5", plays: 22000, likes: 5800 },
  ],
};

interface SocialContextValue {
  followingSet: Set<string>;
  isFollowing: (userId: string) => boolean;
  toggleFollow: (userId: string) => void;
  getUser: (id: string) => AppUser | undefined;
  getUserFollowers: (userId: string) => AppUser[];
  getUserFollowing: (userId: string) => AppUser[];
}

const SocialContext = createContext<SocialContextValue | null>(null);

const STORAGE_KEY = "@reels_following_v1";
const DEFAULT_FOLLOWING = ["1", "3", "5"];

export function SocialProvider({ children }: { children: React.ReactNode }) {
  const [followingList, setFollowingList] = useState<string[]>(DEFAULT_FOLLOWING);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((val) => {
        if (val) setFollowingList(JSON.parse(val));
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
    (id: string) => APP_USERS.find((u) => u.id === id),
    []
  );

  const getUserFollowers = useCallback((userId: string) => {
    return APP_USERS.filter((u) => u.id !== userId).slice(0, 8);
  }, []);

  const getUserFollowing = useCallback((userId: string) => {
    return APP_USERS.filter((u) => u.id !== userId).slice(0, 5);
  }, []);

  return (
    <SocialContext.Provider
      value={{
        followingSet,
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
