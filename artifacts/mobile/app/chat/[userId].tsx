import { Feather } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import {
  CONTACTS,
  ChatMessage,
  useMessages,
} from "@/context/MessagesContext";
import { useColors } from "@/hooks/useColors";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMsgTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Read receipt icon ────────────────────────────────────────────────────────

function StatusIcon({
  status,
  color,
}: {
  status: ChatMessage["status"];
  color: string;
}) {
  if (status === "sending") {
    return <ActivityIndicator size={10} color={color} />;
  }
  if (status === "sent") {
    return <Feather name="check" size={11} color={color} />;
  }
  if (status === "delivered") {
    return (
      <View style={{ flexDirection: "row" }}>
        <Feather name="check" size={11} color={color} />
        <Feather name="check" size={11} color={color} style={{ marginLeft: -5 }} />
      </View>
    );
  }
  // read — blue double tick
  return (
    <View style={{ flexDirection: "row" }}>
      <Feather name="check" size={11} color="#4D96FF" />
      <Feather name="check" size={11} color="#4D96FF" style={{ marginLeft: -5 }} />
    </View>
  );
}

// ─── Audio player ─────────────────────────────────────────────────────────────

function AudioPlayer({
  uri,
  duration,
  isMine,
  colors,
}: {
  uri: string;
  duration?: number;
  isMine: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const total = duration ?? 0;

  const toggle = useCallback(async () => {
    if (Platform.OS === "web") return;
    if (playing) {
      await soundRef.current?.pauseAsync();
      if (intervalRef.current) clearInterval(intervalRef.current);
      setPlaying(false);
    } else {
      if (!soundRef.current) {
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true },
          (status) => {
            if (!status.isLoaded) return;
            if (status.didJustFinish) {
              setPlaying(false);
              setElapsed(0);
              if (intervalRef.current) clearInterval(intervalRef.current);
            }
          }
        );
        soundRef.current = sound;
      } else {
        await soundRef.current.playAsync();
      }
      setPlaying(true);
      intervalRef.current = setInterval(() => {
        setElapsed((e) => Math.min(e + 1, total));
      }, 1000);
    }
  }, [playing, uri, total]);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const progress = total > 0 ? elapsed / total : 0;
  const bubbleBg = isMine ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.06)";

  return (
    <View style={[styles.audioPlayer, { backgroundColor: bubbleBg }]}>
      <TouchableOpacity onPress={toggle} style={styles.audioBtn}>
        <Feather
          name={playing ? "pause" : "play"}
          size={18}
          color={isMine ? "#fff" : colors.foreground}
        />
      </TouchableOpacity>
      <View style={styles.audioBody}>
        <View style={[styles.audioTrack, { backgroundColor: isMine ? "rgba(255,255,255,0.35)" : colors.border }]}>
          <View
            style={[
              styles.audioFill,
              {
                width: `${progress * 100}%` as `${number}%`,
                backgroundColor: isMine ? "#fff" : "#FE2C55",
              },
            ]}
          />
        </View>
        <Text style={[styles.audioDur, { color: isMine ? "rgba(255,255,255,0.75)" : colors.mutedForeground }]}>
          {formatDuration(playing ? elapsed : total)}
        </Text>
      </View>
      <Feather name="mic" size={13} color={isMine ? "rgba(255,255,255,0.6)" : colors.mutedForeground} />
    </View>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  isMine,
  colors,
}: {
  msg: ChatMessage;
  isMine: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  const bg = isMine ? "#FE2C55" : colors.card;
  const textColor = isMine ? "#fff" : colors.foreground;
  const metaColor = isMine ? "rgba(255,255,255,0.65)" : colors.mutedForeground;

  const bubbleRadius: object = {
    borderRadius: 18,
    borderTopLeftRadius: isMine ? 18 : 4,
    borderTopRightRadius: isMine ? 4 : 18,
  };

  return (
    <View style={[styles.msgRow, isMine ? styles.msgRowMine : styles.msgRowTheirs]}>
      <View
        style={[
          styles.bubble,
          bubbleRadius as object,
          { backgroundColor: bg },
          msg.type === "image" || msg.type === "video" ? styles.bubbleMedia : null,
        ]}
      >
        {/* ── Text ── */}
        {msg.type === "text" && (
          <Text style={[styles.bubbleText, { color: textColor }]}>{msg.content}</Text>
        )}

        {/* ── Image ── */}
        {msg.type === "image" && (
          <Image
            source={{ uri: msg.content }}
            style={styles.bubbleImg}
            resizeMode="cover"
          />
        )}

        {/* ── Video ── */}
        {msg.type === "video" && (
          <View style={styles.videoWrap}>
            <Image
              source={{
                uri: msg.metadata?.thumbnail ?? `https://picsum.photos/seed/${msg.id}/400/300`,
              }}
              style={styles.bubbleImg}
              resizeMode="cover"
            />
            <View style={styles.videoPlayOverlay}>
              <View style={styles.videoPlayBtn}>
                <Feather name="play" size={22} color="#fff" />
              </View>
              {msg.metadata?.duration != null && (
                <Text style={styles.videoDur}>
                  {formatDuration(msg.metadata.duration)}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* ── Audio ── */}
        {msg.type === "audio" && (
          <AudioPlayer
            uri={msg.content}
            duration={msg.metadata?.duration}
            isMine={isMine}
            colors={colors}
          />
        )}

        {/* ── Document ── */}
        {msg.type === "document" && (
          <View style={styles.docRow}>
            <View style={[styles.docIcon, { backgroundColor: isMine ? "rgba(255,255,255,0.2)" : colors.muted }]}>
              <Feather name="file-text" size={22} color={isMine ? "#fff" : "#FE2C55"} />
            </View>
            <View style={styles.docInfo}>
              <Text
                style={[styles.docName, { color: textColor }]}
                numberOfLines={2}
              >
                {msg.metadata?.filename ?? msg.content}
              </Text>
              {msg.metadata?.size != null && (
                <Text style={[styles.docSize, { color: metaColor }]}>
                  {formatFileSize(msg.metadata.size)}
                </Text>
              )}
            </View>
            <Feather name="download" size={16} color={isMine ? "rgba(255,255,255,0.7)" : colors.mutedForeground} />
          </View>
        )}

        {/* ── Meta (time + status) ── */}
        <View style={[styles.msgMeta, isMine ? styles.msgMetaMine : null]}>
          <Text style={[styles.msgTime, { color: metaColor }]}>
            {formatMsgTime(msg.timestamp)}
          </Text>
          {isMine && <StatusIcon status={msg.status} color="rgba(255,255,255,0.7)" />}
        </View>
      </View>
    </View>
  );
}

// ─── Typing bubble ────────────────────────────────────────────────────────────

function TypingBubble({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.msgRowTheirs}>
      <View style={[styles.bubble, styles.typingBubble, { backgroundColor: colors.card }]}>
        <Text style={[styles.typingDots, { color: colors.mutedForeground }]}>
          • • •
        </Text>
      </View>
    </View>
  );
}

// ─── Recording overlay ────────────────────────────────────────────────────────

function RecordingOverlay({
  elapsed,
  colors,
}: {
  elapsed: number;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.recordingBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      <View style={styles.recordingDot} />
      <Text style={[styles.recordingTime, { color: colors.foreground }]}>
        {formatDuration(elapsed)} · Recording…
      </Text>
      <Text style={[styles.recordingHint, { color: colors.mutedForeground }]}>
        Release to send
      </Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { messages, onlineUsers, typingUsers, sendMessage, markRead, setTyping } = useMessages();

  const contact = useMemo(() => CONTACTS.find((c) => c.id === userId), [userId]);
  const thread = useMemo(
    () => (userId ? (messages[userId] ?? []) : []),
    [messages, userId]
  );
  const isOnline = onlineUsers.has(userId ?? "");
  const isTyping = typingUsers.has(userId ?? "");

  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<FlatList<ChatMessage | "typing">>(null);

  // Mark as read on open
  useEffect(() => {
    if (userId) markRead(userId);
  }, [userId, markRead, thread.length]);

  // ── Typing indicator ──────────────────────────────────────────────────────
  const handleTextChange = useCallback(
    (val: string) => {
      setText(val);
      if (!userId) return;
      setTyping(userId, true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        setTyping(userId, false);
      }, 2000);
    },
    [userId, setTyping]
  );

  // ── Send text ─────────────────────────────────────────────────────────────
  const handleSendText = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || !userId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMessage(userId, "text", trimmed);
    setText("");
    setTyping(userId, false);
  }, [text, userId, sendMessage, setTyping]);

  // ── Pick image / video ────────────────────────────────────────────────────
  const handlePickImage = useCallback(async () => {
    if (!userId) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      sendMessage(userId, "image", result.assets[0].uri);
    }
  }, [userId, sendMessage]);

  const handlePickVideo = useCallback(async () => {
    if (!userId) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      videoMaxDuration: 60,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      sendMessage(userId, "video", asset.uri, {
        duration: Math.round(asset.duration ?? 0),
        filename: asset.fileName ?? "video.mp4",
      });
    }
  }, [userId, sendMessage]);

  // ── Pick document ─────────────────────────────────────────────────────────
  const handlePickDoc = useCallback(async () => {
    if (!userId) return;
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      sendMessage(userId, "document", asset.name, {
        filename: asset.name,
        size: asset.size ?? 0,
      });
    }
  }, [userId, sendMessage]);

  // ── Attach sheet ──────────────────────────────────────────────────────────
  const handleAttach = useCallback(() => {
    Keyboard.dismiss();
    Haptics.selectionAsync();
    // Simple inline picker for demo — on native you could use ActionSheet
    if (Platform.OS === "web") {
      handlePickImage();
      return;
    }
    // We'll just cycle: image → video → document in a simple prompt simulation
    handlePickImage();
  }, [handlePickImage]);

  // ── Voice recording ───────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (Platform.OS === "web") return;
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordSecs(0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      recordTimerRef.current = setInterval(() => {
        setRecordSecs((s) => s + 1);
      }, 1000);
    } catch {
      // Permissions denied or unavailable
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current || !userId) return;
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      if (uri && recordSecs >= 1) {
        sendMessage(userId, "audio", uri, { duration: recordSecs });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {}
    recordingRef.current = null;
    setIsRecording(false);
    setRecordSecs(0);
  }, [userId, recordSecs, sendMessage]);

  const cancelRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    try {
      await recordingRef.current.stopAndUnloadAsync();
    } catch {}
    recordingRef.current = null;
    setIsRecording(false);
    setRecordSecs(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  if (!contact) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>Contact not found</Text>
      </View>
    );
  }

  const topPad = insets.top;
  const bottomPad = insets.bottom;

  // Combine thread + typing indicator
  const listData: Array<ChatMessage | "typing"> = isTyping
    ? (["typing" as const, ...thread] as Array<ChatMessage | "typing">).reverse()
    : ([...thread] as Array<ChatMessage | "typing">).reverse();

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* ── Header ── */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 8,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>

        <View style={styles.headerAvatarWrap}>
          <View style={[styles.headerAvatar, { backgroundColor: contact.avatarColor }]}>
            <Text style={styles.headerAvatarText}>{contact.displayName[0]}</Text>
          </View>
          {isOnline && <View style={styles.headerOnlineDot} />}
        </View>

        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: colors.foreground }]} numberOfLines={1}>
            {contact.displayName}
          </Text>
          <Text style={[styles.headerStatus, { color: isOnline ? "#4CAF50" : colors.mutedForeground }]}>
            {isOnline ? "Online" : contact.username}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionBtn}>
            <Feather name="video" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionBtn}>
            <Feather name="phone" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Messages ── */}
      <FlatList
        ref={listRef}
        data={listData}
        keyExtractor={(item, i) =>
          typeof item === "string" ? "typing" : item.id + i
        }
        inverted
        renderItem={({ item }) => {
          if (item === "typing") {
            return <TypingBubble colors={colors} />;
          }
          const isMine =
            item.fromId === user?.id || item.fromId === "me";
          return <MessageBubble msg={item} isMine={isMine} colors={colors} />;
        }}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12 }}
        showsVerticalScrollIndicator={false}
      />

      {/* ── Recording overlay ── */}
      {isRecording && (
        <RecordingOverlay elapsed={recordSecs} colors={colors} />
      )}

      {/* ── Input bar ── */}
      {!isRecording && (
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              paddingBottom: bottomPad + 8,
            },
          ]}
        >
          {/* Attach */}
          <TouchableOpacity onPress={handleAttach} style={styles.inputAction}>
            <Feather name="paperclip" size={22} color={colors.mutedForeground} />
          </TouchableOpacity>

          {/* Text input */}
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              {
                color: colors.foreground,
                backgroundColor: colors.muted,
                borderColor: colors.border,
              },
            ]}
            placeholder="Message…"
            placeholderTextColor={colors.mutedForeground}
            value={text}
            onChangeText={handleTextChange}
            multiline
            maxLength={2000}
            returnKeyType="default"
          />

          {/* Send or Mic */}
          {text.trim().length > 0 ? (
            <TouchableOpacity
              onPress={handleSendText}
              style={styles.sendBtn}
              activeOpacity={0.8}
            >
              <Feather name="send" size={20} color="#fff" />
            </TouchableOpacity>
          ) : (
            <Pressable
              onLongPress={startRecording}
              onPressOut={stopRecording}
              style={({ pressed }) => [
                styles.micBtn,
                { backgroundColor: pressed ? "#FE2C55" : colors.muted },
              ]}
              delayLongPress={200}
            >
              <Feather
                name="mic"
                size={20}
                color={Platform.OS === "web" ? colors.mutedForeground : colors.foreground}
              />
            </Pressable>
          )}
        </View>
      )}

      {/* Recording: cancel + send */}
      {isRecording && (
        <View
          style={[
            styles.recordingActions,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              paddingBottom: bottomPad + 8,
            },
          ]}
        >
          <TouchableOpacity onPress={cancelRecording} style={styles.recCancel}>
            <Feather name="x" size={22} color="#FE2C55" />
            <Text style={[styles.recCancelText, { color: "#FE2C55" }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={stopRecording} style={styles.recSend}>
            <Feather name="send" size={18} color="#fff" />
            <Text style={styles.recSendText}>Send</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  headerBack: { padding: 4 },
  headerAvatarWrap: { position: "relative" },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  headerOnlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: "#4CAF50",
    borderWidth: 2,
    borderColor: "#fff",
  },
  headerInfo: { flex: 1 },
  headerName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  headerStatus: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  headerActions: { flexDirection: "row", gap: 4 },
  headerActionBtn: { padding: 6 },

  // Messages
  msgRow: {
    marginBottom: 4,
    maxWidth: "80%",
  },
  msgRowMine: {
    alignSelf: "flex-end",
  },
  msgRowTheirs: {
    alignSelf: "flex-start",
  },
  bubble: {
    padding: 10,
    gap: 4,
  },
  bubbleMedia: {
    padding: 3,
  },
  bubbleText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },
  bubbleImg: {
    width: 220,
    height: 220,
    borderRadius: 14,
  },
  videoWrap: {
    position: "relative",
  },
  videoPlayOverlay: {
    position: "absolute",
    inset: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.28)",
    borderRadius: 14,
  },
  videoPlayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  videoDur: {
    position: "absolute",
    bottom: 8,
    right: 10,
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  audioPlayer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 180,
  },
  audioBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  audioBody: { flex: 1, gap: 4 },
  audioTrack: {
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
  },
  audioFill: {
    height: 3,
    borderRadius: 2,
  },
  audioDur: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 200,
  },
  docIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  docInfo: { flex: 1 },
  docName: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    lineHeight: 18,
  },
  docSize: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  msgMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    alignSelf: "flex-start",
  },
  msgMetaMine: { alignSelf: "flex-end" },
  msgTime: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },

  // Typing
  typingBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  typingDots: {
    fontSize: 18,
    letterSpacing: 2,
    fontFamily: "Inter_700Bold",
  },

  // Input bar
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  inputAction: {
    paddingBottom: 10,
    paddingHorizontal: 2,
  },
  input: {
    flex: 1,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingTop: Platform.OS === "ios" ? 10 : 8,
    paddingBottom: Platform.OS === "ios" ? 10 : 8,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    maxHeight: 120,
    lineHeight: 20,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FE2C55",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },

  // Recording
  recordingBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FE2C55",
  },
  recordingTime: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  recordingHint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  recordingActions: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  recCancel: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FE2C55",
  },
  recCancelText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  recSend: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#FE2C55",
  },
  recSendText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
