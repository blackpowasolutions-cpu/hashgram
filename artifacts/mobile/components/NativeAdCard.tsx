import React, { useEffect, useRef, useState } from "react";
import { Dimensions, Platform, StyleSheet, Text, View } from "react-native";

const { height } = Dimensions.get("window");

interface Props {
  unitId: string;
  bottomPad: number;
}

// ─── Native ad wrapper (native platforms only) ────────────────────────────────

function NativeAdNative({ unitId, bottomPad }: Props) {
  const [AdComponents, setAdComponents] = useState<{
    NativeAdView: React.ComponentType<any>;
    HeadlineView: React.ComponentType<any>;
    DescriptionView: React.ComponentType<any>;
    CallToActionView: React.ComponentType<any>;
    ImageView: React.ComponentType<any>;
    NativeMediaView: React.ComponentType<any>;
    useNativeAd: () => { isLoaded: boolean };
  } | null>(null);

  useEffect(() => {
    try {
      const m = require("react-native-google-mobile-ads");
      if (m.NativeAdView) {
        setAdComponents({
          NativeAdView: m.NativeAdView,
          HeadlineView: m.HeadlineView,
          DescriptionView: m.DescriptionView,
          CallToActionView: m.CallToActionView,
          ImageView: m.ImageView,
          NativeMediaView: m.NativeMediaView,
          useNativeAd: m.useNativeAd,
        });
      }
    } catch {}
  }, []);

  if (!AdComponents) return <AdPlaceholder bottomPad={bottomPad} />;

  return (
    <AdComponents.NativeAdView
      adUnitId={unitId}
      style={[styles.container, { height }]}
    >
      <AdCardContent AdComponents={AdComponents} bottomPad={bottomPad} />
    </AdComponents.NativeAdView>
  );
}

function AdCardContent({ AdComponents, bottomPad }: { AdComponents: NonNullable<any>; bottomPad: number }) {
  const { isLoaded } = AdComponents.useNativeAd();

  if (!isLoaded) return <AdPlaceholder bottomPad={bottomPad} />;

  return (
    <View style={[styles.container, { height, paddingBottom: bottomPad + 80 }]}>
      <View style={styles.adBadge}>
        <Text style={styles.adBadgeText}>Ad</Text>
      </View>

      <AdComponents.NativeMediaView style={styles.mediaView} />

      <View style={styles.overlay}>
        <AdComponents.HeadlineView style={styles.headline} />
        <AdComponents.DescriptionView style={styles.description} numberOfLines={2} />
        <AdComponents.CallToActionView style={styles.ctaBtn}>
          <Text style={styles.ctaBtnText}>Learn More</Text>
        </AdComponents.CallToActionView>
      </View>
    </View>
  );
}

// ─── Placeholder for web / unavailable ───────────────────────────────────────

function AdPlaceholder({ bottomPad }: { bottomPad: number }) {
  return (
    <View style={[styles.container, { height, backgroundColor: "#0a0a12", paddingBottom: bottomPad + 80 }]}>
      <View style={styles.adBadge}>
        <Text style={styles.adBadgeText}>Ad</Text>
      </View>
      <View style={styles.placeholderCenter}>
        <Text style={styles.placeholderIcon}>📱</Text>
        <Text style={styles.placeholderTitle}>Sponsored</Text>
        <Text style={styles.placeholderSub}>Advertisement</Text>
      </View>
    </View>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function NativeAdCard({ unitId, bottomPad }: Props) {
  if (Platform.OS === "web") {
    return <AdPlaceholder bottomPad={bottomPad} />;
  }
  return <NativeAdNative unitId={unitId} bottomPad={bottomPad} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#050510",
    justifyContent: "flex-end",
  },
  adBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    zIndex: 10,
  },
  adBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  mediaView: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
    gap: 6,
  },
  headline: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  description: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  ctaBtn: {
    alignSelf: "flex-start",
    marginTop: 8,
    backgroundColor: "#FE2C55",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  ctaBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  placeholderCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  placeholderIcon: {
    fontSize: 52,
  },
  placeholderTitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
  },
  placeholderSub: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
});
