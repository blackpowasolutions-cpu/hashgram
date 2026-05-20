import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import {
  ChatMessage,
  Conversation,
  useMessages,
} from "@/context/MessagesContext";
import { useColors } from "@/hooks/useColors";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7)
    return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function lastMessagePreview(msg: ChatMessage, myId: string): string {
  const prefix = msg.fromId === myId ? "You: " : "";
  switch (msg.type) {
    case "text":
      return prefix + msg.content;
    case "image":
      return prefix + "📷 Photo";
    case "video":
      return prefix + "🎬 Video";
    case "audio":
      return prefix + "🎤 Voice note";
    case "document":
      return prefix + "📄 " + (msg.metadata?.filename ?? "Document");
    default:
      return prefix + "Message";
  }
}

// ─── Conversation Row ─────────────────────────────────────────────────────────

interface ConvRowProps {
  item: Conversation;
  myId: string;
  isOnline: boolean;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}

function ConvRow({ item, myId, isOnline, colors, onPress }: ConvRowProps) {
  const { contact, lastMessage, unreadCount } = item;
  const hasUnread = unreadCount > 0;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? colors.muted : colors.card },
      ]}
      onPress={onPress}
    >
      {/* Avatar */}
      <View style={styles.avatarWrap}>
        <View style={[styles.avatar, { backgroundColor: contact.avatarColor }]}>
          <Text style={styles.avatarInitial}>
            {contact.displayName[0]}
          </Text>
        </View>
        {isOnline && <View style={styles.onlineDot} />}
      </View>

      {/* Content */}
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text
            style={[
              styles.rowName,
              { color: colors.foreground },
              hasUnread && styles.rowNameBold,
            ]}
            numberOfLines={1}
          >
            {contact.displayName}
          </Text>
          {lastMessage && (
            <Text
              style={[
                styles.rowTime,
                { color: hasUnread ? "#FE2C55" : colors.mutedForeground },
              ]}
            >
              {formatTime(lastMessage.timestamp)}
            </Text>
          )}
        </View>
        <View style={styles.rowBottom}>
          <Text
            style={[
              styles.rowPreview,
              {
                color: hasUnread ? colors.foreground : colors.mutedForeground,
                fontFamily: hasUnread ? "Inter_500Medium" : "Inter_400Regular",
              },
            ]}
            numberOfLines={1}
          >
            {lastMessage
              ? lastMessagePreview(lastMessage, myId)
              : contact.bio}
          </Text>
          {hasUnread && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MessagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { conversations, onlineUsers, connected } = useMessages();

  const topPad = insets.top + (Platform.OS === "web" ? 0 : 0);

  const handleOpen = useCallback((contactId: string) => {
    Haptics.selectionAsync();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push({ pathname: "/chat/[userId]" as any, params: { userId: contactId } });
  }, []);

  const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 12,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Messages
          </Text>
          {totalUnread > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{totalUnread}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          <View
            style={[
              styles.connDot,
              { backgroundColor: connected ? "#4CAF50" : colors.mutedForeground },
            ]}
          />
        </View>
      </View>

      {/* List */}
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.contact.id}
        renderItem={({ item }) => (
          <ConvRow
            item={item}
            myId={user?.id ?? ""}
            isOnline={onlineUsers.has(item.contact.id)}
            colors={colors}
            onPress={() => handleOpen(item.contact.id)}
          />
        )}
        ItemSeparatorComponent={() => (
          <View
            style={[styles.separator, { backgroundColor: colors.border }]}
          />
        )}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  headerBadge: {
    backgroundColor: "#FE2C55",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
  },
  headerBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  headerRight: {
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  connDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  avatarWrap: {
    position: "relative",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: "#fff",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: "#4CAF50",
    borderWidth: 2,
    borderColor: "#fff",
  },
  rowContent: {
    flex: 1,
    gap: 3,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowName: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    flex: 1,
    marginRight: 8,
  },
  rowNameBold: {
    fontFamily: "Inter_700Bold",
  },
  rowTime: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  rowBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowPreview: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    backgroundColor: "#FE2C55",
    borderRadius: 10,
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 80,
  },
});
