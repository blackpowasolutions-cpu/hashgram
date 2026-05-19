import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");

interface PointBreakdown {
  posts: number;
  logins: number;
  likes: number;
  plays: number;
  visits: number;
  comments: number;
  shares: number;
}

interface LeaderboardUser {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  breakdown: PointBreakdown;
}

function calcPoints(b: PointBreakdown): number {
  return (
    b.posts * 1 +
    b.logins * 5 +
    b.likes * 1 +
    b.plays * 1 +
    b.visits * 3 +
    b.comments * 1 +
    b.shares * 1
  );
}

const ALL_USERS: LeaderboardUser[] = [
  {
    id: "1",
    username: "@dancequeen",
    displayName: "Dance Queen",
    avatarColor: "#FF6B9D",
    breakdown: { posts: 340, logins: 90, likes: 48200, plays: 120000, visits: 8900, comments: 12030, shares: 8920 },
  },
  {
    id: "2",
    username: "@sk8er_pro",
    displayName: "Sk8er Pro",
    avatarColor: "#6BCB77",
    breakdown: { posts: 210, logins: 85, likes: 38900, plays: 98000, visits: 7100, comments: 9400, shares: 6700 },
  },
  {
    id: "3",
    username: "@wanderlust",
    displayName: "Wanderlust",
    avatarColor: "#4D96FF",
    breakdown: { posts: 180, logins: 88, likes: 29500, plays: 87000, visits: 6200, comments: 7800, shares: 5500 },
  },
  {
    id: "4",
    username: "@streetfoodking",
    displayName: "Street Food King",
    avatarColor: "#FF8C42",
    breakdown: { posts: 155, logins: 80, likes: 22100, plays: 71000, visits: 5400, comments: 6200, shares: 4100 },
  },
  {
    id: "5",
    username: "@stylequeen",
    displayName: "Style Queen",
    avatarColor: "#C77DFF",
    breakdown: { posts: 140, logins: 75, likes: 18700, plays: 62000, visits: 4800, comments: 5300, shares: 3900 },
  },
  {
    id: "6",
    username: "@techguru",
    displayName: "Tech Guru",
    avatarColor: "#25F4EE",
    breakdown: { posts: 120, logins: 72, likes: 15400, plays: 55000, visits: 4200, comments: 4700, shares: 3100 },
  },
  {
    id: "7",
    username: "@fitnessmotiv",
    displayName: "Fitness Motiv",
    avatarColor: "#F9C74F",
    breakdown: { posts: 100, logins: 68, likes: 12800, plays: 48000, visits: 3600, comments: 3900, shares: 2800 },
  },
  {
    id: "8",
    username: "@artbylucy",
    displayName: "Art by Lucy",
    avatarColor: "#F94144",
    breakdown: { posts: 90, logins: 60, likes: 10200, plays: 41000, visits: 3100, comments: 3200, shares: 2400 },
  },
  {
    id: "9",
    username: "@musicvibes",
    displayName: "Music Vibes",
    avatarColor: "#90BE6D",
    breakdown: { posts: 75, logins: 55, likes: 8900, plays: 36000, visits: 2700, comments: 2800, shares: 2000 },
  },
  {
    id: "10",
    username: "@coolgamer",
    displayName: "Cool Gamer",
    avatarColor: "#577590",
    breakdown: { posts: 60, logins: 50, likes: 7200, plays: 30000, visits: 2200, comments: 2300, shares: 1700 },
  },
];

type Period = "daily" | "weekly" | "alltime";

const DAILY_FACTOR: Record<string, number> = {
  "1": 0.03,
  "2": 0.028,
  "3": 0.025,
  "4": 0.022,
  "5": 0.019,
  "6": 0.017,
  "7": 0.015,
  "8": 0.012,
  "9": 0.01,
  "10": 0.008,
};

function scaleBreakdown(b: PointBreakdown, factor: number): PointBreakdown {
  return {
    posts: Math.round(b.posts * factor),
    logins: Math.round(b.logins * factor),
    likes: Math.round(b.likes * factor),
    plays: Math.round(b.plays * factor),
    visits: Math.round(b.visits * factor),
    comments: Math.round(b.comments * factor),
    shares: Math.round(b.shares * factor),
  };
}

function formatPoints(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

const MEDALS = ["🥇", "🥈", "🥉"];
const PODIUM_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];

const METRICS: { key: keyof PointBreakdown; label: string; icon: string; pts: number }[] = [
  { key: "posts", label: "Posts Created", icon: "film", pts: 1 },
  { key: "logins", label: "Daily Logins", icon: "log-in", pts: 5 },
  { key: "likes", label: "Likes Received", icon: "heart", pts: 1 },
  { key: "plays", label: "Reels Played", icon: "play", pts: 1 },
  { key: "visits", label: "Profile Visits", icon: "user", pts: 3 },
  { key: "comments", label: "Comments Received", icon: "message-circle", pts: 1 },
  { key: "shares", label: "Posts Shared", icon: "share-2", pts: 1 },
];

export default function LeaderboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("alltime");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const getUsers = (): (LeaderboardUser & { points: number; rank: number })[] => {
    return ALL_USERS.map((u) => {
      let b = u.breakdown;
      if (period === "daily") b = scaleBreakdown(b, DAILY_FACTOR[u.id] ?? 0.01);
      if (period === "weekly") b = scaleBreakdown(b, (DAILY_FACTOR[u.id] ?? 0.01) * 6.5);
      return { ...u, points: calcPoints(b), breakdown: b };
    }).sort((a, b) => b.points - a.points).map((u, i) => ({ ...u, rank: i + 1 }));
  };

  const rankedUsers = getUsers();
  const top3 = rankedUsers.slice(0, 3);
  const rest = rankedUsers.slice(3);

  const myBreakdown: PointBreakdown = {
    posts: 3,
    logins: period === "daily" ? 1 : period === "weekly" ? 5 : 12,
    likes: user?.likes ?? 0,
    plays: 24,
    visits: 7,
    comments: 3,
    shares: 2,
  };
  const myPoints = calcPoints(myBreakdown);
  const myRank = rankedUsers.filter((u) => u.points > myPoints).length + 1 + ALL_USERS.length;

  const podiumOrder = [top3[1], top3[0], top3[2]];

  const handleToggle = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Leaderboard</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
          Earn points and climb the ranks
        </Text>
        {/* Period Tabs */}
        <View style={[styles.periodRow, { backgroundColor: colors.muted }]}>
          {(["daily", "weekly", "alltime"] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodTab, period === p && { backgroundColor: "#FE2C55" }]}
              onPress={() => { Haptics.selectionAsync(); setPeriod(p); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.periodTabText, { color: period === p ? "#fff" : colors.mutedForeground }]}>
                {p === "alltime" ? "All Time" : p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 90 }}
      >
        {/* Points Guide */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.metricsScroll}
          contentContainerStyle={styles.metricsRow}>
          {METRICS.map((m) => (
            <View key={m.key} style={[styles.metricChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name={m.icon as any} size={13} color="#FE2C55" />
              <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{m.label}</Text>
              <Text style={[styles.metricPts, { color: colors.foreground }]}>+{m.pts}pt</Text>
            </View>
          ))}
        </ScrollView>

        {/* Podium */}
        <View style={styles.podium}>
          {podiumOrder.map((u, i) => {
            const actualRank = i === 1 ? 1 : i === 0 ? 2 : 3;
            const height = actualRank === 1 ? 90 : actualRank === 2 ? 70 : 56;
            return (
              <View key={u.id} style={styles.podiumSlot}>
                <Text style={styles.medal}>{MEDALS[actualRank - 1]}</Text>
                <View style={[styles.podiumAvatar, { backgroundColor: u.avatarColor,
                  width: actualRank === 1 ? 60 : 50, height: actualRank === 1 ? 60 : 50,
                  borderRadius: actualRank === 1 ? 30 : 25,
                  borderWidth: actualRank === 1 ? 3 : 2,
                  borderColor: PODIUM_COLORS[actualRank - 1] }]}>
                  <Text style={[styles.podiumAvatarText, { fontSize: actualRank === 1 ? 22 : 18 }]}>
                    {u.displayName[0]}
                  </Text>
                </View>
                <Text style={[styles.podiumName, { color: colors.foreground, fontSize: actualRank === 1 ? 13 : 12 }]}
                  numberOfLines={1}>
                  {u.username}
                </Text>
                <Text style={[styles.podiumPts, { color: "#FE2C55" }]}>{formatPoints(u.points)}</Text>
                <View style={[styles.podiumBar, { height, backgroundColor: PODIUM_COLORS[actualRank - 1],
                  opacity: actualRank === 1 ? 1 : 0.7 }]}>
                  <Text style={styles.podiumRank}>#{actualRank}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* List: 4th onwards */}
        <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {rest.map((u, i) => (
            <View key={u.id}>
              <Pressable
                style={[styles.listRow, { borderBottomColor: expandedId === u.id ? "transparent" : colors.border }]}
                onPress={() => handleToggle(u.id)}
                android_ripple={{ color: colors.muted }}
              >
                <Text style={[styles.listRank, { color: colors.mutedForeground }]}>#{u.rank}</Text>
                <View style={[styles.listAvatar, { backgroundColor: u.avatarColor }]}>
                  <Text style={styles.listAvatarText}>{u.displayName[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.listName, { color: colors.foreground }]}>{u.displayName}</Text>
                  <Text style={[styles.listUsername, { color: colors.mutedForeground }]}>{u.username}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 2 }}>
                  <Text style={[styles.listPts, { color: colors.foreground }]}>{formatPoints(u.points)}</Text>
                  <Text style={[styles.listPtsLabel, { color: colors.mutedForeground }]}>pts</Text>
                </View>
                <Feather
                  name={expandedId === u.id ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={colors.mutedForeground}
                  style={{ marginLeft: 6 }}
                />
              </Pressable>

              {expandedId === u.id && (
                <View style={[styles.breakdown, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.breakdownTitle, { color: colors.mutedForeground }]}>Point Breakdown</Text>
                  <View style={styles.breakdownGrid}>
                    {METRICS.map((m) => (
                      <View key={m.key} style={[styles.breakdownItem, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                        <Feather name={m.icon as any} size={12} color="#FE2C55" />
                        <Text style={[styles.breakdownLabel, { color: colors.mutedForeground }]}>{m.label}</Text>
                        <Text style={[styles.breakdownValue, { color: colors.foreground }]}>
                          {formatPoints(u.breakdown[m.key] * m.pts)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* My Rank — pinned at bottom */}
      <View style={[styles.myRankBar, { backgroundColor: colors.card, borderTopColor: colors.border,
        paddingBottom: bottomPad + 70 }]}>
        <View style={[styles.myRankLeft, { backgroundColor: "rgba(254,44,85,0.12)", borderRadius: 10, padding: 6 }]}>
          <Feather name="award" size={18} color="#FE2C55" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.myRankLabel, { color: colors.mutedForeground }]}>Your rank</Text>
          <Text style={[styles.myRankName, { color: colors.foreground }]}>{user?.username ?? "@you"}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[styles.myRankPts, { color: "#FE2C55" }]}>{formatPoints(myPoints)} pts</Text>
          <Text style={[styles.myRankNum, { color: colors.mutedForeground }]}>#{myRank} overall</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 0,
    gap: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
  },
  periodRow: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 3,
    marginBottom: 4,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: "center",
  },
  periodTabText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  metricsScroll: {
    marginTop: 12,
  },
  metricsRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 4,
  },
  metricChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  metricLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  metricPts: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  podium: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 20,
    gap: 12,
  },
  podiumSlot: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  medal: {
    fontSize: 22,
  },
  podiumAvatar: {
    alignItems: "center",
    justifyContent: "center",
  },
  podiumAvatarText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
  },
  podiumName: {
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    maxWidth: 90,
  },
  podiumPts: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  podiumBar: {
    width: "100%",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  podiumRank: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    paddingTop: 8,
  },
  listCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  listRank: {
    width: 28,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  listAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  listAvatarText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  listName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  listUsername: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  listPts: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  listPtsLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  breakdown: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  breakdownTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.6,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  breakdownGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  breakdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  breakdownLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  breakdownValue: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  myRankBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  myRankLeft: {},
  myRankLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  myRankName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  myRankPts: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  myRankNum: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
