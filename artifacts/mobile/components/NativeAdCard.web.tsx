import React from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";

const { height } = Dimensions.get("window");

interface Props {
  unitId: string;
  bottomPad: number;
}

export default function NativeAdCard({ bottomPad }: Props) {
  return (
    <View style={[styles.container, { height, backgroundColor: "#0a0a12", paddingBottom: bottomPad + 80 }]}>
      <View style={styles.adBadge}>
        <Text style={styles.adBadgeText}>Ad</Text>
      </View>
      <View style={styles.center}>
        <Text style={styles.icon}>📱</Text>
        <Text style={styles.title}>Sponsored</Text>
        <Text style={styles.sub}>Advertisement</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
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
    letterSpacing: 0.5,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  icon: {
    fontSize: 52,
  },
  title: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 20,
  },
  sub: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 13,
  },
});
