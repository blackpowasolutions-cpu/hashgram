import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";

const { width, height } = Dimensions.get("window");

interface Reel {
  id: string;
  user: string;
  displayName: string;
  description: string;
  likes: number;
  comments: number;
  shares: number;
  image: ImageSourcePropType;
  music: string;
  avatarColor: string;
}

const REELS: Reel[] = [
  {
    id: "1",
    user: "@dancequeen",
    displayName: "Dance Queen",
    description: "New choreography drop! This took 3 weeks to perfect 🔥 #dance #fyp #trending",
    likes: 482000,
    comments: 12030,
    shares: 8920,
    image: require("../../assets/images/reel1.png"),
    music: "Original Sound - dancequeen",
    avatarColor: "#FF6B9D",
  },
  {
    id: "2",
    user: "@streetfoodking",
    displayName: "Street Food King",
    description: "Secret recipe my grandma taught me 👨‍🍳 The best noodles you'll ever taste #food #cooking",
    likes: 271000,
    comments: 5400,
    shares: 3100,
    image: require("../../assets/images/reel2.png"),
    music: "Cooking Vibes - lofi beats",
    avatarColor: "#FF8C42",
  },
  {
    id: "3",
    user: "@sk8er_pro",
    displayName: "Sk8er Pro",
    description: "Landed this trick after 200 tries 🛹 Never give up on your dreams #skateboarding #sports",
    likes: 893000,
    comments: 23100,
    shares: 15600,
    image: require("../../assets/images/reel3.png"),
    music: "Skateboarding Mix - punk radio",
    avatarColor: "#6BCB77",
  },
  {
    id: "4",
    user: "@wanderlust",
    displayName: "Wanderlust",
    description: "Found this hidden spot after 6 hours of hiking 🏔️ Worth every step #travel #adventure",
    likes: 1200000,
    comments: 31000,
    shares: 22000,
    image: require("../../assets/images/reel4.png"),
    music: "Mountain Air - ambient sounds",
    avatarColor: "#4D96FF",
  },
  {
    id: "5",
    user: "@stylequeen",
    displayName: "Style Queen",
    description: "GRWM for my coffee date ☕ Outfit details in bio! #fashion #ootd #style",
    likes: 567000,
    comments: 18200,
    shares: 9800,
    image: require("../../assets/images/reel5.png"),
    music: "Aesthetic Vibes - chill playlist",
    avatarColor: "#C77DFF",
  },
];

function formatCount(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

function ReelItem({ item, isVisible }: { item: Reel; isVisible: boolean }) {
  const insets = useSafeAreaInsets();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(item.likes);
  const [heartVisible, setHeartVisible] = useState(false);
  const lastTap = useRef(0);

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

  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <Pressable style={[styles.reel, { height }]} onPress={handleDoubleTap}>
      <Image source={item.image} style={styles.reelBg} resizeMode="cover" />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.5)", "rgba(0,0,0,0.92)"]}
        locations={[0.4, 0.7, 1]}
        style={[styles.gradient, { pointerEvents: "none" }]}
      />

      {heartVisible && (
        <View style={styles.heartOverlay} pointerEvents="none">
          <Feather name="heart" size={80} color="#FE2C55" />
        </View>
      )}

      {/* Right actions */}
      <View style={[styles.actions, { bottom: bottomPad + 80 }]}>
        <View style={[styles.avatarWrap, { backgroundColor: item.avatarColor }]}>
          <Text style={styles.avatarText}>{item.displayName[0]}</Text>
        </View>
        <View style={styles.plusBadge}>
          <Feather name="plus" size={12} color="#fff" />
        </View>

        <View style={{ height: 20 }} />

        <TouchableOpacity style={styles.actionBtn} onPress={handleLike} activeOpacity={0.7}>
          <Feather name="heart" size={30} color={liked ? "#FE2C55" : "#fff"} />
          <Text style={styles.actionCount}>{formatCount(likeCount)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
          <Feather name="message-circle" size={28} color="#fff" />
          <Text style={styles.actionCount}>{formatCount(item.comments)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
          <Feather name="share-2" size={26} color="#fff" />
          <Text style={styles.actionCount}>{formatCount(item.shares)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
          <Feather name="more-horizontal" size={26} color="#fff" />
        </TouchableOpacity>

        <View style={styles.musicDisc}>
          <View style={[styles.discInner, { backgroundColor: item.avatarColor }]}>
            <Feather name="music" size={14} color="#fff" />
          </View>
        </View>
      </View>

      {/* Bottom info */}
      <View style={[styles.info, { paddingBottom: bottomPad + 80 }]}>
        <Text style={styles.username}>{item.user}</Text>
        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
        <View style={styles.musicRow}>
          <Feather name="music" size={12} color="#fff" />
          <Text style={styles.musicText} numberOfLines={1}>{item.music}</Text>
        </View>
      </View>
    </Pressable>
  );
}

import { Platform } from "react-native";

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const [visibleId, setVisibleId] = useState<string>(REELS[0].id);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].item) {
        setVisibleId(viewableItems[0].item.id);
      }
    },
    []
  );

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 });

  return (
    <View style={styles.container}>
      {/* Header overlay */}
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8) }]}>
        <TouchableOpacity activeOpacity={0.7}>
          <Text style={styles.headerTab}>Following</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7}>
          <Text style={[styles.headerTab, styles.headerTabActive]}>For You</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7}>
          <Feather name="search" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={REELS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ReelItem item={item} isVisible={item.id === visibleId} />
        )}
        pagingEnabled
        snapToInterval={height}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        scrollEnabled={REELS.length > 0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 20,
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
  reel: {
    width,
    backgroundColor: "#000",
  },
  reelBg: {
    ...StyleSheet.absoluteFillObject,
    width,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heartOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  actions: {
    position: "absolute",
    right: 12,
    alignItems: "center",
    gap: 4,
    zIndex: 5,
  },
  avatarWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  plusBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FE2C55",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -14,
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
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  musicDisc: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 3,
    borderColor: "#333",
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  discInner: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    position: "absolute",
    left: 14,
    right: 72,
    bottom: 0,
    zIndex: 5,
    gap: 6,
  },
  username: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  description: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  musicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  musicText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
});
