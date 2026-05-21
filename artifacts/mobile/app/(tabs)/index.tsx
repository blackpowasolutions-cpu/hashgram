import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { ResizeMode, Video } from "expo-av";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  ImageSourcePropType,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useMessages } from "@/context/MessagesContext";
import { useSocial } from "@/context/SocialContext";

const { width, height } = Dimensions.get("window");

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

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
  likedByMe: boolean;
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

const REELS: Reel[] = [];

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
  const { user, token } = useAuth();
  const { isFollowing, toggleFollow } = useSocial();
  const [liked, setLiked] = useState(item.likedByMe);
  const [likeCount, setLikeCount] = useState(item.likes);
  const [heartVisible, setHeartVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const lastTap = useRef(0);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOwn = String(item.userId) === String(user?.id ?? "");
  const following = isFollowing(item.userId);

  // Auto-resume when the reel becomes active again (e.g. user scrolls away & back)
  useEffect(() => {
    if (!isActive) setIsPaused(false);
  }, [isActive]);

  // Keep local optimistic state in sync with refreshed props (e.g. after focus refetch),
  // but skip the update if we have an in-flight optimistic mutation to avoid clobbering it.
  const pendingLike = useRef(false);
  useEffect(() => {
    if (pendingLike.current) return;
    setLiked(item.likedByMe);
    setLikeCount(item.likes);
  }, [item.likedByMe, item.likes]);

  const sendLike = useCallback(
    async (shouldLike: boolean): Promise<boolean> => {
      if (!token) return false;
      const reelIdNum = Number(item.id);
      if (!Number.isFinite(reelIdNum)) return false;
      try {
        const res = await fetch(`${API_BASE}/reels/${reelIdNum}/like`, {
          method: shouldLike ? "POST" : "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        return res.ok;
      } catch {
        return false;
      }
    },
    [item.id, token]
  );

  const applyLike = useCallback(
    async (next: boolean) => {
      pendingLike.current = true;
      setLiked(next);
      setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
      const ok = await sendLike(next);
      if (!ok) {
        // Rollback on failure
        setLiked(!next);
        setLikeCount((c) => Math.max(0, c + (next ? -1 : 1)));
      }
      pendingLike.current = false;
    },
    [sendLike]
  );

  const handleLike = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    applyLike(!liked);
  }, [applyLike, liked]);

  const triggerDoubleTapLike = useCallback(() => {
    if (!liked) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      applyLike(true);
    }
    setHeartVisible(true);
    setTimeout(() => setHeartVisible(false), 900);
  }, [applyLike, liked]);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (singleTapTimer.current && now - lastTap.current < 300) {
      // Second tap arrived before the pending single-tap fired → it's a double tap
      clearTimeout(singleTapTimer.current);
      singleTapTimer.current = null;
      lastTap.current = 0;
      triggerDoubleTapLike();
      return;
    }
    lastTap.current = now;
    // Wait briefly to see if a 2nd tap arrives, else toggle pause
    singleTapTimer.current = setTimeout(() => {
      singleTapTimer.current = null;
      lastTap.current = 0; // reset so a subsequent tap can't be reclassified as a double tap
      setIsPaused((p) => !p);
      Haptics.selectionAsync();
    }, 280);
  }, [triggerDoubleTapLike]);

  useEffect(() => {
    return () => {
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
    };
  }, []);

  const handleFollow = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleFollow(item.userId);
  }, [item.userId, toggleFollow]);

  return (
    <Pressable style={[styles.reel, { height }]} onPress={handleTap}>
      {item.videoUri && Platform.OS !== "web" ? (
        <Video
          source={{ uri: item.videoUri }}
          style={styles.reelBg}
          resizeMode={ResizeMode.COVER}
          shouldPlay={isActive && !isPaused}
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

      {isPaused && isActive && (
        <View style={[styles.pauseOverlay, { pointerEvents: "none" }]}>
          <View style={styles.pauseIconBg}>
            <Feather name="play" size={42} color="#fff" />
          </View>
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
  const { user, token } = useAuth();
  const { conversations } = useMessages();
  const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0);
  const [reels, setReels] = useState<Reel[]>(REELS);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadToast, setUploadToast] = useState(false);
  const [activeId, setActiveId] = useState<string>(REELS[0]?.id ?? "");
  const viewedRef = useRef<Set<string>>(new Set());

  // Composer modal state
  const [composerVisible, setComposerVisible] = useState(false);
  const [pendingVideoUri, setPendingVideoUri] = useState<string | null>(null);
  const [composerCaption, setComposerCaption] = useState("");
  const [composerHashtags, setComposerHashtags] = useState("");
  const [publishing, setPublishing] = useState(false);

  const fetchReels = useCallback(async () => {
    setRefreshing(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/reels?limit=50`, { headers });
      if (res.ok) {
        const data = await res.json();
        const items = (data.items ?? []).map((r: any): Reel => ({
          id: String(r.id),
          userId: String(r.userId),
          user: r.user?.username ?? "",
          displayName: r.user?.displayName ?? "",
          description: r.description ?? "",
          likes: r.likesCount ?? 0,
          comments: 0,
          shares: 0,
          views: r.views ?? 0,
          likedByMe: !!r.likedByMe,
          image: r.thumbnailUrl ? ({ uri: r.thumbnailUrl } as any) : undefined,
          videoUri: r.mediaUrl ?? undefined,
          music: r.music ?? "Original Sound",
          avatarColor: "#FF6B9D",
        }));
        setReels(items);
        if (items.length > 0) setActiveId((prev) => prev || items[0].id);
      }
    } catch {}
    setRefreshing(false);
  }, [token]);

  // Fetch on mount and whenever the screen regains focus so counters stay in sync.
  // useFocusEffect fires on first focus (i.e. mount) too, so a separate useEffect would double-fetch.
  useFocusEffect(
    useCallback(() => {
      fetchReels();
    }, [fetchReels])
  );

  // Report a view for each reel the user lands on (once per session per reel).
  // Optimistically bump views, then roll back if the request fails so dedupe can retry next focus.
  useEffect(() => {
    if (!activeId) return;
    const reelIdNum = Number(activeId);
    if (!Number.isFinite(reelIdNum)) return;
    if (viewedRef.current.has(activeId)) return;
    viewedRef.current.add(activeId);
    setReels((prev) =>
      prev.map((r) => (r.id === activeId ? { ...r, views: r.views + 1 } : r))
    );
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    fetch(`${API_BASE}/reels/${reelIdNum}/view`, { method: "POST", headers })
      .then((res) => {
        if (!res.ok) throw new Error(`view ${res.status}`);
      })
      .catch(() => {
        // Rollback optimistic bump + allow retry on next focus
        viewedRef.current.delete(activeId);
        setReels((prev) =>
          prev.map((r) => (r.id === activeId ? { ...r, views: Math.max(0, r.views - 1) } : r))
        );
      });
  }, [activeId, token]);

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
        setPendingVideoUri(result.assets[0].uri);
        setComposerCaption("");
        setComposerHashtags("");
        setComposerVisible(true);
      }
    } catch {}
  }, []);

  const cancelComposer = useCallback(() => {
    setComposerVisible(false);
    setPendingVideoUri(null);
    setComposerCaption("");
    setComposerHashtags("");
  }, []);

  const publishReel = useCallback(async () => {
    if (!pendingVideoUri || publishing) return;
    setPublishing(true);
    // Build description: caption + normalized hashtags
    const caption = composerCaption.trim();
    const hashtags = composerHashtags
      .split(/[\s,]+/)
      .map((t) => t.trim().replace(/^#+/, ""))
      .filter(Boolean)
      .map((t) => `#${t}`)
      .join(" ");
    const description = [caption, hashtags].filter(Boolean).join(" ").trim() || "My new reel 🎬";

    const tempId = `user_${Date.now()}`;
    const newReel: Reel = {
      id: tempId,
      userId: user?.id ?? "1",
      user: user?.username ?? "@you",
      displayName: user?.displayName ?? "You",
      description,
      likes: 0,
      comments: 0,
      shares: 0,
      views: 0,
      likedByMe: false,
      videoUri: pendingVideoUri,
      music: "Original Sound",
      avatarColor: "#FF6B9D",
    };
    setReels((prev) => [newReel, ...prev]);
    setComposerVisible(false);
    setPendingVideoUri(null);
    setComposerCaption("");
    setComposerHashtags("");
    setUploadToast(true);
    setTimeout(() => setUploadToast(false), 2500);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (token) {
      try {
        const res = await fetch(`${API_BASE}/reels`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            description,
            mediaUrl: newReel.videoUri,
            music: "Original Sound",
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.id) {
            setReels((prev) =>
              prev.map((r) => (r.id === tempId ? { ...r, id: String(data.id) } : r))
            );
          }
        }
      } catch {}
    }
    setPublishing(false);
  }, [pendingVideoUri, publishing, composerCaption, composerHashtags, user, token]);

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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchReels}
            tintColor="#fff"
            colors={["#FE2C55"]}
          />
        }
        ListEmptyComponent={
          <View style={[styles.emptyState, { height, paddingBottom: bottomPad + 80 }]}>
            <Feather name="video" size={52} color="rgba(255,255,255,0.18)" />
            <Text style={styles.emptyTitle}>No reels yet</Text>
            <Text style={styles.emptySubtitle}>Be the first to share a reel!</Text>
            <TouchableOpacity style={styles.emptyUploadBtn} onPress={handleUpload} activeOpacity={0.8}>
              <Feather name="plus" size={16} color="#fff" />
              <Text style={styles.emptyUploadText}>Upload your first reel</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Composer modal: caption + hashtags before publishing */}
      <Modal visible={composerVisible} transparent animationType="slide" onRequestClose={cancelComposer}>
        <KeyboardAvoidingView
          style={styles.composerBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.composerSheet}>
            <View style={styles.composerHeader}>
              <TouchableOpacity onPress={cancelComposer} activeOpacity={0.7}>
                <Text style={styles.composerCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.composerTitle}>New Reel</Text>
              <TouchableOpacity
                onPress={publishReel}
                activeOpacity={0.85}
                disabled={publishing}
                style={[styles.composerPublish, publishing && { opacity: 0.6 }]}
              >
                <Text style={styles.composerPublishText}>{publishing ? "Posting..." : "Post"}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.composerPreview}>
              {pendingVideoUri && Platform.OS !== "web" ? (
                <Video
                  source={{ uri: pendingVideoUri }}
                  style={StyleSheet.absoluteFill}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay
                  isLooping
                  isMuted
                />
              ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: "#222", alignItems: "center", justifyContent: "center" }]}>
                  <Feather name="video" size={36} color="rgba(255,255,255,0.4)" />
                </View>
              )}
            </View>

            <Text style={styles.composerLabel}>Caption / overlay text</Text>
            <TextInput
              style={styles.composerInput}
              value={composerCaption}
              onChangeText={setComposerCaption}
              placeholder="Say something about your reel..."
              placeholderTextColor="rgba(255,255,255,0.35)"
              multiline
              maxLength={200}
            />

            <Text style={styles.composerLabel}>Hashtags</Text>
            <TextInput
              style={[styles.composerInput, { minHeight: 44 }]}
              value={composerHashtags}
              onChangeText={setComposerHashtags}
              placeholder="dance fyp viral  (or  #dance #fyp)"
              placeholderTextColor="rgba(255,255,255,0.35)"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={120}
            />
            <Text style={styles.composerHint}>
              Separate tags with spaces or commas. The # is optional.
            </Text>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  pauseIconBg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  composerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  composerSheet: {
    backgroundColor: "#101010",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 12,
  },
  composerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 6,
  },
  composerCancel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  composerTitle: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  composerPublish: {
    backgroundColor: "#FE2C55",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  composerPublishText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  composerPreview: {
    height: 180,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  composerLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  composerInput: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 64,
    textAlignVertical: "top",
  },
  composerHint: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
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
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: "#FE2C55",
    alignItems: "center", justifyContent: "center",
    marginTop: -14,
    borderWidth: 2,
    borderColor: "#fff",
    ...(Platform.OS === "web"
      ? ({ boxShadow: "0 2px 4px rgba(0,0,0,0.4)" } as any)
      : {
          shadowColor: "#000",
          shadowOpacity: 0.4,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 4,
        }),
  },
  followBadgeActive: {
    backgroundColor: "#4CAF50",
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

  // Empty state
  emptyState: {
    width,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  emptyTitle: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    marginTop: 4,
  },
  emptySubtitle: {
    color: "rgba(255,255,255,0.28)",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 8,
  },
  emptyUploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FE2C55",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 4,
  },
  emptyUploadText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },

  // Sparkle decorations
  sparkle1: { position: "absolute", top: "15%", left: "10%", fontSize: 22, opacity: 0.6 },
  sparkle2: { position: "absolute", top: "20%", right: "12%", fontSize: 18, opacity: 0.5 },
  sparkle3: { position: "absolute", bottom: "30%", left: "8%", fontSize: 18, opacity: 0.4 },
  sparkle4: { position: "absolute", bottom: "25%", right: "10%", fontSize: 22, opacity: 0.5 },
});
