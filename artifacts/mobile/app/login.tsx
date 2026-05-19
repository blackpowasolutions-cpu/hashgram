import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
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
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Please enter your username and password");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const success = await login(username, password);
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/(tabs)");
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError("Invalid credentials. Try any username/password.");
      }
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#000",
    },
    bg: {
      ...StyleSheet.absoluteFillObject,
      opacity: 0.35,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.6)",
    },
    content: {
      flex: 1,
      paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
      paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0),
      paddingHorizontal: 28,
      justifyContent: "flex-end",
    },
    logoRow: {
      alignItems: "center",
      marginBottom: 40,
    },
    logoText: {
      fontSize: 42,
      fontWeight: "900" as const,
      color: "#fff",
      letterSpacing: -1,
      fontFamily: "Inter_700Bold",
    },
    tagline: {
      fontSize: 14,
      color: "rgba(255,255,255,0.5)",
      marginTop: 4,
      fontFamily: "Inter_400Regular",
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    inputGroup: {
      gap: 12,
      marginBottom: 16,
    },
    inputWrap: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.08)",
      borderRadius: 14,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.12)",
      paddingHorizontal: 16,
      height: 54,
    },
    inputIcon: {
      marginRight: 10,
    },
    input: {
      flex: 1,
      color: "#fff",
      fontSize: 16,
      fontFamily: "Inter_400Regular",
    },
    error: {
      color: "#FE2C55",
      fontSize: 13,
      textAlign: "center",
      marginBottom: 12,
      fontFamily: "Inter_400Regular",
    },
    loginBtn: {
      backgroundColor: "#FE2C55",
      borderRadius: 14,
      height: 54,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
    },
    loginBtnText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "700" as const,
      fontFamily: "Inter_700Bold",
      letterSpacing: 0.3,
    },
    divider: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 24,
      gap: 12,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: "rgba(255,255,255,0.15)",
    },
    dividerText: {
      color: "rgba(255,255,255,0.4)",
      fontSize: 12,
      fontFamily: "Inter_400Regular",
    },
    socialRow: {
      flexDirection: "row",
      gap: 12,
      justifyContent: "center",
    },
    socialBtn: {
      flex: 1,
      height: 52,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.15)",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },
    socialBtnText: {
      color: "#fff",
      fontSize: 14,
      fontFamily: "Inter_500Medium",
    },
    footer: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: 28,
      marginBottom: 8,
      gap: 6,
    },
    footerText: {
      color: "rgba(255,255,255,0.45)",
      fontSize: 14,
      fontFamily: "Inter_400Regular",
    },
    footerLink: {
      color: "#FE2C55",
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
    },
    hint: {
      color: "rgba(255,255,255,0.3)",
      fontSize: 11,
      textAlign: "center",
      marginTop: 8,
      fontFamily: "Inter_400Regular",
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Image
        source={require("../assets/images/reel1.png")}
        style={styles.bg}
        resizeMode="cover"
      />
      <View style={styles.overlay} />
      <View style={styles.content}>
        <View style={styles.logoRow}>
          <Text style={styles.logoText}>Reels</Text>
          <Text style={styles.tagline}>Share your world</Text>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.inputWrap}>
            <Feather name="user" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Username or email"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>
          <View style={styles.inputWrap}>
            <Feather name="lock" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <Pressable onPress={() => setShowPassword((v) => !v)}>
              <Feather name={showPassword ? "eye-off" : "eye"} size={18} color="rgba(255,255,255,0.4)" />
            </Pressable>
          </View>
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={styles.loginBtn}
          onPress={handleLogin}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginBtnText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialRow}>
          <TouchableOpacity style={styles.socialBtn} activeOpacity={0.7} onPress={handleLogin}>
            <Feather name="phone" size={18} color="#fff" />
            <Text style={styles.socialBtnText}>Phone</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialBtn} activeOpacity={0.7} onPress={handleLogin}>
            <Feather name="mail" size={18} color="#fff" />
            <Text style={styles.socialBtnText}>Email</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <TouchableOpacity onPress={handleLogin}>
            <Text style={styles.footerLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>Tip: use any username + password to sign in</Text>
      </View>
    </KeyboardAvoidingView>
  );
}
