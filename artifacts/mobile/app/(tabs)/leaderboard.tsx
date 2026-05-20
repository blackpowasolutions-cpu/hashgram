import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
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
import { getUserLevel, LEVEL_THRESHOLDS, useStore } from "@/context/StoreContext";
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

// ─── Users — breakdown values scale to 0-15k "all-time" range ─────────────────
// Points are earned via: posts(×1) logins(×5) likes(×1) plays(×1) visits(×3) comments(×1) shares(×1)
const ALL_USERS: LeaderboardUser[] = [
  {
    id: "1",
    username: "@dancequeen",
    displayName: "Dance Queen",
    avatarColor: "#FF6B9D",
    // All-time overridden by StoreContext for logged-in user; breakdown used for daily/weekly stats
    breakdown: { posts: 12, logins: 12, likes: 800, plays: 1440, visits: 65, comments: 42, shares: 20 },
  },
  {
    id: "2",
    username: "@sk8er_pro",
    displayName: "Sk8er Pro",
    avatarColor: "#6BCB77",
    breakdown: { posts: 50, logins: 32, likes: 4300, plays: 7600, visits: 310, comments: 210, shares: 100 },
    // calcPoints ≈ 13,350 → Diamond
  },
  {
    id: "3",
    username: "@wanderlust",
    displayName: "Wanderlust",
    avatarColor: "#4D96FF",
    breakdown: { posts: 42, logins: 28, likes: 3700, plays: 6500, visits: 270, comments: 175, shares: 85 },
    // calcPoints ≈ 11,452 → Platinum
  },
  {
    id: "4",
    username: "@streetfoodking",
    displayName: "Street Food King",
    avatarColor: "#FF8C42",
    breakdown: { posts: 36, logins: 24, likes: 3100, plays: 5500, visits: 230, comments: 145, shares: 72 },
    // calcPoints ≈ 9,663 → Platinum
  },
  {
    id: "5",
    username: "@stylequeen",
    displayName: "Style Queen",
    avatarColor: "#C77DFF",
    breakdown: { posts: 30, logins: 20, likes: 2700, plays: 4700, visits: 195, comments: 120, shares: 60 },
    // calcPoints ≈ 8,295 → Platinum
  },
  {
    id: "6",
    username: "@techguru",
    displayName: "Tech Guru",
    avatarColor: "#25F4EE",
    breakdown: { posts: 25, logins: 18, likes: 2200, plays: 3900, visits: 160, comments: 100, shares: 50 },
    // calcPoints ≈ 6,845 → Gold
  },
  {
    id: "7",
    username: "@fitnessmotiv",
    displayName: "Fitness Motiv",
    avatarColor: "#F9C74F",
    breakdown: { posts: 20, logins: 15, likes: 1800, plays: 3200, visits: 130, comments: 82, shares: 40 },
    // calcPoints ≈ 5,607 → Gold
  },
  {
    id: "8",
    username: "@artbylucy",
    displayName: "Art by Lucy",
    avatarColor: "#F94144",
    breakdown: { posts: 16, logins: 12, likes: 1400, plays: 2400, visits: 95, comments: 60, shares: 30 },
    // calcPoints ≈ 4,251 → Silver
  },
  {
    id: "9",
    username: "@musicvibes",
    displayName: "Music Vibes",
    avatarColor: "#90BE6D",
    breakdown: { posts: 10, logins: 9, likes: 800, plays: 1400, visits: 55, comments: 35, shares: 17 },
    // calcPoints ≈ 2,472 → Silver
  },
  {
    id: "10",
    username: "@coolgamer",
    displayName: "Cool Gamer",
    avatarColor: "#577590",
    breakdown: { posts: 4, logins: 6, likes: 280, plays: 450, visits: 22, comments: 14, shares: 6 },
    // calcPoints ≈ 850 → Bronze
  },
];

type Period = "daily" | "weekly" | "alltime";

const DAILY_FACTOR: Record<string, number> = {
  "1": 0.03, "2": 0.028, "3": 0.025, "4": 0.022, "5": 0.019,
  "6": 0.017, "7": 0.015, "8": 0.012, "9": 0.01, "10": 0.008,
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

// ─── Level Badge ──────────────────────────────────────────────────────────────

function LevelBadge({ points, size = "normal" }: { points: number; size?: "normal" | "small" }) {
  const lv = getUserLevel(points);
  const isSmall = size === "small";
  return (
    <View style={[
      styles.levelBadge,
      { backgroundColor: lv.color + "28", borderColor: lv.color + "99" },
      isSmall && styles.levelBadgeSmall,
    ]}>
      <Text style={[styles.levelBadgeText, { color: lv.color }, isSmall && { fontSize: 9 }]}>
        Lv.{lv.level} {lv.label}
      </Text>
    </View>
  );
}

// ─── Level Guide ──────────────────────────────────────────────────────────────

function LevelGuide({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginTop: 8 }}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 4 }}
    >
      {LEVEL_THRESHOLDS.map((lv) => (
        <View key={lv.level} style={[
          styles.levelGuideChip,
          { backgroundColor: lv.color + "18", borderColor: lv.color + "88" },
        ]}>
          <View style={[styles.levelGuideDot, { backgroundColor: lv.color }]} />
          <Text style={[styles.levelGuideLabel, { color: lv.color }]}>
            Lv.{lv.level} {lv.label}
          </Text>
          <Text style={[styles.levelGuideRange, { color: colors.mutedForeground }]}>
            {lv.next ? `${formatPoints(lv.minPoints)}–${formatPoints(lv.next)}` : `${formatPoints(lv.minPoints)}+`}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const MEDALS = ["🥇", "🥈", "🥉"];
const PODIUM_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];

const METRICS: { key: keyof PointBreakdown; label: string; icon: string; pts: number }[] = [
  { key: "posts",    label: "Posts Created",       icon: "film",           pts: 1 },
  { key: "logins",   label: "Daily Logins",        icon: "log-in",         pts: 5 },
  { key: "likes",    label: "Likes Received",      icon: "heart",          pts: 1 },
  { key: "plays",    label: "Reels Played",        icon: "play",           pts: 1 },
  { key: "visits",   label: "Profile Visits",      icon: "user",           pts: 3 },
  { key: "comments", label: "Comments Received",   icon: "message-circle", pts: 1 },
  { key: "shares",   label: "Posts Shared",        icon: "share-2",        pts: 1 },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LeaderboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { userPoints } = useStore();
  const [period, setPeriod] = useState<Period>("alltime");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  // Build ranked list.
  // For all-time: logged-in user (id "1") always uses live StoreContext points.
  // Daily/weekly use breakdown scaling — for stats purposes only (no level impact).
  const getUsers = (): (LeaderboardUser & { points: number; rank: number })[] => {
    return ALL_USERS.map((u) => {
      let b = u.breakdown;
      if (period === "daily")  b = scaleBreakdown(b, DAILY_FACTOR[u.id] ?? 0.01);
      if (period === "weekly") b = scaleBreakdown(b, (DAILY_FACTOR[u.id] ?? 0.01) * 6.5);
      const pts = (period === "alltime" && u.id === (user?.id ?? "1"))
        ? userPoints
        : calcPoints(b);
      return { ...u, points: pts, breakdown: b };
    })
      .sort((a, b) => b.points - a.points)
      .map((u, i) => ({ ...u, rank: i + 1 }));
  };

  const rankedUsers = getUsers();
  const top3 = rankedUsers.slice(0, 3);
  const rest = rankedUsers.slice(3);
  const podiumOrder = [top3[1], top3[0], top3[2]];

  // My Rank — look up the logged-in user in the ranked list
  const myEntry = rankedUsers.find((u) => u.id === (user?.id ?? "1"));
  const myPoints = myEntry?.points ?? userPoints;
  const myRank = myEntry?.rank ?? rankedUsers.length + 1;
  const myLevel = getUserLevel(period === "alltime" ? userPoints : myPoints);

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
          Earn points, climb ranks, and unlock rewards
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

        {/* Daily/Weekly note */}
        {period !== "alltime" && (
          <View style={[styles.statsBanner, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="bar-chart-2" size={13} color={colors.mutedForeground} />
            <Text style={[styles.statsBannerText, { color: colors.mutedForeground }]}>
              {period === "daily" ? "Daily" : "Weekly"} view is for stats only — levels and store balance use All Time points
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 90 }}
      >
        {/* Level Guide */}
        <LevelGuide colors={colors} />

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
            const barHeight = actualRank === 1 ? 90 : actualRank === 2 ? 70 : 56;
            const avatarSize = actualRank === 1 ? 60 : 50;
            const displayPoints = period === "alltime" && u.id === (user?.id ?? "1") ? userPoints : u.points;
            return (
              <TouchableOpacity
                key={u.id}
                style={styles.podiumSlot}
                onPress={() => router.push({ pathname: "/user/[userId]" as any, params: { userId: u.id } })}
                activeOpacity={0.75}
              >
                <Text style={styles.medal}>{MEDALS[actualRank - 1]}</Text>
                <View style={[styles.podiumAvatar, {
                  backgroundColor: u.avatarColor,
                  width: avatarSize, height: avatarSize,
                  borderRadius: avatarSize / 2,
                  borderWidth: actualRank === 1 ? 3 : 2,
                  borderColor: PODIUM_COLORS[actualRank - 1],
                }]}>
                  <Text style={[styles.podiumAvatarText, { fontSize: actualRank === 1 ? 22 : 18 }]}>
                    {u.displayName[0]}
                  </Text>
                </View>
                <Text style={[styles.podiumName, { color: colors.foreground, fontSize: actualRank === 1 ? 13 : 12 }]}
                  numberOfLines={1}>
                  {u.username}
                </Text>
                <Text style={[styles.podiumPts, { color: "#FE2C55" }]}>{formatPoints(displayPoints)}</Text>
                {period === "alltime" && <LevelBadge points={displayPoints} size="small" />}
                <View style={[styles.podiumBar, { height: barHeight, backgroundColor: PODIUM_COLORS[actualRank - 1],
                  opacity: actualRank === 1 ? 1 : 0.7 }]}>
                  <Text style={styles.podiumRank}>#{actualRank}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* List: 4th onwards */}
        <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {rest.map((u) => {
            const displayPoints = period === "alltime" && u.id === (user?.id ?? "1") ? userPoints : u.points;
            return (
              <View key={u.id}>
                <Pressable
                  style={[styles.listRow, { borderBottomColor: expandedId === u.id ? "transparent" : colors.border }]}
                  onPress={() => handleToggle(u.id)}
                  android_ripple={{ color: colors.muted }}
                >
                  <Text style={[styles.listRank, { color: colors.mutedForeground }]}>#{u.rank}</Text>
                  <TouchableOpacity
                    onPress={() => router.push({ pathname: "/user/[userId]" as any, params: { userId: u.id } })}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.listAvatar, { backgroundColor: u.avatarColor }]}>
                      <Text style={styles.listAvatarText}>{u.displayName[0]}</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => router.push({ pathname: "/user/[userId]" as any, params: { userId: u.id } })}
                    activeOpacity={0.8}
                    style={{ flex: 1 }}
                  >
                    <Text style={[styles.listName, { color: colors.foreground }]}>{u.displayName}</Text>
                    {period === "alltime"
                      ? <LevelBadge points={displayPoints} size="small" />
                      : <Text style={[styles.listUsername, { color: colors.mutedForeground }]}>{u.username}</Text>
                    }
                  </TouchableOpacity>
                  <View style={{ alignItems: "flex-end", gap: 2 }}>
                    <Text style={[styles.listPts, { color: colors.foreground }]}>{formatPoints(displayPoints)}</Text>
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
            );
          })}
        </View>
      </ScrollView>

      {/* My Rank — pinned at bottom, always shows all-time level */}
      <View style={[styles.myRankBar, {
        backgroundColor: colors.card,
        borderTopColor: colors.border,
        paddingBottom: bottomPad + 70,
      }]}>
        <View style={[styles.myRankLeft, { backgroundColor: myLevel.color + "22", borderRadius: 10, padding: 6 }]}>
          <Feather name="award" size={18} color={myLevel.color} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.myRankLabel, { color: colors.mutedForeground }]}>Your rank</Text>
          <Text style={[styles.myRankName, { color: colors.foreground }]}>{user?.username ?? "@you"}</Text>
          <LevelBadge points={userPoints} size="small" />
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[styles.myRankPts, { color: "#FE2C55" }]}>{formatPoints(userPoints)} pts</Text>
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
    marginBottom: 10,
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
  statsBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  statsBannerText: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
  // Level guide
  levelGuideChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  levelGuideDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  levelGuideLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  levelGuideRange: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  // Level badge
  levelBadge: {
    alignSelf: "flex-start",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  levelBadgeSmall: {
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  levelBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
  metricsScroll: {
    marginTop: 8,
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
    paddingVertical: 10,
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
    marginBottom: 2,
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
