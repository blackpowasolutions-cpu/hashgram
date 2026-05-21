import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  ImageSourcePropType,
  Modal,
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
import {
  APP_USERS,
  CONTACT_ID_MAP,
  USER_FEED_POSTS,
  useSocial,
  type AppUser,
} from "@/context/SocialContext";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");
const GAP = 1.5;
const THUMB_SIZE = (width - GAP * 2) / 3;

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

// Still used for post image previews
const REEL_IMAGES: Record<string, ImageSourcePropType> = {
  reel1: require("../../assets/images/reel1.png"),
  reel2: require("../../assets/images/reel2.png"),
  reel3: require("../../assets/images/reel3.png"),
  reel4: require("../../assets/images/reel4.png"),
  reel5: require("../../assets/images/reel5.png"),
};

interface ApiReel {
  id: string;
  thumbnailUrl?: string;
  views: number;
  description?: string;
}

function formatCount(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

// ─── Followers / Following Modal ─────────────────────────────────────────────

function UserListModal({
  visible,
  onClose,
  title,
  users,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  users: AppUser[];
  colors: ReturnType<typeof useColors>;
}) {
  const { isFollowing, toggleFollow } = useSocial();
  const { user: authUser } = useAuth();
  const insets = useSafeAreaInsets();

  const handleAvatarPress = (userId: string) => {
    onClose();
    setTimeout(() => {
      router.push({ pathname: "/user/[userId]" as any, params: { userId } });
    }, 300);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20 }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={users}
            keyExtractor={(u) => u.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: u }) => {
              const isSelf = u.id === authUser?.id;
              const following = isFollowing(u.id);
              return (
                <View style={[styles.userRow, { borderBottomColor: colors.border }]}>
                  <TouchableOpacity
                    onPress={() => handleAvatarPress(u.id)}
                    activeOpacity={0.8}
                    style={styles.userRowLeft}
                  >
                    <View style={[styles.userRowAvatar, { backgroundColor: u.avatarColor }]}>
                      <Text style={styles.userRowAvatarText}>{u.displayName[0]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.userRowName, { color: colors.foreground }]} numberOfLines={1}>
                        {u.displayName}
                      </Text>
                      <Text style={[styles.userRowUsername, { color: colors.mutedForeground }]} numberOfLines={1}>
                        {u.username}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  {!isSelf && (
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        toggleFollow(u.id);
                      }}
                      activeOpacity={0.75}
                      style={[
                        styles.followBtn,
                        following
                          ? { backgroundColor: "transparent", borderColor: colors.border, borderWidth: 1 }
                          : { backgroundColor: "#FE2C55" },
                      ]}
                    >
                      <Text style={[styles.followBtnText, { color: following ? colors.foreground : "#fff" }]}>
                        {following ? "Following" : "Follow"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user: authUser, token } = useAuth();
  const { isFollowing, toggleFollow, getUser, getUserFollowers, getUserFollowing } = useSocial();

  const [activeTab, setActiveTab] = useState<"reels" | "posts">("reels");
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [apiReels, setApiReels] = useState<ApiReel[]>([]);
  const [reelsLoading, setReelsLoading] = useState(true);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const profileUser = getUser(userId ?? "");
  const isOwnProfile = authUser?.id === userId;
  const following = isFollowing(userId ?? "");

  const feedPosts = USER_FEED_POSTS[userId ?? ""] ?? [];
  const followersList = getUserFollowers(userId ?? "");
  const followingList = getUserFollowing(userId ?? "");

  const fetchReels = useCallback(async () => {
    if (!userId) return;
    setReelsLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/reels?userId=${userId}&limit=50`, { headers });
      if (res.ok) {
        const data = await res.json();
        setApiReels(
          (data.items ?? []).map((r: any): ApiReel => ({
            id: String(r.id),
            thumbnailUrl: r.thumbnailUrl ?? undefined,
            views: r.views ?? 0,
            description: r.description ?? "",
          }))
        );
      }
    } catch {}
    setReelsLoading(false);
  }, [userId, token]);

  useEffect(() => {
    fetchReels();
  }, [fetchReels]);

  if (!profileUser) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <Feather name="user-x" size={48} color={colors.mutedForeground} />
        <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>User not found</Text>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
          <Text style={{ color: "#FE2C55", fontFamily: "Inter_600SemiBold", fontSize: 15 }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backButton}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerUsername, { color: colors.foreground }]} numberOfLines={1}>
          {profileUser.username}
        </Text>
        <TouchableOpacity activeOpacity={0.7} style={styles.backButton}>
          <Feather name="more-vertical" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 80 }}
      >
        {/* Avatar + Stats */}
        <View style={styles.profileSection}>
          <View style={[styles.avatar, { backgroundColor: profileUser.avatarColor }]}>
            <Text style={styles.avatarText}>{profileUser.displayName[0]}</Text>
          </View>
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.stat} activeOpacity={0.7}>
              <Text style={[styles.statNum, { color: colors.foreground }]}>
                {formatCount(apiReels.length + feedPosts.length)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Posts</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.stat}
              activeOpacity={0.7}
              onPress={() => setShowFollowers(true)}
            >
              <Text style={[styles.statNum, { color: colors.foreground }]}>
                {formatCount(profileUser.followers + (following ? 1 : 0))}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.stat}
              activeOpacity={0.7}
              onPress={() => setShowFollowing(true)}
            >
              <Text style={[styles.statNum, { color: colors.foreground }]}>
                {formatCount(profileUser.following)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Following</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Name + Bio */}
        <View style={styles.bioSection}>
          <Text style={[styles.displayName, { color: colors.foreground }]}>{profileUser.displayName}</Text>
          <Text style={[styles.bio, { color: colors.mutedForeground }]}>{profileUser.bio}</Text>
          {profileUser.website ? (
            <View style={styles.websiteRow}>
              <Feather name="link" size={12} color="#FE2C55" />
              <Text style={styles.websiteText}>{profileUser.website}</Text>
            </View>
          ) : null}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          {isOwnProfile ? (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: colors.border }]}
                activeOpacity={0.75}
                onPress={() => router.push("/(tabs)/profile" as any)}
              >
                <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Edit Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: colors.border }]}
                activeOpacity={0.75}
              >
                <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Share Profile</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  following
                    ? { borderColor: colors.border }
                    : { backgroundColor: "#FE2C55", borderColor: "#FE2C55" },
                ]}
                activeOpacity={0.75}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  toggleFollow(userId ?? "");
                }}
              >
                <Text style={[styles.actionBtnText, { color: following ? colors.foreground : "#fff" }]}>
                  {following ? "Following" : "Follow"}
                </Text>
              </TouchableOpacity>
              {profileUser.contactId ? (
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: colors.border }]}
                  activeOpacity={0.75}
                  onPress={() =>
                    router.push({
                      pathname: "/chat/[userId]" as any,
                      params: { userId: profileUser.contactId },
                    })
                  }
                >
                  <Feather name="message-circle" size={15} color={colors.foreground} style={{ marginRight: 4 }} />
                  <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Message</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[styles.addBtn, { borderColor: colors.border }]}
                activeOpacity={0.75}
              >
                <Feather name="user-plus" size={16} color={colors.foreground} />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Tabs */}
        <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === "reels" && styles.tabItemActive]}
            onPress={() => setActiveTab("reels")}
            activeOpacity={0.7}
          >
            <Feather
              name="grid"
              size={21}
              color={activeTab === "reels" ? colors.foreground : colors.mutedForeground}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === "posts" && styles.tabItemActive]}
            onPress={() => setActiveTab("posts")}
            activeOpacity={0.7}
          >
            <Feather
              name="align-left"
              size={21}
              color={activeTab === "posts" ? colors.foreground : colors.mutedForeground}
            />
          </TouchableOpacity>
        </View>

        {/* Reels Grid */}
        {activeTab === "reels" && (
          <>
            {reelsLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator color="#FE2C55" />
              </View>
            ) : apiReels.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="video" size={40} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No reels yet</Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {apiReels.map((reel) => (
                  <View key={reel.id} style={styles.thumb}>
                    {reel.thumbnailUrl ? (
                      <Image
                        source={{ uri: reel.thumbnailUrl }}
                        style={styles.thumbImg}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.thumbImg, { backgroundColor: "#1a1a1a", alignItems: "center", justifyContent: "center" }]}>
                        <Feather name="video" size={22} color="rgba(255,255,255,0.2)" />
                      </View>
                    )}
                    <View style={styles.thumbDark} />
                    <View style={styles.thumbBottom}>
                      <Feather name="play" size={10} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.thumbViews}>{formatCount(reel.views)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* Posts Tab */}
        {activeTab === "posts" && (
          <View style={{ paddingHorizontal: 0 }}>
            {feedPosts.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="file-text" size={40} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No posts yet</Text>
              </View>
            ) : (
              feedPosts.map((post) => (
                <View
                  key={post.id}
                  style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={styles.postHeader}>
                    <View style={[styles.postAvatar, { backgroundColor: profileUser.avatarColor }]}>
                      <Text style={styles.postAvatarText}>{profileUser.displayName[0]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.postName, { color: colors.foreground }]}>
                        {profileUser.displayName}
                      </Text>
                      <Text style={[styles.postTime, { color: colors.mutedForeground }]}>
                        {post.createdAt}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.postContent, { color: colors.foreground }]}>{post.content}</Text>
                  {post.imageKey ? (
                    <Image
                      source={REEL_IMAGES[post.imageKey] ?? REEL_IMAGES.reel1}
                      style={styles.postImage}
                      resizeMode="cover"
                    />
                  ) : null}
                  <View style={[styles.postStats, { borderTopColor: colors.border }]}>
                    <View style={styles.postStat}>
                      <Feather name="thumbs-up" size={14} color={colors.mutedForeground} />
                      <Text style={[styles.postStatText, { color: colors.mutedForeground }]}>
                        {formatCount(post.likes)}
                      </Text>
                    </View>
                    <View style={styles.postStat}>
                      <Feather name="message-square" size={14} color={colors.mutedForeground} />
                      <Text style={[styles.postStatText, { color: colors.mutedForeground }]}>
                        {formatCount(post.comments)}
                      </Text>
                    </View>
                    <View style={styles.postStat}>
                      <Feather name="share" size={14} color={colors.mutedForeground} />
                      <Text style={[styles.postStatText, { color: colors.mutedForeground }]}>
                        {formatCount(post.shares)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Followers Modal */}
      <UserListModal
        visible={showFollowers}
        onClose={() => setShowFollowers(false)}
        title={`Followers · ${formatCount(profileUser.followers + (following ? 1 : 0))}`}
        users={followersList}
        colors={colors}
      />

      {/* Following Modal */}
      <UserListModal
        visible={showFollowing}
        onClose={() => setShowFollowing(false)}
        title={`Following · ${formatCount(profileUser.following)}`}
        users={followingList}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerUsername: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
    textAlign: "center",
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 20,
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
  websiteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  websiteText: {
    color: "#FE2C55",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  actionRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
  },
  actionBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
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
  tabItemActive: { borderBottomColor: "#FE2C55" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE * 1.35,
    backgroundColor: "#111",
    position: "relative",
    overflow: "hidden",
  },
  thumbImg: { width: "100%", height: "100%" },
  thumbDark: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)",
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
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  postCard: {
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    paddingBottom: 8,
  },
  postAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  postAvatarText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  postName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  postTime: { fontSize: 12, fontFamily: "Inter_400Regular" },
  postContent: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  postImage: {
    width: "100%",
    height: 200,
  },
  postStats: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 16,
  },
  postStat: { flexDirection: "row", alignItems: "center", gap: 5 },
  postStatText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  notFoundText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    marginTop: 12,
  },
  backBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    minHeight: 300,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userRowLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  userRowAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  userRowAvatarText: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" },
  userRowName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  userRowUsername: { fontSize: 12, fontFamily: "Inter_400Regular" },
  followBtn: {
    height: 32,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  followBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
