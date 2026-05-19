import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

interface SettingRowProps {
  icon: string;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
  colors: ReturnType<typeof useColors>;
}

function SettingRow({ icon, label, subtitle, onPress, rightElement, danger, colors }: SettingRowProps) {
  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.65}
      disabled={!onPress && !rightElement}
    >
      <View style={[styles.rowIcon, { backgroundColor: danger ? "rgba(254,44,85,0.12)" : colors.muted }]}>
        <Feather name={icon as any} size={18} color={danger ? colors.primary : colors.foreground} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: danger ? colors.primary : colors.foreground }]}>{label}</Text>
        {!!subtitle && <Text style={[styles.rowSubtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>}
      </View>
      {rightElement ?? (
        onPress ? <Feather name="chevron-right" size={18} color={colors.mutedForeground} /> : null
      )}
    </TouchableOpacity>
  );
}

function SectionHeader({ title, colors }: { title: string; colors: ReturnType<typeof useColors> }) {
  return (
    <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>{title}</Text>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const router = useRouter();

  const [notifications, setNotifications] = useState(true);
  const [privateAccount, setPrivateAccount] = useState(false);
  const [downloadWithWatermark, setDownloadWithWatermark] = useState(true);
  const [dataSaver, setDataSaver] = useState(false);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const handleLogout = () => {
    if (Platform.OS === "web") {
      logout().then(() => router.replace("/login"));
      return;
    }
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Settings</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 80 }}
      >
        {/* Account */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.profileAvatar, { backgroundColor: "#FE2C55" }]}>
            <Text style={styles.profileAvatarText}>
              {(user?.displayName ?? "U")[0].toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: colors.foreground }]}>{user?.displayName}</Text>
            <Text style={[styles.profileUsername, { color: colors.mutedForeground }]}>{user?.username}</Text>
          </View>
          <TouchableOpacity
            style={[styles.manageBtn, { borderColor: colors.border }]}
            activeOpacity={0.75}
          >
            <Text style={[styles.manageBtnText, { color: colors.foreground }]}>Manage</Text>
          </TouchableOpacity>
        </View>

        <SectionHeader title="ACCOUNT" colors={colors} />
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow icon="user" label="Edit profile" subtitle="Name, bio, photo" onPress={() => {}} colors={colors} />
          <SettingRow icon="lock" label="Privacy" subtitle="Account, interactions" onPress={() => {}} colors={colors} />
          <SettingRow icon="bell" label="Push notifications"
            rightElement={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: colors.muted, true: colors.primary }}
                thumbColor="#fff"
              />
            }
            colors={colors}
          />
          <SettingRow icon="eye-off" label="Private account"
            rightElement={
              <Switch
                value={privateAccount}
                onValueChange={setPrivateAccount}
                trackColor={{ false: colors.muted, true: colors.primary }}
                thumbColor="#fff"
              />
            }
            colors={colors}
          />
        </View>

        <SectionHeader title="CONTENT & DISPLAY" colors={colors} />
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow icon="film" label="Content preferences" onPress={() => {}} colors={colors} />
          <SettingRow icon="download" label="Downloads with watermark"
            rightElement={
              <Switch
                value={downloadWithWatermark}
                onValueChange={setDownloadWithWatermark}
                trackColor={{ false: colors.muted, true: colors.primary }}
                thumbColor="#fff"
              />
            }
            colors={colors}
          />
          <SettingRow icon="wifi" label="Data saver"
            subtitle="Reduces video quality on mobile data"
            rightElement={
              <Switch
                value={dataSaver}
                onValueChange={setDataSaver}
                trackColor={{ false: colors.muted, true: colors.primary }}
                thumbColor="#fff"
              />
            }
            colors={colors}
          />
          <SettingRow icon="globe" label="Language" subtitle="English" onPress={() => {}} colors={colors} />
        </View>

        <SectionHeader title="SUPPORT" colors={colors} />
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow icon="help-circle" label="Help & Support" onPress={() => {}} colors={colors} />
          <SettingRow icon="shield" label="Safety Center" onPress={() => {}} colors={colors} />
          <SettingRow icon="info" label="About" subtitle="Version 1.0.0" onPress={() => {}} colors={colors} />
        </View>

        <SectionHeader title="" colors={colors} />
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow icon="log-out" label="Sign Out" onPress={handleLogout} danger colors={colors} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  profileCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  profileAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarText: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  profileName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  profileUsername: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  manageBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  manageBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  sectionHeader: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
  },
  section: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  rowSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
