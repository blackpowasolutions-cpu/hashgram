import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");
const CARD_W = Math.min(width - 48, 340);
const CARD_H = CARD_W * 0.6;

export interface GiftCardPrize {
  type: string;
  value: string;
  code: string;
  color: string;
  icon: string;
}

export const PRIZES: GiftCardPrize[] = [
  { type: "Amazon", value: "$5 Gift Card", code: "AMZN-X4K2-9PLQ", color: "#FF9900", icon: "shopping-bag" },
  { type: "Starbucks", value: "$10 Gift Card", code: "SBUX-7M3N-2RWV", color: "#00704A", icon: "coffee" },
  { type: "Google Play", value: "$15 Credit", code: "GPLAY-9KX4-1MZQ", color: "#4285F4", icon: "play-circle" },
  { type: "Apple Store", value: "$20 Gift Card", code: "AAPL-3XK9-7WPM", color: "#555555", icon: "smartphone" },
  { type: "Netflix", value: "1 Month Free", code: "NFLX-2RQP-8LXV", color: "#E50914", icon: "tv" },
  { type: "Reels Premium", value: "Pro Upgrade", code: "REEL-PRO-FREETRIAL", color: "#FE2C55", icon: "star" },
];

interface Props {
  visible: boolean;
  prize: GiftCardPrize;
  reelTitle: string;
  onClose: () => void;
}

const NUM_PARTICLES = 20;

export default function ScratchCard({ visible, prize, reelTitle, onClose }: Props) {
  const scratchProgress = useRef(new Animated.Value(0)).current;
  const revealAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const [isRevealed, setIsRevealed] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const totalDrag = useRef(0);
  const particles = useRef(
    Array.from({ length: NUM_PARTICLES }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (visible) {
      scratchProgress.setValue(0);
      revealAnim.setValue(0);
      shakeAnim.setValue(0);
      setIsRevealed(false);
      setIsDone(false);
      totalDrag.current = 0;
      startShimmer();
    }
  }, [visible]);

  const startShimmer = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  };

  const triggerReveal = () => {
    if (isRevealed) return;
    setIsRevealed(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.timing(scratchProgress, {
      toValue: 1,
      duration: 400,
      useNativeDriver: false,
    }).start();

    Animated.timing(revealAnim, {
      toValue: 1,
      duration: 600,
      delay: 200,
      useNativeDriver: true,
    }).start(() => {
      setIsDone(true);
      launchParticles();
    });
  };

  const launchParticles = () => {
    const animations = particles.map((p) => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 80 + Math.random() * 120;
      p.x.setValue(0);
      p.y.setValue(0);
      p.opacity.setValue(1);
      p.scale.setValue(0);
      return Animated.parallel([
        Animated.timing(p.x, { toValue: Math.cos(angle) * dist, duration: 700, useNativeDriver: true }),
        Animated.timing(p.y, { toValue: Math.sin(angle) * dist - 40, duration: 700, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(p.scale, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(p.scale, { toValue: 0, duration: 500, delay: 200, useNativeDriver: true }),
        ]),
        Animated.timing(p.opacity, { toValue: 0, duration: 700, delay: 300, useNativeDriver: true }),
      ]);
    });
    Animated.stagger(30, animations).start();
  };

  const SCRATCH_FULL = Platform.OS === "web" ? 150 : 250;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: (_, gs) => {
        const dist = Math.sqrt(gs.dx * gs.dx + gs.dy * gs.dy);
        totalDrag.current = Math.min(totalDrag.current + Math.abs(gs.vx) + Math.abs(gs.vy), SCRATCH_FULL);
        const progress = totalDrag.current / SCRATCH_FULL;
        scratchProgress.setValue(progress);
        if (progress >= 1) {
          triggerReveal();
        } else if (progress > 0.3) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      },
      onPanResponderRelease: () => {
        if (totalDrag.current / SCRATCH_FULL >= 0.8) {
          triggerReveal();
        }
      },
    })
  ).current;

  const overlayOpacity = scratchProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const prizeScale = revealAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.8, 1.05, 1],
  });

  const shimmerX = shakeAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, -6, 0, 6, 0],
  });

  const PARTICLE_COLORS = ["#FFD700", "#FE2C55", "#25F4EE", "#FFFFFF", "#FF9900", "#6BCB77"];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerIcon}>
              <Text style={styles.trophy}>🎁</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Scratch Card Unlocked!</Text>
              <Text style={styles.headerSub} numberOfLines={1}>
                "{reelTitle}" reached 100 plays
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.closeBtn}>
              <Feather name="x" size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          {/* Card area */}
          <View style={[styles.cardWrap, { width: CARD_W, height: CARD_H }]}>
            {/* Prize underneath */}
            <Animated.View
              style={[styles.prizeCard, { backgroundColor: prize.color, transform: [{ scale: prizeScale }] }]}
            >
              <Feather name={prize.icon as any} size={36} color="rgba(255,255,255,0.9)" />
              <Text style={styles.prizeType}>{prize.type}</Text>
              <Text style={styles.prizeValue}>{prize.value}</Text>
              {isDone && (
                <View style={styles.codeBox}>
                  <Text style={styles.codeLabel}>Redemption Code</Text>
                  <Text style={styles.code}>{prize.code}</Text>
                </View>
              )}
            </Animated.View>

            {/* Scratch overlay */}
            <Animated.View
              style={[styles.scratchOverlay, { opacity: overlayOpacity }]}
              {...(!isRevealed ? panResponder.panHandlers : {})}
            >
              {/* Silver texture rows */}
              {Array.from({ length: 6 }).map((_, row) => (
                <View key={row} style={styles.scratchRow}>
                  {Array.from({ length: 8 }).map((_, col) => (
                    <View
                      key={col}
                      style={[
                        styles.scratchCell,
                        { backgroundColor: (row + col) % 2 === 0 ? "#C0C0C0" : "#ADADAD" },
                      ]}
                    />
                  ))}
                </View>
              ))}
              <View style={[styles.scratchHintRow, { pointerEvents: "none" }]}>
                <Animated.View style={{ transform: [{ translateX: shimmerX }] }}>
                  <Text style={styles.scratchHint}>← SCRATCH HERE →</Text>
                </Animated.View>
              </View>
            </Animated.View>

            {/* Confetti particles */}
            {particles.map((p, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.particle,
                  {
                    backgroundColor: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
                    transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.scale }],
                    opacity: p.opacity,
                  },
                ]}
              />
            ))}
          </View>

          {/* Progress hint */}
          {!isRevealed && (
            <View style={styles.progressHint}>
              <Text style={styles.progressText}>Drag your finger across the card to reveal your prize</Text>
              <TouchableOpacity onPress={triggerReveal} style={styles.skipBtn} activeOpacity={0.75}>
                <Text style={styles.skipBtnText}>Tap to Reveal</Text>
              </TouchableOpacity>
            </View>
          )}

          {isDone && (
            <View style={styles.doneActions}>
              <Text style={styles.congrats}>🎉 Congratulations!</Text>
              <Text style={styles.congratsNote}>
                Screenshot your code — it can be redeemed once configured in the admin panel.
              </Text>
              <TouchableOpacity style={styles.closeFullBtn} onPress={onClose} activeOpacity={0.85}>
                <Text style={styles.closeFullBtnText}>Awesome, close!</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.82)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  sheet: {
    backgroundColor: "#111",
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "#2C2C2C",
    gap: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(254,44,85,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  trophy: { fontSize: 22 },
  headerTitle: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  headerSub: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#222",
    alignItems: "center",
    justifyContent: "center",
  },
  cardWrap: {
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
    elevation: 12,
  },
  prizeCard: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: 20,
  },
  prizeType: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 6,
  },
  prizeValue: {
    color: "#fff",
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  codeBox: {
    marginTop: 8,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
    gap: 2,
  },
  codeLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  code: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  scratchOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "column",
  },
  scratchRow: {
    flex: 1,
    flexDirection: "row",
  },
  scratchCell: {
    flex: 1,
  },
  scratchHintRow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  scratchHint: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    textShadow: "0 1px 4px rgba(0,0,0,0.5)",
  },
  particle: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    top: "50%",
    left: "50%",
  },
  progressHint: {
    alignItems: "center",
    gap: 10,
    width: "100%",
  },
  progressText: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  skipBtn: {
    backgroundColor: "#FE2C55",
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  skipBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  doneActions: {
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
  congrats: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  congratsNote: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
  closeFullBtn: {
    backgroundColor: "#222",
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#333",
    marginTop: 4,
  },
  closeFullBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
