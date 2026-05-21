import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  ImageSourcePropType,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Circle, Svg } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ScratchCard, { GiftCardPrize, PRIZES } from "@/components/ScratchCard";
import { useAuth } from "@/context/AuthContext";
import {
  useSocial,
  type AppUser,
} from "@/context/SocialContext";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";
const GAP = 1.5;
const THUMB_SIZE = (width - GAP * 2) / 3;
const PLAY_MILESTONE = 100;

const REEL_IMAGES: Record<string, ImageSourcePropType> = {
  reel1: require("../../assets/images/reel1.png"),
  reel2: require("../../assets/images/reel2.png"),
  reel3: require("../../assets/images/reel3.png"),
  reel4: require("../../assets/images/reel4.png"),
  reel5: require("../../assets/images/reel5.png"),
};

// Own posts that match the "me" posts in the newsfeed
const OWN_POSTS = [
  {
    id: "own_1",
    content: "Just posted my first reel! 🎉 So excited to share this journey with everyone. Drop a ❤️ if you're rooting for me!",
    imageKey: "reel4" as string,
    createdAt: "45 min ago",
    likes: 67,
    comments: 14,
    shares: 6,
  },
  {
    id: "own_2",
    content: "Can't believe this blew up! 🙌 Thank you for 100 likes on my last post. This community is absolutely everything 💕",
    imageKey: undefined as string | undefined,
    createdAt: "1 day ago",
    likes: 100,
    comments: 45,
    shares: 22,
  },
];

// ─── Scratch Card Types ───────────────────────────────────────────────────────

interface ReelGridItem {
  id: string;
  title: string;
  plays: number;
  scratchUsed: boolean;
  prize: GiftCardPrize;
  thumbnailUrl?: string;
  mediaUrl?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCount(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

// ─── Play Ring ────────────────────────────────────────────────────────────────

function PlayRing({ plays, milestone, size = 36 }: { plays: number; milestone: number; size?: number }) {
  const progress = Math.min(plays / milestone, 1);
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = circumference * progress;
  const isComplete = progress >= 1;
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(0,0,0,0.55)" strokeWidth={3} fill="transparent" />
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke={isComplete ? "#FFD700" : "#FE2C55"} strokeWidth={3}
        fill="transparent" strokeDasharray={`${strokeDash} ${circumference}`} strokeLinecap="round" />
    </Svg>
  );
}

function TilePlayIndicator({ reel, onTap }: { reel: ReelGridItem; onTap: () => void }) {
  const isComplete = reel.plays >= PLAY_MILESTONE;
  if (reel.scratchUsed) return null;
  return (
    <Pressable onPress={isComplete ? onTap : undefined} style={styles.ringWrap}>
      <PlayRing plays={reel.plays} milestone={PLAY_MILESTONE} size={36} />
      {isComplete ? (
        <View style={styles.ringCenter}><Text style={{ fontSize: 13 }}>🎁</Text></View>
      ) : (
        <View style={styles.ringCenter}><Text style={styles.ringCount}>{reel.plays}</Text></View>
      )}
    </Pressable>
  );
}

// ─── Edit Profile Modal ───────────────────────────────────────────────────────

function EditProfileModal({
  visible,
  onClose,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const { user, updateUser } = useAuth();
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [username, setUsername] = useState(user?.username?.replace("@", "") ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [website, setWebsite] = useState(user?.website ?? "");

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      updateUser({ avatarUri: result.assets[0].uri });
    }
  };

  const handleSave = () => {
    updateUser({
      displayName: displayName.trim() || user?.displayName,
      username: username.trim() ? `@${username.trim().replace("@", "")}` : user?.username,
      bio: bio.trim(),
      website: website.trim(),
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.editModalContainer, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={[styles.editModalHeader, {
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8),
          borderBottomColor: colors.border,
          backgroundColor: colors.card,
        }]}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Text style={[styles.editModalCancel, { color: colors.foreground }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.editModalTitle, { color: colors.foreground }]}>Edit Profile</Text>
          <TouchableOpacity onPress={handleSave} activeOpacity={0.7}>
            <Text style={[styles.editModalSave, { color: "#FE2C55" }]}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
          {/* Avatar section */}
          <View style={styles.editAvatarSection}>
            <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.8} style={styles.editAvatarTouch}>
              {user?.avatarUri ? (
                <Image source={{ uri: user.avatarUri }} style={styles.editAvatar} />
              ) : (
                <View style={[styles.editAvatar, { backgroundColor: "#FE2C55", alignItems: "center", justifyContent: "center" }]}>
                  <Text style={{ color: "#fff", fontSize: 34, fontFamily: "Inter_700Bold" }}>
                    {(user?.displayName ?? "U")[0].toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.editAvatarOverlay}>
                <Feather name="camera" size={18} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={[styles.editAvatarHint, { color: "#FE2C55" }]}>Change profile photo</Text>
          </View>

          {/* Fields */}
          <View style={[styles.editFields, { borderColor: colors.border }]}>
            <View style={[styles.editField, { borderBottomColor: colors.border }]}>
              <Text style={[styles.editFieldLabel, { color: colors.mutedForeground }]}>Name</Text>
              <TextInput
                style={[styles.editFieldInput, { color: colors.foreground }]}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Display name"
                placeholderTextColor={colors.mutedForeground}
                returnKeyType="next"
              />
            </View>
            <View style={[styles.editField, { borderBottomColor: colors.border }]}>
              <Text style={[styles.editFieldLabel, { color: colors.mutedForeground }]}>Username</Text>
              <TextInput
                style={[styles.editFieldInput, { color: colors.foreground }]}
                value={username}
                onChangeText={setUsername}
                placeholder="username"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                returnKeyType="next"
              />
            </View>
            <View style={[styles.editField, { borderBottomColor: colors.border }]}>
              <Text style={[styles.editFieldLabel, { color: colors.mutedForeground }]}>Bio</Text>
              <TextInput
                style={[styles.editFieldInput, { color: colors.foreground }]}
                value={bio}
                onChangeText={setBio}
                placeholder="Add a bio..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                returnKeyType="next"
              />
            </View>
            <View style={[styles.editField, { borderBottomColor: "transparent" }]}>
              <Text style={[styles.editFieldLabel, { color: colors.mutedForeground }]}>Website</Text>
              <TextInput
                style={[styles.editFieldInput, { color: colors.foreground }]}
                value={website}
                onChangeText={setWebsite}
                placeholder="Add a link"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                keyboardType="url"
                returnKeyType="done"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── User List Modal (Followers / Following) ──────────────────────────────────

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

  const handleNavigate = (userId: string) => {
    onClose();
    setTimeout(() => {
      router.push({ pathname: "/user/[userId]" as any, params: { userId } });
    }, 300);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, {
          backgroundColor: colors.card,
          paddingBottom: insets.bottom + 20,
        }]}>
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
                    onPress={() => handleNavigate(u.id)}
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

interface OwnPost {
  id: string;
  content: string;
  mediaUrl?: string;
  createdAt: string;
  likes: number;
  comments: number;
  shares: number;
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, token, updateUser } = useAuth();
  const { getUserFollowers, getUserFollowing } = useSocial();

  const [activeTab, setActiveTab] = useState<"reels" | "posts" | "liked">("reels");
  const [reels, setReels] = useState<ReelGridItem[]>([]);
  const [ownPosts, setOwnPosts] = useState<OwnPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [scratchTarget, setScratchTarget] = useState<ReelGridItem | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const fetchReels = useCallback(async () => {
    if (!user?.id) return;
    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/reels?userId=${user.id}&limit=30`, { headers });
      if (res.ok) {
        const data = await res.json();
        setReels((prev) => {
          const prevById = new Map(prev.map((r) => [r.id, r]));
          return (data.items ?? []).map((r: any, i: number): ReelGridItem => {
            const id = String(r.id);
            const existing = prevById.get(id);
            return {
              id,
              title: r.description ?? "My Reel",
              plays: r.views ?? 0,
              // preserve local "claimed" flag across refetches
              scratchUsed: existing?.scratchUsed ?? false,
              prize: existing?.prize ?? PRIZES[i % PRIZES.length],
              thumbnailUrl: r.thumbnailUrl ?? undefined,
              mediaUrl: r.mediaUrl ?? undefined,
            };
          });
        });
      }
    } catch {}
  }, [user?.id, token]);

  const fetchPosts = useCallback(async () => {
    if (!user?.id) return;
    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/posts?userId=${user.id}&limit=30`, { headers });
      if (res.ok) {
        const data = await res.json();
        setOwnPosts(
          (data.items ?? []).map((p: any): OwnPost => ({
            id: String(p.id),
            content: p.content,
            mediaUrl: p.mediaUrl ?? undefined,
            createdAt: new Date(p.createdAt).toLocaleDateString(),
            likes: 0,
            comments: 0,
            shares: 0,
          }))
        );
      }
    } catch {}
  }, [user?.id, token]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchReels(), fetchPosts()]);
    setRefreshing(false);
  }, [fetchReels, fetchPosts]);

  // Fetch on mount + whenever the tab regains focus, so view counts stay in sync with the reels feed.
  // useFocusEffect fires on first focus (mount) too, so a separate useEffect would double-fetch.
  useFocusEffect(
    useCallback(() => {
      fetchReels();
      fetchPosts();
    }, [fetchReels, fetchPosts])
  );

  const completedCount = reels.filter((r) => r.plays >= PLAY_MILESTONE && !r.scratchUsed).length;
  const followersList = getUserFollowers(user?.id ?? "");
  const followingList = getUserFollowing(user?.id ?? "");

  const handleTilePress = (reel: ReelGridItem) => {
    if (reel.plays >= PLAY_MILESTONE && !reel.scratchUsed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setScratchTarget(reel);
    } else {
      Haptics.selectionAsync();
    }
  };

  const handleScratchClose = () => {
    if (scratchTarget) {
      setReels((prev) =>
        prev.map((r) => r.id === scratchTarget.id ? { ...r, scratchUsed: true } : r)
      );
    }
    setScratchTarget(null);
  };

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      updateUser({ avatarUri: result.assets[0].uri });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 80 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#FE2C55"]}
          />
        }
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
          {/* Avatar with camera overlay */}
          <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.85} style={styles.avatarTouch}>
            {user?.avatarUri ? (
              <Image source={{ uri: user.avatarUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: "#FE2C55" }]}>
                <Text style={styles.avatarText}>
                  {(user?.displayName ?? "U")[0].toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.cameraOverlay}>
              <Feather name="camera" size={12} color="#fff" />
            </View>
          </TouchableOpacity>

          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.stat} activeOpacity={0.7}>
              <Text style={[styles.statNum, { color: colors.foreground }]}>
                {formatCount(reels.length + ownPosts.length)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Posts</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.stat}
              activeOpacity={0.7}
              onPress={() => setShowFollowers(true)}
            >
              <Text style={[styles.statNum, { color: colors.foreground }]}>
                {formatCount(user?.followers ?? 0)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.stat}
              activeOpacity={0.7}
              onPress={() => setShowFollowing(true)}
            >
              <Text style={[styles.statNum, { color: colors.foreground }]}>
                {formatCount(user?.following ?? 0)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Following</Text>
            </TouchableOpacity>
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
          {user?.website ? (
            <View style={styles.websiteRow}>
              <Feather name="link" size={12} color="#FE2C55" />
              <Text style={styles.websiteText}>{user.website}</Text>
            </View>
          ) : null}
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
              <Text style={styles.scratchBannerSub}>Tap a glowing tile or here to reveal your prize</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#FFD700" />
          </Pressable>
        )}

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.editBtn, { borderColor: colors.border }]}
            activeOpacity={0.75}
            onPress={() => setShowEditProfile(true)}
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
            style={[styles.tabItem, activeTab === "reels" && styles.tabItemActive]}
            onPress={() => setActiveTab("reels")}
            activeOpacity={0.7}
          >
            <Feather name="grid" size={22} color={activeTab === "reels" ? colors.foreground : colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === "posts" && styles.tabItemActive]}
            onPress={() => setActiveTab("posts")}
            activeOpacity={0.7}
          >
            <Feather name="align-left" size={22} color={activeTab === "posts" ? colors.foreground : colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === "liked" && styles.tabItemActive]}
            onPress={() => setActiveTab("liked")}
            activeOpacity={0.7}
          >
            <Feather name="heart" size={22} color={activeTab === "liked" ? colors.foreground : colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* ── REELS TAB ── */}
        {activeTab === "reels" && (
          <>
            <View style={[styles.legend, { backgroundColor: colors.muted }]}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#FE2C55" }]} />
                <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Play progress</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#FFD700" }]} />
                <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Scratch ready</Text>
              </View>
              <View style={styles.legendItem}>
                <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Tap to scratch</Text>
              </View>
            </View>
            <View style={styles.grid}>
              {reels.map((reel) => {
                const isComplete = reel.plays >= PLAY_MILESTONE;
                const isUsed = reel.scratchUsed;
                return (
                  <Pressable
                    key={reel.id}
                    style={[styles.thumb, isComplete && !isUsed && styles.thumbGlow]}
                    onPress={() => handleTilePress(reel)}
                    android_ripple={{ color: "#333" }}
                  >
                    {reel.thumbnailUrl ? (
                      <Image source={{ uri: reel.thumbnailUrl }} style={styles.thumbImg} resizeMode="cover" />
                    ) : (
                      <View style={[styles.thumbImg, { backgroundColor: "#1a1a1a", alignItems: "center", justifyContent: "center" }]}>
                        <Feather name="video" size={28} color="rgba(255,255,255,0.25)" />
                      </View>
                    )}
                    <View style={styles.thumbDark} />
                    <TilePlayIndicator reel={reel} onTap={() => setScratchTarget(reel)} />
                    <View style={styles.thumbBottom}>
                      <Feather name="play" size={10} color="rgba(255,255,255,0.8)" />
                      <Text style={styles.thumbViews}>
                        {formatCount(reel.plays)}
                        {reel.plays < PLAY_MILESTONE && <Text style={styles.thumbMilestone}>/100</Text>}
                      </Text>
                    </View>
                    {isUsed && (
                      <View style={styles.usedBadge}>
                        <Text style={styles.usedText}>✓ Claimed</Text>
                      </View>
                    )}
                    {isComplete && !isUsed && <View style={[styles.glowBorder, { pointerEvents: "none" }]} />}
                  </Pressable>
                );
              })}
            </View>
            <Text style={[styles.tapHint, { color: colors.mutedForeground }]}>
              Each reel tracks real plays. At 100 plays, a scratch card unlocks — tap the tile to claim your prize!
            </Text>
          </>
        )}

        {/* ── POSTS TAB ── */}
        {activeTab === "posts" && (
          <View>
            {ownPosts.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="file-text" size={44} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No posts yet</Text>
              </View>
            ) : ownPosts.map((post) => (
              <View
                key={post.id}
                style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.postHeader}>
                  {user?.avatarUri ? (
                    <Image source={{ uri: user.avatarUri }} style={styles.postAvatar} />
                  ) : (
                    <View style={[styles.postAvatar, { backgroundColor: "#FE2C55", alignItems: "center", justifyContent: "center" }]}>
                      <Text style={styles.postAvatarText}>{(user?.displayName ?? "U")[0]}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.postName, { color: colors.foreground }]}>{user?.displayName ?? "You"}</Text>
                    <Text style={[styles.postTime, { color: colors.mutedForeground }]}>{post.createdAt}</Text>
                  </View>
                </View>
                <Text style={[styles.postContent, { color: colors.foreground }]}>{post.content}</Text>
                {post.mediaUrl ? (
                  <Image source={{ uri: post.mediaUrl }} style={styles.postImage} resizeMode="cover" />
                ) : null}
                <View style={[styles.postStats, { borderTopColor: colors.border }]}>
                  <View style={styles.postStat}>
                    <Feather name="thumbs-up" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.postStatText, { color: colors.mutedForeground }]}>{formatCount(post.likes)}</Text>
                  </View>
                  <View style={styles.postStat}>
                    <Feather name="message-square" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.postStatText, { color: colors.mutedForeground }]}>{formatCount(post.comments)}</Text>
                  </View>
                  <View style={styles.postStat}>
                    <Feather name="share" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.postStatText, { color: colors.mutedForeground }]}>{formatCount(post.shares)}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── LIKED TAB ── */}
        {activeTab === "liked" && (
          <View style={styles.emptyState}>
            <Feather name="heart" size={44} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Videos you've liked will appear here
            </Text>
          </View>
        )}
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

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        colors={colors}
      />

      {/* Followers Modal */}
      <UserListModal
        visible={showFollowers}
        onClose={() => setShowFollowers(false)}
        title={`Followers · ${formatCount(user?.followers ?? 0)}`}
        users={followersList}
        colors={colors}
      />

      {/* Following Modal */}
      <UserListModal
        visible={showFollowing}
        onClose={() => setShowFollowing(false)}
        title={`Following · ${formatCount(user?.following ?? 0)}`}
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
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 24,
  },
  avatarTouch: { position: "relative" },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
  },
  avatarText: { color: "#fff", fontSize: 34, fontFamily: "Inter_700Bold" },
  cameraOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FE2C55",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#000",
  },
  statsRow: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  stat: { alignItems: "center", gap: 2 },
  statNum: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  bioSection: { paddingHorizontal: 16, paddingTop: 12, gap: 4 },
  displayName: { fontSize: 16, fontFamily: "Inter_700Bold" },
  bio: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  websiteRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  websiteText: { color: "#FE2C55", fontSize: 13, fontFamily: "Inter_500Medium" },
  scratchBanner: {
    marginHorizontal: 16, marginTop: 12, borderRadius: 12, borderWidth: 1,
    padding: 12, flexDirection: "row", alignItems: "center", gap: 10,
  },
  scratchBannerEmoji: { fontSize: 24 },
  scratchBannerTitle: { color: "#FFD700", fontSize: 14, fontFamily: "Inter_700Bold" },
  scratchBannerSub: { color: "rgba(255,215,0,0.6)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  actionRow: { flexDirection: "row", paddingHorizontal: 16, paddingTop: 14, gap: 8 },
  editBtn: { flex: 1, height: 36, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  editBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  addBtn: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  tabRow: { flexDirection: "row", marginTop: 16, borderBottomWidth: 1 },
  tabItem: {
    flex: 1, height: 44, alignItems: "center", justifyContent: "center",
    borderBottomWidth: 2, borderBottomColor: "transparent",
  },
  tabItemActive: { borderBottomColor: "#fff" },
  legend: {
    flexDirection: "row", flexWrap: "wrap", gap: 10,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
  thumb: {
    width: THUMB_SIZE, height: THUMB_SIZE * 1.4,
    backgroundColor: "#111", position: "relative", overflow: "hidden",
  },
  thumbGlow: { borderWidth: 2, borderColor: "#FFD700" },
  thumbImg: { width: "100%", height: "100%" },
  thumbDark: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.15)" },
  ringWrap: {
    position: "absolute", top: 5, left: 5, width: 36, height: 36,
    alignItems: "center", justifyContent: "center",
  },
  ringCenter: { position: "absolute", alignItems: "center", justifyContent: "center" },
  ringCount: { color: "#fff", fontSize: 9, fontFamily: "Inter_700Bold" },
  thumbBottom: {
    position: "absolute", bottom: 5, left: 6,
    flexDirection: "row", alignItems: "center", gap: 3,
  },
  thumbViews: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
  thumbMilestone: { color: "rgba(255,255,255,0.55)", fontSize: 9, fontFamily: "Inter_400Regular" },
  usedBadge: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center",
  },
  usedText: { color: "#6BCB77", fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  glowBorder: { ...StyleSheet.absoluteFillObject, borderWidth: 2, borderColor: "#FFD700" },
  tapHint: {
    fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center",
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4,
  },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 32 },
  postCard: { marginHorizontal: 12, marginTop: 10, borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  postHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, paddingBottom: 8 },
  postAvatar: { width: 36, height: 36, borderRadius: 18 },
  postAvatarText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  postName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  postTime: { fontSize: 12, fontFamily: "Inter_400Regular" },
  postContent: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21, paddingHorizontal: 12, paddingBottom: 10 },
  postImage: { width: "100%", height: 200 },
  postStats: { flexDirection: "row", borderTopWidth: 1, paddingHorizontal: 12, paddingVertical: 8, gap: 16 },
  postStat: { flexDirection: "row", alignItems: "center", gap: 5 },
  postStatText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  // Edit Profile Modal
  editModalContainer: { flex: 1 },
  editModalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1,
  },
  editModalCancel: { fontSize: 16, fontFamily: "Inter_400Regular" },
  editModalTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  editModalSave: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  editAvatarSection: { alignItems: "center", paddingVertical: 24 },
  editAvatarTouch: { position: "relative" },
  editAvatar: { width: 90, height: 90, borderRadius: 45 },
  editAvatarOverlay: {
    position: "absolute", bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#FE2C55", alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#000",
  },
  editAvatarHint: { marginTop: 8, fontSize: 14, fontFamily: "Inter_500Medium" },
  editFields: { marginHorizontal: 16, borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  editField: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  editFieldLabel: { width: 72, fontSize: 14, fontFamily: "Inter_500Medium" },
  editFieldInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  // Follower/Following modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "80%", minHeight: 300 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 4 },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  userRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userRowLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  userRowAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  userRowAvatarText: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" },
  userRowName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  userRowUsername: { fontSize: 12, fontFamily: "Inter_400Regular" },
  followBtn: { height: 32, paddingHorizontal: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  followBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
