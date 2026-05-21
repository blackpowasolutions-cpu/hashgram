import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  RefreshControl,
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

type Period = "daily" | "weekly" | "alltime";

interface ApiLeaderboardEntry {
  rank: number;
  userId: number;
  user: { id: number; username: string; displayName: string; avatarUrl: string | null };
  points: number;
  level: number;
}

interface RankedUser {
  id: string;
  rank: number;
  username: string;
  displayName: string;
  avatarColor: string;
  points: number;
}

const AVATAR_COLORS = [
  "#FF6B9D", "#6BCB77", "#4D96FF", "#FF8C42", "#C77DFF",
  "#25F4EE", "#F9C74F", "#F94144", "#90BE6D", "#577590",
];

const API_BASE_LB = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

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

const METRICS: { key: string; label: string; icon: string; pts: number }[] = [
  { key: "posts",    label: "Posts Created",       icon: "film",           pts: 1 },
  { key: "logins",   label: "Daily Logins",        icon: "log-in",         pts: 5 },
  { key: "likes",    label: "Likes Received",      icon: "heart",          pts: 1 },
  { key: "plays",    label: "Reels Played",        icon: "play",           pts: 1 },
  { key: "visits",   label: "Profile Visits",      icon: "user",           pts: 3 },
  { key: "comments", label: "Comments Received",   icon: "message-circle", pts: 1 },
  { key: "shares",   label: "Posts Shared",        icon: "share-2",        pts: 1 },
];

const REASON_META: Record<string, { label: string; icon: string; color: string }> = {
  login:          { label: "Daily Login",         icon: "log-in",         color: "#F9C74F" },
  reel_play:      { label: "Reels Played",        icon: "play",           color: "#4D96FF" },
  reel_like:      { label: "Likes Received",      icon: "heart",          color: "#FE2C55" },
  post_reaction:  { label: "Reactions Received",  icon: "smile",          color: "#C77DFF" },
  reel_upload:    { label: "Reels Uploaded",      icon: "video",          color: "#6BCB77" },
  profile_visit:  { label: "Profile Visits",      icon: "user",           color: "#25F4EE" },
  post_share:     { label: "Posts Shared",        icon: "share-2",        color: "#FF8C42" },
  gift_purchase:  { label: "Gift Purchased",      icon: "gift",           color: "#90BE6D" },
};

interface BreakdownRow { reason: string; total: number; count: number; }

interface ApiBreakdownRow { reason: string; total: number; count: number; }

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LeaderboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const { userPoints } = useStore();
  const [period, setPeriod] = useState<Period>("alltime");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lbEntries, setLbEntries] = useState<ApiLeaderboardEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [myRankExpanded, setMyRankExpanded] = useState(false);
  const [breakdown, setBreakdown] = useState<BreakdownRow[]>([]);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const fetchLeaderboard = useCallback(async (p: Period) => {
    setRefreshing(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${API_BASE_LB}/leaderboard?period=${p}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setLbEntries(Array.isArray(data) ? data : []);
      }
    } catch {}
    setRefreshing(false);
  }, [token]);

  const fetchBreakdown = useCallback(async () => {
    if (!token) return;
    setBreakdownLoading(true);
    try {
      const res = await fetch(`${API_BASE_LB}/me/points-breakdown`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: ApiBreakdownRow[] = await res.json();
        setBreakdown(Array.isArray(data) ? data : []);
      }
    } catch {}
    setBreakdownLoading(false);
  }, [token]);

  const toggleMyRank = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = !myRankExpanded;
    setMyRankExpanded(next);
    if (next && breakdown.length === 0) fetchBreakdown();
    Animated.spring(expandAnim, {
      toValue: next ? 1 : 0,
      useNativeDriver: false,
      tension: 80,
      friction: 12,
    }).start();
  }, [myRankExpanded, breakdown.length, fetchBreakdown, expandAnim]);

  useEffect(() => {
    fetchLeaderboard(period);
  }, [period, fetchLeaderboard]);

  const rankedUsers: RankedUser[] = lbEntries.map((e, i) => ({
    id: String(e.userId),
    rank: e.rank,
    username: e.user?.username ?? "",
    displayName: e.user?.displayName ?? "",
    avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
    points: String(e.userId) === user?.id ? userPoints : e.points,
  }));

  const top3 = rankedUsers.slice(0, 3);
  const rest = rankedUsers.slice(3);
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean) as RankedUser[];

  const myEntry = rankedUsers.find((u) => u.id === user?.id);
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchLeaderboard(period)}
            colors={["#FE2C55"]}
          />
        }
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
                    <Text style={[styles.breakdownTitle, { color: colors.mutedForeground }]}>Point Summary</Text>
                    <View style={styles.breakdownGrid}>
                      <View style={[styles.breakdownItem, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                        <Feather name="award" size={12} color="#FE2C55" />
                        <Text style={[styles.breakdownLabel, { color: colors.mutedForeground }]}>Total Points</Text>
                        <Text style={[styles.breakdownValue, { color: colors.foreground }]}>
                          {formatPoints(u.points)}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* My Rank — pinned at bottom */}
      <View style={[styles.myRankWrap, {
        backgroundColor: colors.card,
        borderTopColor: colors.border,
        paddingBottom: bottomPad + 70,
      }]}>
        {/* Expandable breakdown panel */}
        {myRankExpanded && (
          <View style={[styles.breakdownPanel, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
            <Text style={[styles.breakdownPanelTitle, { color: colors.mutedForeground }]}>Points Breakdown</Text>
            {breakdownLoading ? (
              <View style={{ paddingVertical: 12, alignItems: "center" }}>
                <Text style={[{ fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Loading…</Text>
              </View>
            ) : breakdown.length === 0 ? (
              <Text style={[styles.breakdownEmpty, { color: colors.mutedForeground }]}>No points earned yet — watch reels, log in daily, and get likes!</Text>
            ) : (
              breakdown.map((row) => {
                const meta = REASON_META[row.reason] ?? { label: row.reason, icon: "star", color: "#aaa" };
                return (
                  <View key={row.reason} style={[styles.breakdownRow, { borderBottomColor: colors.border }]}>
                    <View style={[styles.breakdownIcon, { backgroundColor: meta.color + "22" }]}>
                      <Feather name={meta.icon as any} size={13} color={meta.color} />
                    </View>
                    <Text style={[styles.breakdownRowLabel, { color: colors.foreground }]}>{meta.label}</Text>
                    <Text style={[styles.breakdownRowCount, { color: colors.mutedForeground }]}>×{row.count}</Text>
                    <Text style={[styles.breakdownRowPts, { color: "#FE2C55" }]}>+{formatPoints(row.total)} pts</Text>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Compact bar */}
        <Pressable style={styles.myRankBar} onPress={toggleMyRank} android_ripple={{ color: colors.muted }}>
          <View style={[styles.myRankAvatar, { backgroundColor: myLevel.color + "22" }]}>
            <Feather name="award" size={15} color={myLevel.color} />
          </View>
          <Text style={[styles.myRankName, { color: colors.foreground }]}>{user?.username ?? "@you"}</Text>
          <LevelBadge points={userPoints} size="small" />
          <View style={{ flex: 1 }} />
          <Text style={[styles.myRankNum, { color: colors.mutedForeground }]}>#{myRank}</Text>
          <Text style={[styles.myRankPts, { color: "#FE2C55" }]}>{formatPoints(userPoints)} pts</Text>
          <Feather
            name={myRankExpanded ? "chevron-down" : "chevron-up"}
            size={15}
            color={colors.mutedForeground}
          />
        </Pressable>
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
  myRankWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
  },
  myRankBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 8,
  },
  myRankAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  myRankName: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  myRankPts: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  myRankNum: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginRight: 4,
  },
  breakdownPanel: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },
  breakdownPanelTitle: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  breakdownIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  breakdownRowLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  breakdownRowCount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    minWidth: 28,
    textAlign: "right",
  },
  breakdownRowPts: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    minWidth: 56,
    textAlign: "right",
  },
  breakdownEmpty: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    paddingBottom: 8,
  },
});
