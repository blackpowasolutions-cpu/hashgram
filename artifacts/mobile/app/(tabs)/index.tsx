import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ResizeMode, Video } from "expo-av";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  ImageSourcePropType,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useMessages } from "@/context/MessagesContext";
import { useSocial } from "@/context/SocialContext";

const { width, height } = Dimensions.get("window");

// ─── Types ────────────────────────────────────────────────────────────────────

interface Reel {
  id: string;
  userId: string;
  user: string;
  displayName: string;
  description: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  image?: ImageSourcePropType;
  videoUri?: string;
  music: string;
  avatarColor: string;
}

interface GiftItem {
  type: "gift";
  id: string;
  prize: { emoji: string; title: string; value: string; color: string };
}

type ListItem = Reel | GiftItem;

function isGift(item: ListItem): item is GiftItem {
  return (item as GiftItem).type === "gift";
}

// ─── Static data ──────────────────────────────────────────────────────────────

const REELS: Reel[] = [
  {
    id: "1", userId: "1", user: "@dancequeen", displayName: "Dance Queen",
    description: "New choreography drop! This took 3 weeks to perfect 🔥 #dance #fyp #trending",
    likes: 482000, comments: 12030, shares: 8920, views: 2100000,
    image: require("../../assets/images/reel1.png"),
    music: "Original Sound - dancequeen", avatarColor: "#FF6B9D",
  },
  {
    id: "2", userId: "4", user: "@streetfoodking", displayName: "Street Food King",
    description: "Secret recipe my grandma taught me 👨‍🍳 The best noodles you'll ever taste #food #cooking",
    likes: 271000, comments: 5400, shares: 3100, views: 980000,
    image: require("../../assets/images/reel2.png"),
    music: "Cooking Vibes - lofi beats", avatarColor: "#FF8C42",
  },
  {
    id: "3", userId: "2", user: "@sk8er_pro", displayName: "Sk8er Pro",
    description: "Landed this trick after 200 tries 🛹 Never give up on your dreams #skateboarding",
    likes: 893000, comments: 23100, shares: 15600, views: 3800000,
    image: require("../../assets/images/reel3.png"),
    music: "Skateboarding Mix - punk radio", avatarColor: "#6BCB77",
  },
  {
    id: "4", userId: "3", user: "@wanderlust", displayName: "Wanderlust",
    description: "Found this hidden spot after 6 hours of hiking 🏔️ Worth every step #travel",
    likes: 1200000, comments: 31000, shares: 22000, views: 5600000,
    image: require("../../assets/images/reel4.png"),
    music: "Mountain Air - ambient sounds", avatarColor: "#4D96FF",
  },
  {
    id: "5", userId: "5", user: "@stylequeen", displayName: "Style Queen",
    description: "GRWM for my coffee date ☕ Outfit details in bio! #fashion #ootd #style",
    likes: 567000, comments: 18200, shares: 9800, views: 2400000,
    image: require("../../assets/images/reel5.png"),
    music: "Aesthetic Vibes - chill playlist", avatarColor: "#C77DFF",
  },
];

const GIFT_PRIZES = [
  { emoji: "🎵", title: "Spotify Gift Card",      value: "$5 free",    color: "#1DB954" },
  { emoji: "☕", title: "Starbucks Voucher",       value: "$5 free",    color: "#00704A" },
  { emoji: "▶️", title: "YouTube Premium",         value: "$10 credit", color: "#FF0000" },
  { emoji: "🎮", title: "Google Play Credit",      value: "$5 free",    color: "#4285F4" },
  { emoji: "🍕", title: "DoorDash Promo",          value: "$10 off",    color: "#FF3008" },
  { emoji: "🛒", title: "Amazon Gift Card",        value: "$10 free",   color: "#FF9900" },
];

function formatCount(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

// ─── Gift Surprise Card ───────────────────────────────────────────────────────

function GiftSurpriseCard({ item, bottomPad }: { item: GiftItem; bottomPad: number }) {
  const [phase, setPhase] = useState<"idle" | "shaking" | "revealed">("idle");
  const [claimed, setClaimed] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleTap = useCallback(() => {
    if (phase !== "idle") return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPhase("shaking");

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.15, duration: 120, useNativeDriver: true }),
      // shake side to side
      Animated.timing(shakeAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setPhase("revealed");
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, bounciness: 14 }).start();
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    });
  }, [phase, scaleAnim, shakeAnim, fadeAnim]);

  const handleClaim = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setClaimed(true);
  }, []);

  const shakeX = shakeAnim.interpolate({ inputRange: [-1, 1], outputRange: [-14, 14] });

  if (!item.prize) return null;

  return (
    <View style={[styles.reel, { height, backgroundColor: "#0a0a0a" }]}>
      <LinearGradient
        colors={["#1a0030", "#0a0010", "#000"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative sparkles */}
      <Text style={styles.sparkle1}>✨</Text>
      <Text style={styles.sparkle2}>⭐</Text>
      <Text style={styles.sparkle3}>✨</Text>
      <Text style={styles.sparkle4}>💫</Text>

      <View style={styles.giftCenter}>
        {phase !== "revealed" ? (
          <>
            <Text style={styles.giftSurpriseLabel}>🎁 Surprise!</Text>
            <Text style={styles.giftSurpriseSubLabel}>You've been selected for a gift</Text>

            <Animated.View style={{ transform: [{ scale: scaleAnim }, { translateX: shakeX }] }}>
              <TouchableOpacity onPress={handleTap} activeOpacity={0.85} style={styles.giftBox}>
                <Text style={styles.giftBoxEmoji}>🎁</Text>
              </TouchableOpacity>
            </Animated.View>

            {phase === "idle" && (
              <Text style={styles.giftTapHint}>Tap to reveal your gift</Text>
            )}
          </>
        ) : (
          <Animated.View style={[styles.revealCard, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <LinearGradient
              colors={[item.prize.color + "44", item.prize.color + "22", "#111"]}
              style={styles.revealGradient}
            >
              <Text style={styles.revealEmoji}>{item.prize.emoji}</Text>
              <Text style={styles.revealTitle}>{item.prize.title}</Text>
              <View style={[styles.revealValueBadge, { backgroundColor: item.prize.color + "33",
                borderColor: item.prize.color }]}>
                <Text style={[styles.revealValue, { color: item.prize.color }]}>{item.prize.value}</Text>
              </View>
              <Text style={styles.revealNote}>Check your gift inbox to redeem</Text>

              {claimed ? (
                <View style={styles.claimedRow}>
                  <Feather name="check-circle" size={18} color="#4CAF50" />
                  <Text style={styles.claimedText}>Claimed! Added to your gifts</Text>
                </View>
              ) : (
                <TouchableOpacity style={[styles.claimBtn, { backgroundColor: item.prize.color }]}
                  onPress={handleClaim} activeOpacity={0.85}>
                  <Text style={styles.claimBtnText}>Claim Gift 🎉</Text>
                </TouchableOpacity>
              )}
            </LinearGradient>
          </Animated.View>
        )}
      </View>

      {/* Bottom hint */}
      <View style={[styles.giftBottomHint, { paddingBottom: bottomPad + 90 }]}>
        <Feather name="chevron-down" size={16} color="rgba(255,255,255,0.4)" />
        <Text style={styles.giftScrollHint}>Keep scrolling for more reels</Text>
      </View>
    </View>
  );
}

// ─── Reel Item ────────────────────────────────────────────────────────────────

function ReelItem({ item, bottomPad, isActive }: { item: Reel; bottomPad: number; isActive: boolean }) {
  const { user } = useAuth();
  const { isFollowing, toggleFollow } = useSocial();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(item.likes);
  const [heartVisible, setHeartVisible] = useState(false);
  const lastTap = useRef(0);
  const isOwn = item.userId === user?.id;
  const following = isFollowing(item.userId);

  const handleLike = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLiked((prev) => {
      setLikeCount((c) => (prev ? c - 1 : c + 1));
      return !prev;
    });
  }, []);

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!liked) {
        setLiked(true);
        setLikeCount((c) => c + 1);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      setHeartVisible(true);
      setTimeout(() => setHeartVisible(false), 900);
    }
    lastTap.current = now;
  }, [liked]);

  const handleFollow = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleFollow(item.userId);
  }, [item.userId, toggleFollow]);

  return (
    <Pressable style={[styles.reel, { height }]} onPress={handleDoubleTap}>
      {item.videoUri && Platform.OS !== "web" ? (
        <Video
          source={{ uri: item.videoUri }}
          style={styles.reelBg}
          resizeMode={ResizeMode.COVER}
          shouldPlay={isActive}
          isLooping
          isMuted={false}
        />
      ) : item.image ? (
        <Image source={item.image} style={styles.reelBg} resizeMode="cover" />
      ) : (
        <View style={[styles.reelBg, { backgroundColor: "#111" }]} />
      )}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.5)", "rgba(0,0,0,0.92)"]}
        locations={[0.4, 0.7, 1]}
        style={[styles.gradient, { pointerEvents: "none" }]}
      />

      {heartVisible && (
        <View style={[styles.heartOverlay, { pointerEvents: "none" }]}>
          <Feather name="heart" size={80} color="#FE2C55" />
        </View>
      )}

      {/* Right actions */}
      <View style={[styles.actions, { bottom: bottomPad + 80 }]}>

        {/* Avatar + Follow */}
        <View style={{ alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => router.push({ pathname: "/user/[userId]" as any, params: { userId: item.userId } })}
            activeOpacity={0.8}
          >
            <View style={[styles.avatarWrap, { backgroundColor: item.avatarColor }]}>
              <Text style={styles.avatarText}>{item.displayName[0]}</Text>
            </View>
          </TouchableOpacity>
          {!isOwn && (
            <TouchableOpacity
              style={[styles.followBadge, following && styles.followBadgeActive]}
              onPress={handleFollow}
              activeOpacity={0.8}
            >
              {following
                ? <Feather name="check" size={11} color="#fff" />
                : <Feather name="plus" size={11} color="#fff" />
              }
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 16 }} />

        {/* Views */}
        <View style={styles.actionBtn}>
          <Feather name="eye" size={26} color="rgba(255,255,255,0.85)" />
          <Text style={styles.actionCount}>{formatCount(item.views)}</Text>
        </View>

        {/* Like */}
        <TouchableOpacity style={styles.actionBtn} onPress={handleLike} activeOpacity={0.7}>
          <Feather name="heart" size={30} color={liked ? "#FE2C55" : "#fff"} />
          <Text style={styles.actionCount}>{formatCount(likeCount)}</Text>
        </TouchableOpacity>

        {/* Comment */}
        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
          <Feather name="message-circle" size={28} color="#fff" />
          <Text style={styles.actionCount}>{formatCount(item.comments)}</Text>
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
          <Feather name="share-2" size={26} color="#fff" />
          <Text style={styles.actionCount}>{formatCount(item.shares)}</Text>
        </TouchableOpacity>

        {/* More */}
        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
          <Feather name="more-horizontal" size={26} color="#fff" />
        </TouchableOpacity>

        {/* Music disc */}
        <View style={styles.musicDisc}>
          <View style={[styles.discInner, { backgroundColor: item.avatarColor }]}>
            <Feather name="music" size={14} color="#fff" />
          </View>
        </View>
      </View>

      {/* Bottom info */}
      <View style={[styles.info, { paddingBottom: bottomPad + 80 }]}>
        <TouchableOpacity
          onPress={() => router.push({ pathname: "/user/[userId]" as any, params: { userId: item.userId } })}
          activeOpacity={0.8}
        >
          <Text style={styles.username}>{item.user}</Text>
        </TouchableOpacity>
        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
        <View style={styles.musicRow}>
          <Feather name="music" size={12} color="#fff" />
          <Text style={styles.musicText} numberOfLines={1}>{item.music}</Text>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Feed Screen ──────────────────────────────────────────────────────────────

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);
  const { user } = useAuth();
  const { conversations } = useMessages();
  const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0);
  const [reels, setReels] = useState<Reel[]>(REELS);
  const [uploadToast, setUploadToast] = useState(false);
  const [activeId, setActiveId] = useState<string>(REELS[0]?.id ?? "");

  // Build feed: inject a gift surprise card after every 4th reel
  const listData = useMemo<ListItem[]>(() => {
    const result: ListItem[] = [];
    reels.forEach((reel, i) => {
      result.push(reel);
      if ((i + 1) % 4 === 0) {
        const prizeIndex = Math.floor(i / 4) % GIFT_PRIZES.length;
        const prize = GIFT_PRIZES[prizeIndex];
        if (prize) result.push({ type: "gift", id: `gift_${i}`, prize });
      }
    });
    return result;
  }, [reels]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems.find((v) => v.isViewable && !isGift(v.item));
      if (first) setActiveId(first.item.id);
    },
    [setActiveId]
  );

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 });

  const handleUpload = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        videoMaxDuration: 60,
        quality: 1,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const newReel: Reel = {
          id: `user_${Date.now()}`,
          userId: user?.id ?? "1",
          user: user?.username ?? "@you",
          displayName: user?.displayName ?? "You",
          description: "My new reel 🎬 #reels #fyp",
          likes: 0,
          comments: 0,
          shares: 0,
          views: 0,
          videoUri: asset.uri,
          music: "Original Sound",
          avatarColor: "#FF6B9D",
        };
        setReels((prev) => [newReel, ...prev]);
        setUploadToast(true);
        setTimeout(() => setUploadToast(false), 2500);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {}
  }, [user]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8) }]}>
        {/* Upload button */}
        <TouchableOpacity style={styles.uploadBtn} onPress={handleUpload} activeOpacity={0.7}>
          <View style={styles.uploadBtnInner}>
            <Feather name="plus" size={14} color="#fff" />
          </View>
          <Text style={styles.uploadBtnText}>Upload</Text>
        </TouchableOpacity>

        <View style={{ flex: 1, flexDirection: "row", justifyContent: "center", gap: 20 }}>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.headerTab}>Following</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={[styles.headerTab, styles.headerTabActive]}>For You</Text>
          </TouchableOpacity>
        </View>

        {/* Right: search + DM */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <TouchableOpacity activeOpacity={0.7}>
            <Feather name="search" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.dmBtn} onPress={() => router.push("/messages")} activeOpacity={0.7}>
            <Feather name="send" size={22} color="#fff" />
            {totalUnread > 0 && (
              <View style={styles.dmBadge}>
                <Text style={styles.dmBadgeText}>{totalUnread > 9 ? "9+" : totalUnread}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Upload toast */}
      {uploadToast && (
        <View style={[styles.toast, { top: insets.top + (Platform.OS === "web" ? 120 : 80) }]}>
          <Feather name="check-circle" size={15} color="#4CAF50" />
          <Text style={styles.toastText}>Reel uploaded! Tap to view.</Text>
        </View>
      )}

      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) =>
          isGift(item)
            ? <GiftSurpriseCard item={item} bottomPad={bottomPad} />
            : <ReelItem item={item} bottomPad={bottomPad} isActive={item.id === activeId} />
        }
        pagingEnabled
        snapToInterval={height}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        scrollEnabled={listData.length > 0}
        getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  // Header
  header: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 8,
  },
  headerTab: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
  headerTabActive: {
    color: "#fff",
    borderBottomWidth: 2,
    borderBottomColor: "#fff",
    paddingBottom: 2,
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  uploadBtnInner: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadBtnText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  dmBtn: { position: "relative" },
  dmBadge: {
    position: "absolute",
    top: -5, right: -5,
    backgroundColor: "#FE2C55",
    borderRadius: 8,
    minWidth: 16, height: 16,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 3,
  },
  dmBadgeText: { color: "#fff", fontSize: 9, fontFamily: "Inter_700Bold" },

  // Toast
  toast: {
    position: "absolute",
    left: 20, right: 20,
    zIndex: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(20,20,20,0.92)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(76,175,80,0.4)",
  },
  toastText: { color: "#fff", fontSize: 13, fontFamily: "Inter_500Medium" },

  // Reel
  reel: { width, backgroundColor: "#000" },
  reelBg: { ...StyleSheet.absoluteFillObject, width },
  gradient: { ...StyleSheet.absoluteFillObject },
  heartOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },

  // Actions rail
  actions: {
    position: "absolute",
    right: 12,
    alignItems: "center",
    gap: 4,
    zIndex: 5,
  },
  avatarWrap: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#fff",
  },
  avatarText: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" },
  followBadge: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "#FE2C55",
    alignItems: "center", justifyContent: "center",
    marginTop: -12,
  },
  followBadgeActive: {
    backgroundColor: "#555",
  },
  actionBtn: {
    alignItems: "center",
    gap: 2,
    paddingVertical: 6,
  },
  actionCount: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  musicDisc: {
    width: 46, height: 46, borderRadius: 23,
    borderWidth: 3, borderColor: "#333",
    backgroundColor: "#111",
    alignItems: "center", justifyContent: "center",
    marginTop: 8,
  },
  discInner: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: "center", justifyContent: "center",
  },

  // Bottom info
  info: {
    position: "absolute",
    left: 14, right: 72, bottom: 0,
    zIndex: 5,
    gap: 6,
  },
  username: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  description: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20,
  },
  musicRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  musicText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13, fontFamily: "Inter_400Regular", flex: 1,
  },

  // Gift surprise card
  giftCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 16,
  },
  giftSurpriseLabel: {
    color: "#fff",
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  giftSurpriseSubLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: -8,
  },
  giftBox: {
    width: 120, height: 120,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  giftBoxEmoji: { fontSize: 64 },
  giftTapHint: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: -4,
  },
  revealCard: {
    width: "100%",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  revealGradient: {
    padding: 28,
    alignItems: "center",
    gap: 12,
  },
  revealEmoji: { fontSize: 56 },
  revealTitle: {
    color: "#fff",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  revealValueBadge: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  revealValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  revealNote: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  claimBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
    marginTop: 4,
  },
  claimBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  claimedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  claimedText: {
    color: "#4CAF50",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  giftBottomHint: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    alignItems: "center",
    gap: 4,
  },
  giftScrollHint: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },

  // Sparkle decorations
  sparkle1: { position: "absolute", top: "15%", left: "10%", fontSize: 22, opacity: 0.6 },
  sparkle2: { position: "absolute", top: "20%", right: "12%", fontSize: 18, opacity: 0.5 },
  sparkle3: { position: "absolute", bottom: "30%", left: "8%", fontSize: 18, opacity: 0.4 },
  sparkle4: { position: "absolute", bottom: "25%", right: "10%", fontSize: 22, opacity: 0.5 },
});
