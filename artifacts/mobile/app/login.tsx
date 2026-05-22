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

const { width } = Dimensions.get("window");

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await login(email.trim().toLowerCase(), password);
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/(tabs)");
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(result.error ?? "Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  };

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
      <View style={[styles.content, {
        paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
        paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0),
      }]}>
        <View style={styles.logoRow}>
          <Text style={styles.logoText}>HashGram</Text>
          <Text style={styles.tagline}>Share your world</Text>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.inputWrap}>
            <Feather name="mail" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
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
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={styles.googleBtn} activeOpacity={0.8}>
          <Feather name="globe" size={18} color="#fff" />
          <Text style={styles.googleBtnText}>Continue with Google</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => router.push("/register" as any)} activeOpacity={0.7}>
            <Text style={styles.footerLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

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
    marginVertical: 20,
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
  googleBtn: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  googleBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
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
});
