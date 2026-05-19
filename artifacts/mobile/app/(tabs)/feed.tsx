import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import type { User } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");

// ─── Reaction types ──────────────────────────────────────────────────────────

type ReactionType = "like" | "love" | "haha" | "wow" | "sad" | "angry";

interface Reaction {
  type: ReactionType;
  emoji: string;
  label: string;
  color: string;
}

const REACTIONS: Reaction[] = [
  { type: "like", emoji: "👍", label: "Like", color: "#1877F2" },
  { type: "love", emoji: "❤️", label: "Love", color: "#FE2C55" },
  { type: "haha", emoji: "😂", label: "Haha", color: "#F7B125" },
  { type: "wow", emoji: "😮", label: "Wow", color: "#F59F00" },
  { type: "sad", emoji: "😢", label: "Sad", color: "#F7B125" },
  { type: "angry", emoji: "😡", label: "Angry", color: "#E9710F" },
];

function getReaction(type: ReactionType | null): Reaction | null {
  return REACTIONS.find((r) => r.type === type) ?? null;
}

// ─── Post data ───────────────────────────────────────────────────────────────

interface PostUser {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
}

interface PostReactions {
  like: number;
  love: number;
  haha: number;
  wow: number;
  sad: number;
  angry: number;
}

interface Post {
  id: string;
  user: PostUser;
  content: string;
  image?: number | string;
  createdAt: string;
  reactions: PostReactions;
  userReaction: ReactionType | null;
  comments: number;
  shares: number;
}

const INITIAL_POSTS: Post[] = [
  {
    id: "1",
    user: { id: "2", username: "@sk8er_pro", displayName: "Sk8er Pro", avatarColor: "#6BCB77" },
    content: "Finally landed that trick I've been working on for 3 months 🛹 Hard work pays off! Who else grinds until they get it?",
    image: require("../../assets/images/reel3.png"),
    createdAt: "14 min ago",
    reactions: { like: 312, love: 45, haha: 0, wow: 89, sad: 0, angry: 0 },
    userReaction: null,
    comments: 38,
    shares: 12,
  },
  {
    id: "2",
    user: { id: "3", username: "@wanderlust", displayName: "Wanderlust", avatarColor: "#4D96FF" },
    content: "Reminder that you can change your mind, change your path, and change your life at any point. You're not too late. 🌍✨",
    createdAt: "1h ago",
    reactions: { like: 891, love: 234, haha: 5, wow: 67, sad: 8, angry: 0 },
    userReaction: null,
    comments: 104,
    shares: 87,
  },
  {
    id: "3",
    user: { id: "4", username: "@streetfoodking", displayName: "Street Food King", avatarColor: "#FF8C42" },
    content: "Made my grandma's secret noodle recipe tonight 🍜 Some things are just too good to keep to yourself. Recipe in the comments!",
    image: require("../../assets/images/reel2.png"),
    createdAt: "2h ago",
    reactions: { like: 543, love: 178, haha: 23, wow: 112, sad: 0, angry: 0 },
    userReaction: null,
    comments: 267,
    shares: 54,
  },
  {
    id: "4",
    user: { id: "5", username: "@stylequeen", displayName: "Style Queen", avatarColor: "#C77DFF" },
    content: "Today's outfit is giving main character energy 💜 Thrifted every single piece — total cost $14. Fashion doesn't have to be expensive.",
    image: require("../../assets/images/reel5.png"),
    createdAt: "3h ago",
    reactions: { like: 1204, love: 567, haha: 12, wow: 234, sad: 3, angry: 0 },
    userReaction: null,
    comments: 189,
    shares: 143,
  },
  {
    id: "5",
    user: { id: "6", username: "@techguru", displayName: "Tech Guru", avatarColor: "#25F4EE" },
    content: "Hot take: Social media isn't making us antisocial — it's just shifting where our social energy goes. What do you think? 🤔",
    createdAt: "5h ago",
    reactions: { like: 432, love: 21, haha: 67, wow: 43, sad: 12, angry: 89 },
    userReaction: null,
    comments: 312,
    shares: 78,
  },
  {
    id: "6",
    user: { id: "1", username: "@dancequeen", displayName: "Dance Queen", avatarColor: "#FF6B9D" },
    content: "Studio day ✨ The new choreo is 🔥 and I cannot wait for you all to see it. Keep your notifications on!",
    image: require("../../assets/images/reel1.png"),
    createdAt: "6h ago",
    reactions: { like: 782, love: 345, haha: 8, wow: 156, sad: 0, angry: 0 },
    userReaction: null,
    comments: 93,
    shares: 61,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCount(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

function totalReactions(r: PostReactions): number {
  return r.like + r.love + r.haha + r.wow + r.sad + r.angry;
}

function topReactions(r: PostReactions): ReactionType[] {
  const entries = Object.entries(r) as [ReactionType, number][];
  return entries
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);
}

// ─── Reaction Picker ─────────────────────────────────────────────────────────

function ReactionPicker({
  visible,
  onSelect,
  onDismiss,
}: {
  visible: boolean;
  onSelect: (type: ReactionType) => void;
  onDismiss: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 200,
        friction: 15,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss}>
      <Animated.View
        style={[
          styles.reactionPicker,
          { transform: [{ scale: scaleAnim }], transformOrigin: "bottom left" as any },
        ]}
      >
        {REACTIONS.map((r, i) => (
          <TouchableOpacity
            key={r.type}
            style={styles.reactionBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(r.type);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.reactionEmoji}>{r.emoji}</Text>
            <Text style={[styles.reactionLabel, { color: r.color }]}>{r.label}</Text>
          </TouchableOpacity>
        ))}
      </Animated.View>
    </Pressable>
  );
}

// ─── Post Card ───────────────────────────────────────────────────────────────

function PostCard({
  post,
  onReact,
  colors,
}: {
  post: Post;
  onReact: (postId: string, reaction: ReactionType | null) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const likeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeReaction = getReaction(post.userReaction);
  const total = totalReactions(post.reactions);
  const tops = topReactions(post.reactions);

  const handleLikePress = () => {
    if (likeTimer.current) clearTimeout(likeTimer.current);
    if (post.userReaction) {
      onReact(post.id, null);
    } else {
      onReact(post.id, "like");
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleLikeLong = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setShowPicker(true);
  };

  const handleSelect = (type: ReactionType) => {
    setShowPicker(false);
    onReact(post.id, post.userReaction === type ? null : type);
  };

  const actionColor = activeReaction ? activeReaction.color : colors.mutedForeground;
  const actionLabel = activeReaction ? activeReaction.label : "Like";
  const actionEmoji = activeReaction ? activeReaction.emoji : null;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.cardAvatar, { backgroundColor: post.user.avatarColor }]}>
          <Text style={styles.cardAvatarText}>{post.user.displayName[0]}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardName, { color: colors.foreground }]}>{post.user.displayName}</Text>
          <View style={styles.cardMeta}>
            <Text style={[styles.cardTime, { color: colors.mutedForeground }]}>{post.createdAt}</Text>
            <Text style={[styles.cardTime, { color: colors.mutedForeground }]}>  ·  </Text>
            <Feather name="globe" size={11} color={colors.mutedForeground} />
          </View>
        </View>
        <TouchableOpacity activeOpacity={0.7} style={styles.cardMore}>
          <Feather name="more-horizontal" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <Text style={[styles.cardContent, { color: colors.foreground }]}>{post.content}</Text>

      {/* Image */}
      {post.image && (
        <Image
          source={typeof post.image === "string" ? { uri: post.image } : post.image}
          style={styles.cardImage}
          resizeMode="cover"
        />
      )}

      {/* Reaction summary */}
      {total > 0 && (
        <View style={[styles.reactionSummary, { borderBottomColor: colors.border }]}>
          <View style={styles.reactionSummaryLeft}>
            {tops.map((t) => {
              const r = getReaction(t)!;
              return (
                <Text key={t} style={styles.reactionSummaryEmoji}>{r.emoji}</Text>
              );
            })}
            <Text style={[styles.reactionSummaryCount, { color: colors.mutedForeground }]}>
              {formatCount(total)}
            </Text>
          </View>
          <View style={styles.reactionSummaryRight}>
            {post.comments > 0 && (
              <Text style={[styles.reactionSummaryCount, { color: colors.mutedForeground }]}>
                {formatCount(post.comments)} comments
              </Text>
            )}
            {post.shares > 0 && (
              <Text style={[styles.reactionSummaryCount, { color: colors.mutedForeground }]}>
                {formatCount(post.shares)} shares
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Action bar */}
      <View style={[styles.actionBar, { borderTopColor: colors.border }]}>
        {/* Like — long press to show picker */}
        <View style={{ position: "relative", flex: 1 }}>
          {showPicker && (
            <ReactionPicker
              visible={showPicker}
              onSelect={handleSelect}
              onDismiss={() => setShowPicker(false)}
            />
          )}
          <TouchableOpacity
            style={styles.actionBarBtn}
            onPress={handleLikePress}
            onLongPress={handleLikeLong}
            activeOpacity={0.7}
            delayLongPress={400}
          >
            {actionEmoji ? (
              <Text style={{ fontSize: 18 }}>{actionEmoji}</Text>
            ) : (
              <Feather name="thumbs-up" size={18} color={actionColor} />
            )}
            <Text style={[styles.actionBarLabel, { color: actionColor, fontFamily: post.userReaction ? "Inter_700Bold" : "Inter_500Medium" }]}>
              {actionLabel}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.actionBarBtn, { flex: 1 }]} activeOpacity={0.7}>
          <Feather name="message-square" size={18} color={colors.mutedForeground} />
          <Text style={[styles.actionBarLabel, { color: colors.mutedForeground }]}>Comment</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBarBtn, { flex: 1 }]} activeOpacity={0.7}>
          <Feather name="share" size={18} color={colors.mutedForeground} />
          <Text style={[styles.actionBarLabel, { color: colors.mutedForeground }]}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Create Post Modal ───────────────────────────────────────────────────────

function CreatePostModal({
  visible,
  onClose,
  onSubmit,
  user,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (content: string, image: string | null) => void;
  user: User | null;
  colors: ReturnType<typeof useColors>;
}) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
    }
  };

  const handlePost = () => {
    if (!text.trim() && !image) return;
    onSubmit(text.trim(), image);
    setText("");
    setImage(null);
    onClose();
  };

  const canPost = text.trim().length > 0 || !!image;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.createModal, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={[styles.createHeader, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8), borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Feather name="x" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.createTitle, { color: colors.foreground }]}>Create Post</Text>
          <TouchableOpacity
            onPress={handlePost}
            activeOpacity={0.75}
            disabled={!canPost}
            style={[styles.postBtn, { backgroundColor: canPost ? "#1877F2" : colors.muted }]}
          >
            <Text style={[styles.postBtnText, { color: canPost ? "#fff" : colors.mutedForeground }]}>Post</Text>
          </TouchableOpacity>
        </View>

        {/* User info */}
        <View style={styles.createUser}>
          <View style={[styles.createAvatar, { backgroundColor: "#FE2C55" }]}>
            <Text style={styles.createAvatarText}>{(user?.displayName ?? "U")[0]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.createName, { color: colors.foreground }]}>{user?.displayName}</Text>
            <TouchableOpacity
              style={[styles.audienceBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <Feather name="globe" size={12} color={colors.mutedForeground} />
              <Text style={[styles.audienceBtnText, { color: colors.mutedForeground }]}>Public</Text>
              <Feather name="chevron-down" size={12} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Text input */}
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          <TextInput
            style={[styles.createInput, { color: colors.foreground }]}
            placeholder="What's on your mind?"
            placeholderTextColor={colors.mutedForeground}
            multiline
            value={text}
            onChangeText={setText}
            autoFocus
          />

          {/* Image preview */}
          {image && (
            <View style={styles.imagePreviewWrap}>
              <Image source={{ uri: image }} style={styles.imagePreview} resizeMode="cover" />
              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={() => setImage(null)}
                activeOpacity={0.8}
              >
                <Feather name="x" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Toolbar */}
        <View style={[styles.createToolbar, { borderTopColor: colors.border, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) }]}>
          <Text style={[styles.addToPost, { color: colors.foreground }]}>Add to your post</Text>
          <View style={styles.toolbarActions}>
            <TouchableOpacity onPress={handlePickImage} activeOpacity={0.7} style={styles.toolbarBtn}>
              <Feather name="image" size={24} color="#4CAF50" />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} style={styles.toolbarBtn}>
              <Feather name="tag" size={24} color="#2196F3" />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} style={styles.toolbarBtn}>
              <Feather name="smile" size={24} color="#FF9800" />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} style={styles.toolbarBtn}>
              <Feather name="map-pin" size={24} color="#F44336" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function NewsFeedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [createVisible, setCreateVisible] = useState(false);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const handleReact = useCallback((postId: string, reaction: ReactionType | null) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const updated = { ...p, reactions: { ...p.reactions } };
        // Remove old reaction
        if (p.userReaction) {
          updated.reactions[p.userReaction] = Math.max(0, updated.reactions[p.userReaction] - 1);
        }
        // Add new reaction
        if (reaction) {
          updated.reactions[reaction] = updated.reactions[reaction] + 1;
        }
        updated.userReaction = reaction;
        return updated;
      })
    );
  }, []);

  const handleCreatePost = useCallback((content: string, image: string | null) => {
    const newPost: Post = {
      id: Date.now().toString(),
      user: {
        id: "me",
        username: user?.username ?? "@you",
        displayName: user?.displayName ?? "You",
        avatarColor: "#FE2C55",
      },
      content,
      image: image ?? undefined,
      createdAt: "Just now",
      reactions: { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
      userReaction: null,
      comments: 0,
      shares: 0,
    };
    setPosts((prev) => [newPost, ...prev]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [user]);

  const ListHeader = () => (
    <>
      {/* Page header */}
      <View style={[styles.pageHeader, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Feed</Text>
        <View style={styles.pageHeaderRight}>
          <TouchableOpacity style={[styles.headerIconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
            <Feather name="search" size={18} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.headerIconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
            <Feather name="bell" size={18} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Create post strip */}
      <View style={[styles.createStrip, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.createStripAvatar, { backgroundColor: "#FE2C55" }]}>
          <Text style={styles.createStripAvatarText}>{(user?.displayName ?? "U")[0]}</Text>
        </View>
        <TouchableOpacity
          style={[styles.createStripInput, { backgroundColor: colors.muted, borderColor: colors.border }]}
          onPress={() => setCreateVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.createStripPlaceholder, { color: colors.mutedForeground }]}>
            What's on your mind, {user?.displayName?.split(" ")[0] ?? "friend"}?
          </Text>
        </TouchableOpacity>
      </View>

      {/* Media strip */}
      <View style={[styles.mediaStrip, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity style={styles.mediaBtn} activeOpacity={0.7} onPress={() => setCreateVisible(true)}>
          <Feather name="video" size={18} color="#F44336" />
          <Text style={[styles.mediaBtnText, { color: colors.foreground }]}>Live video</Text>
        </TouchableOpacity>
        <View style={[styles.mediaDivider, { backgroundColor: colors.border }]} />
        <TouchableOpacity style={styles.mediaBtn} activeOpacity={0.7} onPress={() => setCreateVisible(true)}>
          <Feather name="image" size={18} color="#4CAF50" />
          <Text style={[styles.mediaBtnText, { color: colors.foreground }]}>Photo</Text>
        </TouchableOpacity>
        <View style={[styles.mediaDivider, { backgroundColor: colors.border }]} />
        <TouchableOpacity style={styles.mediaBtn} activeOpacity={0.7} onPress={() => setCreateVisible(true)}>
          <Feather name="smile" size={18} color="#FF9800" />
          <Text style={[styles.mediaBtnText, { color: colors.foreground }]}>Feeling</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.sectionDivider, { backgroundColor: colors.muted }]} />
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard post={item} onReact={handleReact} colors={colors} />
        )}
        ListHeaderComponent={ListHeader}
        ItemSeparatorComponent={() => (
          <View style={[styles.postSeparator, { backgroundColor: colors.muted }]} />
        )}
        ListFooterComponent={() => (
          <View style={{ height: bottomPad + 90 }} />
        )}
        showsVerticalScrollIndicator={false}
      />

      <CreatePostModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onSubmit={handleCreatePost}
        user={user}
        colors={colors}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Page header
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pageTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  pageHeaderRight: {
    flexDirection: "row",
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  // Create strip
  createStrip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  createStripAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  createStripAvatarText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  createStripInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  createStripPlaceholder: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },

  // Media strip
  mediaStrip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  mediaBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
  },
  mediaBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  mediaDivider: {
    width: 1,
    height: 24,
  },
  sectionDivider: {
    height: 8,
  },
  postSeparator: {
    height: 8,
  },

  // Post card
  card: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  cardAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  cardAvatarText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  cardName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 1,
  },
  cardTime: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  cardMore: {
    padding: 6,
  },
  cardContent: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  cardImage: {
    width: "100%",
    height: width * 0.65,
  },

  // Reaction summary
  reactionSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  reactionSummaryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  reactionSummaryEmoji: {
    fontSize: 14,
  },
  reactionSummaryCount: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginLeft: 4,
  },
  reactionSummaryRight: {
    flexDirection: "row",
    gap: 10,
  },

  // Action bar
  actionBar: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBarBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  actionBarLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },

  // Reaction picker
  reactionPicker: {
    position: "absolute",
    bottom: 44,
    left: 4,
    flexDirection: "row",
    backgroundColor: "#1C1C1C",
    borderRadius: 28,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
    zIndex: 100,
    borderWidth: 1,
    borderColor: "#2C2C2C",
    boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
    elevation: 16,
  },
  reactionBtn: {
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 2,
  },
  reactionEmoji: {
    fontSize: 26,
  },
  reactionLabel: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
  },

  // Create post modal
  createModal: {
    flex: 1,
  },
  createHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  createTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  postBtn: {
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  postBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  createUser: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  createAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  createAvatarText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  createName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  audienceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  audienceBtnText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  createInput: {
    fontSize: 18,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 16,
    paddingTop: 8,
    minHeight: 120,
    textAlignVertical: "top",
  },
  imagePreviewWrap: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  imagePreview: {
    width: "100%",
    height: 220,
  },
  removeImageBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  createToolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  addToPost: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  toolbarActions: {
    flexDirection: "row",
    gap: 8,
  },
  toolbarBtn: {
    padding: 6,
  },
});
