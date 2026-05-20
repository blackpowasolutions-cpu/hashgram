import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";
import { io, Socket } from "socket.io-client";

import { useAuth } from "./AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Contact {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  bio: string;
}

export type MessageType = "text" | "image" | "audio" | "document" | "video";

export interface ChatMessage {
  id: string;
  fromId: string;
  toId: string;
  type: MessageType;
  content: string;
  metadata?: {
    filename?: string;
    duration?: number;
    size?: number;
    thumbnail?: string;
  };
  timestamp: string;
  read: boolean;
  status: "sending" | "sent" | "delivered" | "read";
}

export interface Conversation {
  contact: Contact;
  lastMessage: ChatMessage | null;
  unreadCount: number;
}

interface MessagesContextType {
  contacts: Contact[];
  conversations: Conversation[];
  messages: Record<string, ChatMessage[]>;
  onlineUsers: Set<string>;
  typingUsers: Set<string>;
  connected: boolean;
  sendMessage: (
    toId: string,
    type: MessageType,
    content: string,
    metadata?: ChatMessage["metadata"]
  ) => void;
  markRead: (contactId: string) => void;
  setTyping: (toId: string, isTyping: boolean) => void;
}

// ─── Demo data ────────────────────────────────────────────────────────────────

export const CONTACTS: Contact[] = [
  {
    id: "user_1",
    username: "@dancequeen",
    displayName: "Dance Queen",
    avatarColor: "#FF6B9D",
    bio: "Dance is life 💃",
  },
  {
    id: "user_2",
    username: "@streetfoodking",
    displayName: "Street Food King",
    avatarColor: "#FF8C42",
    bio: "Foodie chef 👨‍🍳",
  },
  {
    id: "user_3",
    username: "@sk8er_pro",
    displayName: "Sk8er Pro",
    avatarColor: "#6BCB77",
    bio: "Skate or die 🛹",
  },
  {
    id: "user_4",
    username: "@wanderlust",
    displayName: "Wanderlust",
    avatarColor: "#4D96FF",
    bio: "Always exploring 🏔️",
  },
  {
    id: "user_5",
    username: "@stylequeen",
    displayName: "Style Queen",
    avatarColor: "#C77DFF",
    bio: "Fashion & vibes ✨",
  },
];

const BOT_REPLIES: Record<string, string[]> = {
  user_1: [
    "Yesss! 🔥",
    "Love that energy!",
    "We should make a collab reel!",
    "Dancing together would be iconic 🔥🔥",
    "Omg yes!! 💃",
  ],
  user_2: [
    "Glad you like it! 😄",
    "The secret ingredient is love 😂",
    "Come to my stall sometime!",
    "Next recipe coming soon 👨‍🍳",
    "Food is life bro!",
  ],
  user_3: [
    "Gnarly!! 🛹",
    "Practice makes perfect!",
    "Let's skate together sometime",
    "The park is open tomorrow if you wanna come",
    "Sick!! Keep it up 🤙",
  ],
  user_4: [
    "Iceland is AMAZING 🌋",
    "You should come! It's worth every penny",
    "The views here are unreal 😭",
    "Bucket list trip for sure!",
    "The food here is... interesting 😅",
  ],
  user_5: [
    "Yasss love that! ✨",
    "Fashion is self expression 💕",
    "We should do a style collab!",
    "Thrifting is literally the best",
    "Goals!! 👑",
  ],
};

function makeMsg(
  from: string,
  to: string,
  type: MessageType,
  content: string,
  minutesAgo: number,
  metadata?: ChatMessage["metadata"]
): ChatMessage {
  return {
    id: `seed_${Math.random().toString(36).slice(2)}`,
    fromId: from,
    toId: to,
    type,
    content,
    metadata,
    timestamp: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
    read: true,
    status: "read",
  };
}

function buildSeedMessages(myId: string): Record<string, ChatMessage[]> {
  return {
    user_1: [
      makeMsg("user_1", myId, "text", "Hey! Loved your latest post 🔥", 90),
      makeMsg(myId, "user_1", "text", "Thanks!! Been working on that for weeks 😄", 88),
      makeMsg("user_1", myId, "text", "It really shows! Want to collab sometime?", 87),
      makeMsg(myId, "user_1", "text", "Absolutely! Let me know when you're free 🙌", 85),
      makeMsg("user_1", myId, "image", "https://picsum.photos/seed/dance1/400/400", 30),
      makeMsg("user_1", myId, "text", "Check out my new dance studio 😍", 29),
    ],
    user_2: [
      makeMsg("user_2", myId, "text", "Do you want the secret noodle recipe? 🍜", 180),
      makeMsg(myId, "user_2", "text", "YES please!! 🙏🙏", 179),
      makeMsg("user_2", myId, "document", "Secret_Noodle_Recipe.pdf", 178, {
        filename: "Secret_Noodle_Recipe.pdf",
        size: 245_000,
      }),
      makeMsg("user_2", myId, "text", "Don't share this with anyone 😂", 177),
      makeMsg(myId, "user_2", "text", "Your secret is safe with me chef! 🤫", 175),
    ],
    user_3: [
      makeMsg("user_3", myId, "text", "Bro did you see my 900 flip?? 🛹", 300),
      makeMsg(myId, "user_3", "text", "Insane!! How long did that take?", 299),
      makeMsg("user_3", myId, "text", "Like 3 months lol 😅", 298),
      makeMsg("user_3", myId, "video", "https://picsum.photos/seed/skate_vid/400/300", 280, {
        thumbnail: "https://picsum.photos/seed/skate1/400/300",
        duration: 15,
        filename: "skate_900flip.mp4",
      }),
      makeMsg("user_3", myId, "text", "Raw footage 🎥 Don't laugh at my falls", 278),
    ],
    user_4: [
      makeMsg("user_4", myId, "text", "Just landed in Iceland! ✈️🇮🇸", 500),
      makeMsg(myId, "user_4", "text", "No way!! So jealous rn 😭", 499),
      makeMsg("user_4", myId, "image", "https://picsum.photos/seed/iceland1/400/500", 498),
      makeMsg("user_4", myId, "image", "https://picsum.photos/seed/iceland2/400/500", 497),
      makeMsg("user_4", myId, "text", "Northern lights tonight 🌌 You should come!", 496),
      makeMsg(myId, "user_4", "text", "Booking flights now 😂", 494),
    ],
    user_5: [
      makeMsg("user_5", myId, "text", "Hey! Love your style btw ✨", 20),
      makeMsg(myId, "user_5", "text", "Omg thank you!! 💕", 19),
      makeMsg("user_5", myId, "text", "Where do you get your outfits from?", 18),
      makeMsg(myId, "user_5", "text", "Mostly thrift stores honestly 😄", 17),
      makeMsg("user_5", myId, "text", "Sustainable fashion queen 👑", 15),
    ],
  };
}

// ─── Push notification setup ──────────────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushAsync(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;
  try {
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: process.env["EXPO_PUBLIC_REPL_ID"] ?? "reels-app",
    });
    return token.data;
  } catch {
    return null;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const MessagesContext = createContext<MessagesContextType | null>(null);

const STORAGE_KEY = "@reels_messages_v2";

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const seedInitialized = useRef(false);

  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(
    new Set(["user_1", "user_3", "user_5"])
  );
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [connected, setConnected] = useState(false);
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ── Seed messages once user is known ────────────────────────────────────
  useEffect(() => {
    if (!user || seedInitialized.current) return;
    seedInitialized.current = true;

    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      const seed = buildSeedMessages(user.id);
      if (stored) {
        try {
          const persisted = JSON.parse(stored) as Record<string, ChatMessage[]>;
          setMessages({ ...seed, ...persisted });
          return;
        } catch {}
      }
      setMessages(seed);
    });
  }, [user]);

  const persist = useCallback((msgs: Record<string, ChatMessage[]>) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(msgs)).catch(() => {});
  }, []);

  // ── Socket.IO connection ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const domain = process.env["EXPO_PUBLIC_DOMAIN"];
    if (!domain) return;

    const socket = io(`https://${domain}`, {
      path: "/api/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 10_000,
    });

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("register", { userId: user.id });
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("online_users", (users: string[]) => {
      setOnlineUsers(new Set(users));
    });

    socket.on("user_status", ({ userId, online }: { userId: string; online: boolean }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (online) next.add(userId);
        else next.delete(userId);
        return next;
      });
    });

    socket.on("message_received", (msg: ChatMessage) => {
      setMessages((prev) => {
        const key = msg.fromId;
        const updated = { ...prev, [key]: [...(prev[key] ?? []), msg] };
        persist(updated);
        return updated;
      });
      Notifications.scheduleNotificationAsync({
        content: {
          title:
            CONTACTS.find((c) => c.id === msg.fromId)?.displayName ??
            "New message",
          body: msg.type === "text" ? msg.content : `Sent a ${msg.type}`,
          data: { fromId: msg.fromId },
        },
        trigger: null,
      }).catch(() => {});
    });

    socket.on("message_sent", (msg: ChatMessage) => {
      setMessages((prev) => {
        const key = msg.toId;
        const list = (prev[key] ?? []).map((m) =>
          m.id.startsWith("opt_") && m.timestamp === msg.timestamp
            ? { ...msg, status: "delivered" as const }
            : m
        );
        const updated = { ...prev, [key]: list };
        persist(updated);
        return updated;
      });
    });

    socket.on("typing_start", ({ fromId }: { fromId: string }) => {
      setTypingUsers((prev) => new Set([...prev, fromId]));
      clearTimeout(typingTimers.current[fromId]);
      typingTimers.current[fromId] = setTimeout(() => {
        setTypingUsers((prev) => {
          const next = new Set(prev);
          next.delete(fromId);
          return next;
        });
      }, 3000);
    });

    socket.on("typing_stop", ({ fromId }: { fromId: string }) => {
      clearTimeout(typingTimers.current[fromId]);
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(fromId);
        return next;
      });
    });

    socketRef.current = socket;

    registerForPushAsync().then((token) => {
      if (token) socket.emit("register_token", { userId: user.id, pushToken: token });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, persist]);

  // ── Simulate bot reply ───────────────────────────────────────────────────
  const simulateBotReply = useCallback(
    (contactId: string) => {
      const replies = BOT_REPLIES[contactId];
      if (!replies || !user) return;
      const delay = 1500 + Math.random() * 1500;

      setTimeout(() => {
        setTypingUsers((prev) => new Set([...prev, contactId]));
      }, delay * 0.35);

      setTimeout(() => {
        setTypingUsers((prev) => {
          const next = new Set(prev);
          next.delete(contactId);
          return next;
        });
        const reply = replies[Math.floor(Math.random() * replies.length)];
        const msg: ChatMessage = {
          id: `bot_${Date.now()}`,
          fromId: contactId,
          toId: user.id,
          type: "text",
          content: reply,
          timestamp: new Date().toISOString(),
          read: false,
          status: "delivered",
        };
        setMessages((prev) => {
          const updated = {
            ...prev,
            [contactId]: [...(prev[contactId] ?? []), msg],
          };
          persist(updated);
          return updated;
        });
      }, delay);
    },
    [user, persist]
  );

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    (
      toId: string,
      type: MessageType,
      content: string,
      metadata?: ChatMessage["metadata"]
    ) => {
      if (!user) return;
      const ts = new Date().toISOString();
      const optimisticMsg: ChatMessage = {
        id: `opt_${Date.now()}`,
        fromId: user.id,
        toId,
        type,
        content,
        metadata,
        timestamp: ts,
        read: false,
        status: "sending",
      };

      setMessages((prev) => {
        const updated = {
          ...prev,
          [toId]: [...(prev[toId] ?? []), optimisticMsg],
        };
        persist(updated);
        return updated;
      });

      if (socketRef.current?.connected) {
        socketRef.current.emit("send_message", {
          fromId: user.id,
          toId,
          type,
          content,
          metadata,
          timestamp: ts,
        });
      } else {
        setTimeout(() => {
          setMessages((prev) => {
            const updated = {
              ...prev,
              [toId]: (prev[toId] ?? []).map((m) =>
                m.id === optimisticMsg.id ? { ...m, status: "sent" as const } : m
              ),
            };
            persist(updated);
            return updated;
          });
          simulateBotReply(toId);
        }, 600);
      }
    },
    [user, simulateBotReply, persist]
  );

  // ── Mark read ────────────────────────────────────────────────────────────
  const markRead = useCallback(
    (contactId: string) => {
      setMessages((prev) => {
        const updated = {
          ...prev,
          [contactId]: (prev[contactId] ?? []).map((m) => ({
            ...m,
            read: true,
          })),
        };
        persist(updated);
        return updated;
      });
      if (socketRef.current?.connected && user) {
        socketRef.current.emit("mark_read", {
          userId: user.id,
          otherId: contactId,
        });
      }
    },
    [user, persist]
  );

  // ── Typing indicator ─────────────────────────────────────────────────────
  const setTyping = useCallback(
    (toId: string, isTyping: boolean) => {
      if (!socketRef.current?.connected || !user) return;
      socketRef.current.emit(isTyping ? "typing_start" : "typing_stop", {
        fromId: user.id,
        toId,
      });
    },
    [user]
  );

  // ── Conversations list ───────────────────────────────────────────────────
  const conversations: Conversation[] = CONTACTS.map((contact) => {
    const msgs = messages[contact.id] ?? [];
    return {
      contact,
      lastMessage: msgs.length > 0 ? msgs[msgs.length - 1] : null,
      unreadCount: msgs.filter((m) => m.fromId === contact.id && !m.read).length,
    };
  }).sort((a, b) => {
    const at = a.lastMessage?.timestamp ?? "";
    const bt = b.lastMessage?.timestamp ?? "";
    return bt.localeCompare(at);
  });

  return (
    <MessagesContext.Provider
      value={{
        contacts: CONTACTS,
        conversations,
        messages,
        onlineUsers,
        typingUsers,
        connected,
        sendMessage,
        markRead,
        setTyping,
      }}
    >
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error("useMessages must be used within MessagesProvider");
  return ctx;
}
