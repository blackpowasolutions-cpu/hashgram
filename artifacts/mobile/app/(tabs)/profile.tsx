import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
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
const THUMB_SIZE = (width - 3) / 3;

const GRID_ITEMS = [
  { id: "1", image: require("../../assets/images/reel1.png"), likes: "482K", views: "2.1M" },
  { id: "2", image: require("../../assets/images/reel2.png"), likes: "271K", views: "980K" },
  { id: "3", image: require("../../assets/images/reel3.png"), likes: "893K", views: "4.2M" },
  { id: "4", image: require("../../assets/images/reel4.png"), likes: "1.2M", views: "8.9M" },
  { id: "5", image: require("../../assets/images/reel5.png"), likes: "567K", views: "3.4M" },
  { id: "6", image: require("../../assets/images/reel1.png"), likes: "320K", views: "1.5M" },
];

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
  const [following, setFollowing] = useState(false);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const avatarColor = "#FE2C55";

  const handleFollow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFollowing((v) => !v);
  };

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
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
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

        {/* Grid */}
        <View style={styles.grid}>
          {GRID_ITEMS.map((item) => (
            <Pressable key={item.id} style={styles.thumb} android_ripple={{ color: "#333" }}>
              <Image source={item.image} style={styles.thumbImg} resizeMode="cover" />
              <View style={styles.thumbOverlay}>
                <Feather name="play" size={12} color="#fff" />
                <Text style={styles.thumbViews}>{item.views}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  stat: {
    alignItems: "center",
    gap: 2,
  },
  statNum: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  bioSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 4,
  },
  displayName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  bio: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
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
  editBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
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
  tabItemActive: {
    borderBottomColor: "#fff",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 1.5,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE * 1.4,
    backgroundColor: "#111",
  },
  thumbImg: {
    width: "100%",
    height: "100%",
  },
  thumbOverlay: {
    position: "absolute",
    bottom: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  thumbViews: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
