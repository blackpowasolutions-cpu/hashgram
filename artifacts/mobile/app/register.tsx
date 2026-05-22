import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
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

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    if (!displayName.trim() || !username.trim() || !email.trim() || !password) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, "").replace(/\s+/g, "");
    if (cleanUsername.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const result = await register(
        email.trim().toLowerCase(),
        cleanUsername,
        displayName.trim(),
        password
      );
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/(tabs)");
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(result.error ?? "Registration failed. Please try again.");
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
        source={require("../assets/images/reel2.png")}
        style={styles.bg}
        resizeMode="cover"
      />
      <View style={styles.overlay} />

      <ScrollView
        contentContainerStyle={[styles.content, {
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20),
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 24),
        }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.logoRow}>
            <Text style={styles.logoText}>HashGram</Text>
            <Text style={styles.tagline}>Create your account</Text>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.inputWrap}>
            <Feather name="user" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Display name"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          <View style={styles.inputWrap}>
            <Text style={styles.atSign}>@</Text>
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

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
              placeholder="Password (min 8 characters)"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              returnKeyType="next"
            />
            <Pressable onPress={() => setShowPassword((v) => !v)}>
              <Feather name={showPassword ? "eye-off" : "eye"} size={18} color="rgba(255,255,255,0.4)" />
            </Pressable>
          </View>

          <View style={styles.inputWrap}>
            <Feather name="lock" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm password"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleRegister}
            />
          </View>
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={styles.registerBtn}
          onPress={handleRegister}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.registerBtnText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.terms}>
          By creating an account you agree to our Terms of Service and Privacy Policy.
        </Text>
      </ScrollView>
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
    opacity: 0.25,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 28,
  },
  header: {
    marginBottom: 32,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  logoRow: {
    alignItems: "center",
  },
  logoText: {
    fontSize: 36,
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
    letterSpacing: 0.5,
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
  atSign: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    marginRight: 6,
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
  registerBtn: {
    backgroundColor: "#FE2C55",
    borderRadius: 14,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  registerBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
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
  terms: {
    color: "rgba(255,255,255,0.2)",
    fontSize: 11,
    textAlign: "center",
    marginTop: 16,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
});
