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
import { Circle, Svg } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ScratchCard, { GiftCardPrize, PRIZES } from "@/components/ScratchCard";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");
const GAP = 1.5;
const THUMB_SIZE = (width - GAP * 2) / 3;

const PLAY_MILESTONE = 100;

interface ReelGridItem {
  id: string;
  title: string;
  plays: number;
  scratchUsed: boolean;
  prize: GiftCardPrize;
}

const INITIAL_REELS: ReelGridItem[] = [
  { id: "1", title: "Dance Drop", plays: 67, scratchUsed: false, prize: PRIZES[0] },
  { id: "2", title: "Street Food", plays: 45, scratchUsed: false, prize: PRIZES[1] },
  { id: "3", title: "Sk8 Trick", plays: 100, scratchUsed: false, prize: PRIZES[2] },
  { id: "4", title: "Mountain View", plays: 23, scratchUsed: false, prize: PRIZES[3] },
  { id: "5", title: "GRWM", plays: 89, scratchUsed: false, prize: PRIZES[4] },
  { id: "6", title: "Night Vlog", plays: 12, scratchUsed: false, prize: PRIZES[5] },
];

// Thumbnail images matched by id
const THUMB_IMAGES: Record<string, ReturnType<typeof require>> = {
  "1": require("../../assets/images/reel1.png"),
  "2": require("../../assets/images/reel2.png"),
  "3": require("../../assets/images/reel3.png"),
  "4": require("../../assets/images/reel4.png"),
  "5": require("../../assets/images/reel5.png"),
  "6": require("../../assets/images/reel1.png"),
};

import { Image } from "react-native";

// Circular SVG progress ring
function PlayRing({
  plays,
  milestone,
  size = 36,
}: {
  plays: number;
  milestone: number;
  size?: number;
}) {
  const progress = Math.min(plays / milestone, 1);
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = circumference * progress;
  const isComplete = progress >= 1;

  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
      {/* Track */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="rgba(0,0,0,0.55)"
        strokeWidth={3}
        fill="transparent"
      />
      {/* Progress arc */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={isComplete ? "#FFD700" : "#FE2C55"}
        strokeWidth={3}
        fill="transparent"
        strokeDasharray={`${strokeDash} ${circumference}`}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function TilePlayIndicator({
  reel,
  onTap,
}: {
  reel: ReelGridItem;
  onTap: () => void;
}) {
  const isComplete = reel.plays >= PLAY_MILESTONE;
  const isUsed = reel.scratchUsed;

  if (isUsed) return null;

  return (
    <Pressable onPress={isComplete ? onTap : undefined} style={styles.ringWrap}>
      <PlayRing plays={reel.plays} milestone={PLAY_MILESTONE} size={36} />
      {isComplete ? (
        <View style={styles.ringCenter}>
          <Text style={{ fontSize: 13 }}>🎁</Text>
        </View>
      ) : (
        <View style={styles.ringCenter}>
          <Text style={styles.ringCount}>{reel.plays}</Text>
        </View>
      )}
    </Pressable>
  );
}

function formatCount(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<"posts" | "liked">("posts");
  const [reels, setReels] = useState<ReelGridItem[]>(INITIAL_REELS);
  const [scratchTarget, setScratchTarget] = useState<ReelGridItem | null>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const handleTilePress = (reel: ReelGridItem) => {
    if (reel.plays >= PLAY_MILESTONE && !reel.scratchUsed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setScratchTarget(reel);
    } else {
      // Simulate a play being added each tap (for demo)
      setReels((prev) =>
        prev.map((r) =>
          r.id === reel.id
            ? { ...r, plays: Math.min(r.plays + 1, PLAY_MILESTONE) }
            : r
        )
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleScratchClose = () => {
    if (scratchTarget) {
      setReels((prev) =>
        prev.map((r) =>
          r.id === scratchTarget.id ? { ...r, scratchUsed: true } : r
        )
      );
    }
    setScratchTarget(null);
  };

  const completedCount = reels.filter((r) => r.plays >= PLAY_MILESTONE && !r.scratchUsed).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 80 }}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: topPad + 8 }]}>
          <TouchableOpacity activeOpacity={0.7}>
            <Feather name="user-plus" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {user?.username ?? "@profile"}
          </Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Feather name="more-vertical" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Avatar + Stats */}
        <View style={styles.profileSection}>
          <View style={[styles.avatar, { backgroundColor: "#FE2C55" }]}>
            <Text style={styles.avatarText}>
              {(user?.displayName ?? "U")[0].toUpperCase()}
            </Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: colors.foreground }]}>
                {formatCount(user?.following ?? 0)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Following</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: colors.foreground }]}>
                {formatCount(user?.followers ?? 0)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Followers</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: colors.foreground }]}>
                {formatCount(user?.likes ?? 0)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Likes</Text>
            </View>
          </View>
        </View>

        {/* Name + Bio */}
        <View style={styles.bioSection}>
          <Text style={[styles.displayName, { color: colors.foreground }]}>
            {user?.displayName ?? "Your Name"}
          </Text>
          <Text style={[styles.bio, { color: colors.mutedForeground }]}>
            {user?.bio ?? "Creating awesome content every day 🎬"}
          </Text>
        </View>

        {/* Scratch cards banner */}
        {completedCount > 0 && (
          <Pressable
            style={[styles.scratchBanner, { backgroundColor: "rgba(255,215,0,0.08)", borderColor: "#FFD700" }]}
            onPress={() => {
              const ready = reels.find((r) => r.plays >= PLAY_MILESTONE && !r.scratchUsed);
              if (ready) setScratchTarget(ready);
            }}
          >
            <Text style={styles.scratchBannerEmoji}>🎁</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.scratchBannerTitle}>
                {completedCount} Scratch Card{completedCount > 1 ? "s" : ""} Ready!
              </Text>
              <Text style={styles.scratchBannerSub}>
                Tap a glowing tile or here to reveal your prize
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color="#FFD700" />
          </Pressable>
        )}

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.editBtn, { borderColor: colors.border }]}
            activeOpacity={0.75}
          >
            <Text style={[styles.editBtnText, { color: colors.foreground }]}>Edit profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.editBtn, { borderColor: colors.border }]}
            activeOpacity={0.75}
          >
            <Text style={[styles.editBtnText, { color: colors.foreground }]}>Share profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addBtn, { borderColor: colors.border }]}
            activeOpacity={0.75}
          >
            <Feather name="user-plus" size={16} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === "posts" && styles.tabItemActive]}
            onPress={() => setActiveTab("posts")}
            activeOpacity={0.7}
          >
            <Feather name="grid" size={22} color={activeTab === "posts" ? colors.foreground : colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === "liked" && styles.tabItemActive]}
            onPress={() => setActiveTab("liked")}
            activeOpacity={0.7}
          >
            <Feather name="heart" size={22} color={activeTab === "liked" ? colors.foreground : colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Grid legend */}
        <View style={[styles.legend, { backgroundColor: colors.muted }]}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#FE2C55" }]} />
            <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Play progress</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#FFD700" }]} />
            <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Scratch card ready</Text>
          </View>
          <View style={styles.legendItem}>
            <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Tap tile to add plays</Text>
          </View>
        </View>

        {/* Grid */}
        <View style={styles.grid}>
          {reels.map((reel) => {
            const isComplete = reel.plays >= PLAY_MILESTONE;
            const isUsed = reel.scratchUsed;
            return (
              <Pressable
                key={reel.id}
                style={[
                  styles.thumb,
                  isComplete && !isUsed && styles.thumbGlow,
                ]}
                onPress={() => handleTilePress(reel)}
                android_ripple={{ color: "#333" }}
              >
                <Image
                  source={THUMB_IMAGES[reel.id]}
                  style={styles.thumbImg}
                  resizeMode="cover"
                />

                {/* Dark overlay */}
                <View style={styles.thumbDark} />

                {/* Play count ring — bottom-left */}
                <TilePlayIndicator reel={reel} onTap={() => setScratchTarget(reel)} />

                {/* Play count label */}
                <View style={styles.thumbBottom}>
                  <Feather name="play" size={10} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.thumbViews}>
                    {reel.plays >= PLAY_MILESTONE ? "100" : reel.plays}
                    <Text style={styles.thumbMilestone}>/100</Text>
                  </Text>
                </View>

                {/* Used stamp */}
                {isUsed && (
                  <View style={styles.usedBadge}>
                    <Text style={styles.usedText}>✓ Claimed</Text>
                  </View>
                )}

                {/* Glow border for ready tiles */}
                {isComplete && !isUsed && (
                  <View style={[styles.glowBorder, { pointerEvents: "none" }]} />
                )}
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.tapHint, { color: colors.mutedForeground }]}>
          Tap any tile to simulate a reel play. At 100 plays, a scratch card unlocks!
        </Text>
      </ScrollView>

      {/* Scratch Card Modal */}
      {scratchTarget && (
        <ScratchCard
          visible={!!scratchTarget}
          prize={scratchTarget.prize}
          reelTitle={scratchTarget.title}
          onClose={handleScratchClose}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 24,
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 34,
    fontFamily: "Inter_700Bold",
  },
  statsRow: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  stat: { alignItems: "center", gap: 2 },
  statNum: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  bioSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 4,
  },
  displayName: { fontSize: 16, fontFamily: "Inter_700Bold" },
  bio: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  scratchBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  scratchBannerEmoji: { fontSize: 24 },
  scratchBannerTitle: {
    color: "#FFD700",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  scratchBannerSub: {
    color: "rgba(255,215,0,0.6)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  actionRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 8,
  },
  editBtn: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  editBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabRow: {
    flexDirection: "row",
    marginTop: 16,
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabItemActive: { borderBottomColor: "#fff" },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginHorizontal: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE * 1.4,
    backgroundColor: "#111",
    position: "relative",
    overflow: "hidden",
  },
  thumbGlow: {
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  thumbImg: {
    width: "100%",
    height: "100%",
  },
  thumbDark: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  ringWrap: {
    position: "absolute",
    top: 5,
    left: 5,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  ringCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  ringCount: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    textShadow: "0 1px 2px rgba(0,0,0,0.8)",
  },
  thumbBottom: {
    position: "absolute",
    bottom: 5,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  thumbViews: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    textShadow: "0 1px 3px rgba(0,0,0,0.9)",
  },
  thumbMilestone: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 9,
    fontFamily: "Inter_400Regular",
  },
  usedBadge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  usedText: {
    color: "#6BCB77",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  glowBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: "#FFD700",
    borderRadius: 0,
  },
  tapHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },
});
