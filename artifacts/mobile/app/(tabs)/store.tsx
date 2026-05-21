import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  LEVEL_THRESHOLDS,
  getUserLevel,
  useStore,
} from "@/context/StoreContext";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const API_BASE_STORE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

interface ApiGiftCard {
  id: number;
  brand: string;
  category: string;
  value: string;
  pointsCost: number;
  minLevel: number;
  gradient: [string, string];
  emoji: string;
  description: string;
}

const { width } = Dimensions.get("window");
const CARD_W = (width - 16 * 2 - 10) / 2;

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Category = "All" | "Gaming" | "Food" | "Entertainment" | "Shopping" | "Travel";

const CATEGORIES: { label: Category; emoji: string }[] = [
  { label: "All", emoji: "✨" },
  { label: "Gaming", emoji: "🎮" },
  { label: "Food", emoji: "🍔" },
  { label: "Entertainment", emoji: "🎬" },
  { label: "Shopping", emoji: "🛍️" },
  { label: "Travel", emoji: "✈️" },
];

function formatPoints(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();
}

// ─── Level Badge ──────────────────────────────────────────────────────────────

function LevelBadge({ level, size = "md" }: { level: number; size?: "sm" | "md" | "lg" }) {
  const info = LEVEL_THRESHOLDS.find((t) => t.level === level) ?? LEVEL_THRESHOLDS[0];
  const medals = ["🥉", "🥈", "🥇", "🏅", "💎"];
  const sizes = { sm: 12, md: 14, lg: 18 };
  const pads = { sm: [2, 6], md: [3, 8], lg: [4, 12] };

  return (
    <View
      style={[
        styles.levelBadge,
        {
          backgroundColor: info.color + "22",
          borderColor: info.color + "66",
          paddingVertical: pads[size][0],
          paddingHorizontal: pads[size][1],
        },
      ]}
    >
      <Text style={{ fontSize: sizes[size] }}>{medals[level - 1]}</Text>
      <Text style={[styles.levelBadgeText, { color: info.color, fontSize: sizes[size] }]}>
        Lv {level} {info.label}
      </Text>
    </View>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function LevelProgress({ points }: { points: number }) {
  const current = getUserLevel(points);
  const nextIdx = LEVEL_THRESHOLDS.findIndex((t) => t.level === current.level) + 1;
  const nextLevel = nextIdx < LEVEL_THRESHOLDS.length ? LEVEL_THRESHOLDS[nextIdx] : null;

  const progress = nextLevel
    ? Math.min(1, (points - current.minPoints) / (nextLevel.minPoints - current.minPoints))
    : 1;

  const colors = useColors();

  return (
    <View style={styles.progressWrap}>
      <View style={styles.progressRow}>
        <LevelBadge level={current.level} size="sm" />
        {nextLevel && (
          <Text style={[styles.progressHint, { color: colors.mutedForeground }]}>
            {(nextLevel.minPoints - points).toLocaleString()} pts to Lv {nextLevel.level}
          </Text>
        )}
        {!nextLevel && (
          <Text style={[styles.progressHint, { color: current.color }]}>Max level reached! 💎</Text>
        )}
      </View>
      <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
        <Animated.View
          style={[
            styles.progressFill,
            { width: `${Math.round(progress * 100)}%` as any, backgroundColor: current.color },
          ]}
        />
      </View>
    </View>
  );
}

// ─── Gift Card Tile ───────────────────────────────────────────────────────────

function GiftCardTile({
  card,
  userLevel,
  userPoints,
  isRedeemed,
  onPress,
}: {
  card: ApiGiftCard;
  userLevel: number;
  userPoints: number;
  isRedeemed: boolean;
  onPress: () => void;
}) {
  const locked = userLevel < card.minLevel;
  const canAfford = userPoints >= card.pointsCost;
  const levelInfo = LEVEL_THRESHOLDS.find((t) => t.level === card.minLevel)!;

  return (
    <TouchableOpacity
      style={[styles.cardTile, locked && styles.cardTileLocked]}
      onPress={onPress}
      activeOpacity={locked ? 0.9 : 0.8}
    >
      <LinearGradient colors={card.gradient} style={styles.cardGradient}>
        {/* Lock overlay */}
        {locked && (
          <View style={styles.lockOverlay}>
            <View style={[styles.lockBadge, { borderColor: levelInfo.color + "88" }]}>
              <Feather name="lock" size={14} color={levelInfo.color} />
              <Text style={[styles.lockText, { color: levelInfo.color }]}>
                Lv {card.minLevel}+
              </Text>
            </View>
          </View>
        )}

        {/* Redeemed overlay */}
        {isRedeemed && !locked && (
          <View style={styles.redeemedOverlay}>
            <View style={styles.redeemedBadge}>
              <Feather name="check-circle" size={16} color="#4CAF50" />
              <Text style={styles.redeemedText}>Claimed</Text>
            </View>
          </View>
        )}

        {/* Emoji */}
        <Text style={styles.cardEmoji}>{card.emoji}</Text>

        {/* Brand + value */}
        <View style={{ flex: 1 }} />
        <Text style={styles.cardBrand} numberOfLines={1}>{card.brand}</Text>
        <Text style={styles.cardValue}>{card.value}</Text>

        {/* Points cost */}
        <View
          style={[
            styles.cardCost,
            {
              backgroundColor: locked
                ? "rgba(255,255,255,0.1)"
                : canAfford
                ? "rgba(255,255,255,0.2)"
                : "rgba(255,100,100,0.3)",
            },
          ]}
        >
          <Text style={[styles.cardCostText, !canAfford && !locked && { color: "#FF8A80" }]}>
            {formatPoints(card.pointsCost)} pts
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── Redeem Modal ─────────────────────────────────────────────────────────────

type ModalState =
  | { phase: "confirm"; card: ApiGiftCard }
  | { phase: "success"; card: ApiGiftCard; code: string }
  | null;

function RedeemModal({
  state,
  userPoints,
  onConfirm,
  onClose,
}: {
  state: ModalState;
  userPoints: number;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (state) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 200, friction: 18, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [!!state]);

  if (!state) return null;

  const { card } = state;
  const afterBalance = userPoints - card.pointsCost;

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={state.phase === "success" ? onClose : undefined}>
        <Animated.View
          style={[
            styles.modalSheet,
            { backgroundColor: colors.card, transform: [{ scale: scaleAnim }], opacity: opacityAnim },
          ]}
        >
          {/* Gradient header */}
          <LinearGradient colors={card.gradient} style={styles.modalHeader}>
            <Text style={styles.modalEmoji}>{card.emoji}</Text>
            <Text style={styles.modalBrand}>{card.brand}</Text>
            <Text style={styles.modalValue}>{card.value} Gift Card</Text>
          </LinearGradient>

          <View style={styles.modalBody}>
            {state.phase === "confirm" ? (
              <>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  Confirm Redemption
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
                  {card.description}
                </Text>

                {/* Cost breakdown */}
                <View style={[styles.costBreakdown, { backgroundColor: colors.muted }]}>
                  <View style={styles.costRow}>
                    <Text style={[styles.costLabel, { color: colors.mutedForeground }]}>Your balance</Text>
                    <Text style={[styles.costValue, { color: colors.foreground }]}>
                      {userPoints.toLocaleString()} pts
                    </Text>
                  </View>
                  <View style={styles.costRow}>
                    <Text style={[styles.costLabel, { color: colors.mutedForeground }]}>Cost</Text>
                    <Text style={[styles.costValue, { color: "#FF6B6B" }]}>
                      − {card.pointsCost.toLocaleString()} pts
                    </Text>
                  </View>
                  <View style={[styles.costDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.costRow}>
                    <Text style={[styles.costLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                      Remaining
                    </Text>
                    <Text style={[styles.costValue, { color: afterBalance >= 0 ? "#4CAF50" : "#FF6B6B", fontFamily: "Inter_700Bold" }]}>
                      {afterBalance.toLocaleString()} pts
                    </Text>
                  </View>
                </View>

                {afterBalance < 0 && (
                  <Text style={styles.insufficientText}>
                    You need {(-afterBalance).toLocaleString()} more points to redeem this card.
                  </Text>
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.cancelBtn, { borderColor: colors.border }]}
                    onPress={onClose}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.confirmBtn, { opacity: afterBalance < 0 ? 0.5 : 1 }]}
                    onPress={afterBalance >= 0 ? onConfirm : undefined}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={card.gradient}
                      style={styles.confirmBtnGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text style={styles.confirmBtnText}>Redeem Now</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                {/* Success state */}
                <View style={styles.successIcon}>
                  <Feather name="check-circle" size={48} color="#4CAF50" />
                </View>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  Redeemed! 🎉
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
                  Your {card.brand} {card.value} gift card is ready. Use this code at checkout:
                </Text>

                {/* Code display */}
                <View style={[styles.codeBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Text style={[styles.codeText, { color: colors.foreground }]}>{state.code}</Text>
                  <TouchableOpacity style={styles.copyBtn} activeOpacity={0.7}>
                    <Feather name="copy" size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.codeNote, { color: colors.mutedForeground }]}>
                  This code is also saved in your Claimed tab. It expires in 12 months.
                </Text>

                <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.8}>
                  <Text style={styles.doneBtnText}>Done</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function StoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userPoints, deductPoints, recordPurchase, getRedemption } = useStore();
  const { token } = useAuth();

  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [modalState, setModalState] = useState<ModalState>(null);
  const [activeTab, setActiveTab] = useState<"store" | "claimed">("store");
  const [apiCards, setApiCards] = useState<ApiGiftCard[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const levelInfo = getUserLevel(userPoints);

  const fetchCards = useCallback(async () => {
    setRefreshing(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${API_BASE_STORE}/store/cards`, { headers });
      if (res.ok) {
        const data = await res.json();
        setApiCards(
          (data ?? []).map((c: any): ApiGiftCard => ({
            id: c.id,
            brand: c.brand,
            category: c.category,
            value: c.value,
            pointsCost: c.pointsCost,
            minLevel: c.minLevel,
            gradient: [c.gradientFrom ?? "#333", c.gradientTo ?? "#111"] as [string, string],
            emoji: c.emoji ?? "🎁",
            description: c.description ?? "",
          }))
        );
      }
    } catch {}
    setRefreshing(false);
  }, [token]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const filteredCards = useMemo(() => {
    if (activeCategory === "All") return apiCards;
    return apiCards.filter((c) => c.category === activeCategory);
  }, [activeCategory, apiCards]);

  const claimedCards = useMemo(
    () => apiCards.filter((c) => !!getRedemption(String(c.id))),
    [apiCards, getRedemption]
  );

  const handleCardPress = (card: ApiGiftCard) => {
    const userLvl = levelInfo.level;
    if (userLvl < card.minLevel) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (getRedemption(String(card.id))) {
      const rec = getRedemption(String(card.id))!;
      setModalState({ phase: "success", card, code: rec.code });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setModalState({ phase: "confirm", card });
  };

  const handleConfirm = async () => {
    if (!modalState || modalState.phase !== "confirm") return;
    const card = modalState.card as ApiGiftCard;
    if (!token || userPoints < card.pointsCost) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setModalState(null);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_STORE}/store/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ giftCardId: card.id }),
      });
      if (!res.ok) throw new Error("Purchase failed");
      const data = await res.json();
      recordPurchase(
        String(card.id),
        data.code,
        data.createdAt ?? new Date().toISOString(),
        card.pointsCost
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalState({ phase: "success", card: modalState.card, code: data.code });
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setModalState(null);
    }
  };

  // ── Sub-header (level + points) ──
  const SubHeader = () => (
    <View style={[styles.subHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      {/* Points balance */}
      <LinearGradient
        colors={["#FE2C5511", "#FE2C5522"]}
        style={styles.balanceCard}
      >
        <Text style={[styles.balanceLabel, { color: colors.mutedForeground }]}>Your Points</Text>
        <Text style={[styles.balanceValue, { color: colors.foreground }]}>
          {userPoints.toLocaleString()}
        </Text>
        <LevelProgress points={userPoints} />
      </LinearGradient>

      {/* Level breakdown mini-row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.levelRow}
      >
        {LEVEL_THRESHOLDS.map((t) => {
          const unlocked = levelInfo.level >= t.level;
          return (
            <View
              key={t.level}
              style={[
                styles.levelChip,
                {
                  backgroundColor: unlocked ? t.color + "22" : colors.muted,
                  borderColor: unlocked ? t.color + "66" : colors.border,
                },
              ]}
            >
              <Text style={[styles.levelChipNum, { color: unlocked ? t.color : colors.mutedForeground }]}>
                {["🥉", "🥈", "🥇", "🏅", "💎"][t.level - 1]} Lv {t.level}
              </Text>
              <Text style={[styles.levelChipLabel, { color: unlocked ? t.color : colors.mutedForeground }]}>
                {t.level < 5 ? `${(t.minPoints / 1000).toFixed(0)}K pts` : "10K+"}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );

  // ── Store tab contents ──
  const StoreContent = () => (
    <>
      {/* Category pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.categoryBar, { backgroundColor: colors.background }]}
      >
        {CATEGORIES.map((cat) => {
          const active = activeCategory === cat.label;
          return (
            <TouchableOpacity
              key={cat.label}
              style={[
                styles.categoryPill,
                {
                  backgroundColor: active ? "#FE2C55" : colors.muted,
                  borderColor: active ? "#FE2C55" : colors.border,
                },
              ]}
              onPress={() => setActiveCategory(cat.label)}
              activeOpacity={0.7}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text style={[styles.categoryLabel, { color: active ? "#fff" : colors.mutedForeground }]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Card grid */}
      <FlatList
        data={filteredCards}
        keyExtractor={(c) => String(c.id)}
        numColumns={2}
        columnWrapperStyle={styles.cardRow}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 100 }}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <GiftCardTile
            card={item}
            userLevel={levelInfo.level}
            userPoints={userPoints}
            isRedeemed={!!getRedemption(String(item.id))}
            onPress={() => handleCardPress(item)}
          />
        )}
        ListFooterComponent={() => (
          <View style={[styles.backendNote, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="server" size={14} color={colors.mutedForeground} />
            <Text style={[styles.backendNoteText, { color: colors.mutedForeground }]}>
              Card availability & pricing is managed from the admin backend
            </Text>
          </View>
        )}
      />
    </>
  );

  // ── Claimed tab contents ──
  const ClaimedContent = () => (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 100 }}>
      {claimedCards.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🎁</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No cards claimed yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            Redeem gift cards from the Store tab to see them here.
          </Text>
        </View>
      ) : (
        claimedCards.map((card) => {
          const rec = getRedemption(String(card.id))!;
          const date = new Date(rec.redeemedAt).toLocaleDateString();
          return (
            <TouchableOpacity
              key={card.id}
              style={[styles.claimedRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setModalState({ phase: "success", card: card as ApiGiftCard, code: rec.code })}
              activeOpacity={0.8}
            >
              <LinearGradient colors={card.gradient} style={styles.claimedIcon}>
                <Text style={{ fontSize: 22 }}>{card.emoji}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[styles.claimedBrand, { color: colors.foreground }]}>
                  {card.brand} {card.value}
                </Text>
                <Text style={[styles.claimedCode, { color: colors.mutedForeground }]}>
                  {rec.code}
                </Text>
                <Text style={[styles.claimedDate, { color: colors.mutedForeground }]}>
                  Redeemed {date}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Page header */}
      <View style={[styles.pageHeader, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Gift Store</Text>
        <LevelBadge level={levelInfo.level} size="md" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchCards}
            colors={["#FE2C55"]}
          />
        }
      >
        <SubHeader />

        {/* Store / Claimed tabs */}
        <View style={[styles.tabRow, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          {(["store", "claimed"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, activeTab === t && styles.tabBtnActive]}
              onPress={() => setActiveTab(t)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  { color: activeTab === t ? "#FE2C55" : colors.mutedForeground },
                ]}
              >
                {t === "store" ? "🛍️ Store" : `🎁 Claimed${claimedCards.length ? ` (${claimedCards.length})` : ""}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === "store" ? <StoreContent /> : <ClaimedContent />}
      </ScrollView>

      <RedeemModal
        state={modalState}
        userPoints={userPoints}
        onConfirm={handleConfirm}
        onClose={() => setModalState(null)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

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

  // Level badge
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  levelBadgeText: {
    fontFamily: "Inter_700Bold",
  },

  // Sub-header
  subHeader: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 12,
  },
  balanceCard: {
    margin: 12,
    marginBottom: 8,
    borderRadius: 14,
    padding: 14,
    gap: 2,
  },
  balanceLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  balanceValue: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  progressWrap: {
    marginTop: 8,
    gap: 5,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  progressBar: {
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: 5,
    borderRadius: 3,
  },
  levelRow: {
    paddingHorizontal: 12,
    gap: 8,
  },
  levelChip: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    gap: 2,
  },
  levelChipNum: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  levelChipLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },

  // Tabs
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabBtnActive: {
    borderBottomColor: "#FE2C55",
  },
  tabBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },

  // Category bar
  categoryBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  categoryEmoji: { fontSize: 14 },
  categoryLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },

  // Card tile
  cardRow: { gap: 10, marginBottom: 10 },
  cardTile: {
    width: CARD_W,
    height: CARD_W * 1.35,
    borderRadius: 16,
    overflow: "hidden",
  },
  cardTileLocked: {
    opacity: 0.75,
  },
  cardGradient: {
    flex: 1,
    padding: 12,
  },
  cardEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  cardBrand: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  cardValue: {
    color: "#fff",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginBottom: 6,
  },
  cardCost: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cardCostText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },

  // Lock overlay
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  lockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  lockText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },

  // Redeemed overlay
  redeemedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  redeemedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  redeemedText: {
    color: "#4CAF50",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },

  // Backend note
  backendNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginTop: 8,
  },
  backendNoteText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },

  // Claimed list
  claimedRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  claimedIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  claimedBrand: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  claimedCode: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1,
    marginBottom: 2,
  },
  claimedDate: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 10,
  },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    maxWidth: 260,
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalSheet: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 24,
    overflow: "hidden",
  },
  modalHeader: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 20,
    gap: 4,
  },
  modalEmoji: { fontSize: 48, marginBottom: 6 },
  modalBrand: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  modalValue: {
    color: "#fff",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  modalBody: {
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },

  // Cost breakdown
  costBreakdown: {
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  costRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  costLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  costValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  costDivider: {
    height: 1,
  },

  insufficientText: {
    color: "#FF6B6B",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },

  // Modal buttons
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  confirmBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    overflow: "hidden",
  },
  confirmBtnGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },

  // Success state
  successIcon: {
    alignItems: "center",
    marginVertical: 8,
  },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  codeText: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: 3,
    textAlign: "center",
  },
  copyBtn: {
    padding: 4,
  },
  codeNote: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 17,
  },
  doneBtn: {
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  doneBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
});
