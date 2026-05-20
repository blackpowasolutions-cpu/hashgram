import http from "http";
import { Server, Socket } from "socket.io";
import { logger } from "./lib/logger";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  fromId: string;
  toId: string;
  type: "text" | "image" | "audio" | "document" | "video";
  content: string;
  metadata?: {
    filename?: string;
    duration?: number;
    size?: number;
    thumbnail?: string;
  };
  timestamp: string;
  read: boolean;
}

// ─── In-memory stores ─────────────────────────────────────────────────────────

const messageStore = new Map<string, ChatMessage[]>(); // roomId → messages
const onlineUsers = new Map<string, string>(); // userId → socketId
const pushTokens = new Map<string, string>(); // userId → expoPushToken

function getRoomId(a: string, b: string): string {
  return [a, b].sort().join("__");
}

// ─── Expo push notification ───────────────────────────────────────────────────

async function sendExpoPush(token: string, title: string, body: string): Promise<void> {
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: token,
        sound: "default",
        title,
        body,
        data: { type: "message" },
      }),
    });
  } catch (err) {
    logger.warn({ err }, "Failed to send expo push notification");
  }
}

// ─── Attach Socket.IO to an HTTP server ──────────────────────────────────────

export function attachSocketIO(server: http.Server): Server {
  const io = new Server(server, {
    path: "/api/socket.io",
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io.on("connection", (socket: Socket) => {
    logger.info({ socketId: socket.id }, "Socket connected");

    // ── Register user ──────────────────────────────────────────────────────
    socket.on("register", (data: { userId: string; pushToken?: string }) => {
      const { userId, pushToken } = data;
      onlineUsers.set(userId, socket.id);
      if (pushToken) pushTokens.set(userId, pushToken);
      socket.data["userId"] = userId;

      socket.broadcast.emit("user_status", { userId, online: true });
      socket.emit("online_users", Array.from(onlineUsers.keys()));

      logger.info({ userId }, "User registered");
    });

    // ── Register push token separately ────────────────────────────────────
    socket.on("register_token", (data: { userId: string; pushToken: string }) => {
      pushTokens.set(data.userId, data.pushToken);
    });

    // ── Send a message ────────────────────────────────────────────────────
    socket.on(
      "send_message",
      async (msg: Omit<ChatMessage, "id" | "timestamp" | "read">) => {
        const message: ChatMessage = {
          ...msg,
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          timestamp: new Date().toISOString(),
          read: false,
        };

        const roomId = getRoomId(msg.fromId, msg.toId);
        const room = messageStore.get(roomId) ?? [];
        room.push(message);
        messageStore.set(roomId, room);

        const recipientSocketId = onlineUsers.get(msg.toId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit("message_received", message);
          message.read = true;
        } else {
          const token = pushTokens.get(msg.toId);
          if (token) {
            const preview =
              msg.type === "text" ? msg.content : `Sent a ${msg.type}`;
            await sendExpoPush(token, `New message from ${msg.fromId}`, preview);
          }
        }

        socket.emit("message_sent", message);
      }
    );

    // ── Get message history ───────────────────────────────────────────────
    socket.on("get_history", (data: { userId: string; otherId: string }) => {
      const roomId = getRoomId(data.userId, data.otherId);
      socket.emit("history", {
        roomId,
        messages: messageStore.get(roomId) ?? [],
      });
    });

    // ── Typing events ─────────────────────────────────────────────────────
    socket.on("typing_start", (data: { fromId: string; toId: string }) => {
      const sid = onlineUsers.get(data.toId);
      if (sid) io.to(sid).emit("typing_start", { fromId: data.fromId });
    });

    socket.on("typing_stop", (data: { fromId: string; toId: string }) => {
      const sid = onlineUsers.get(data.toId);
      if (sid) io.to(sid).emit("typing_stop", { fromId: data.fromId });
    });

    // ── Mark messages read ────────────────────────────────────────────────
    socket.on("mark_read", (data: { userId: string; otherId: string }) => {
      const roomId = getRoomId(data.userId, data.otherId);
      const msgs = messageStore.get(roomId) ?? [];
      msgs.forEach((m) => {
        if (m.toId === data.userId) m.read = true;
      });
    });

    // ── Disconnect ────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      const userId = socket.data["userId"] as string | undefined;
      if (userId) {
        onlineUsers.delete(userId);
        socket.broadcast.emit("user_status", { userId, online: false });
        logger.info({ userId }, "User disconnected");
      }
    });
  });

  return io;
}
