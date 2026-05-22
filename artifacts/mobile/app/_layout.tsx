import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/context/AuthContext";
import { MessagesProvider } from "@/context/MessagesContext";
import { RewardConfigProvider } from "@/context/RewardConfigContext";
import { AdMobProvider } from "@/context/AdMobContext";
import { SocialProvider } from "@/context/SocialContext";
import { StoreProvider } from "@/context/StoreContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="register" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="messages" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="chat/[userId]" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="user/[userId]" options={{ headerShown: false, animation: "slide_from_right" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <RewardConfigProvider>
                <AdMobProvider>
                  <AuthProvider>
                    <SocialProvider>
                      <StoreProvider>
                        <MessagesProvider>
                          <RootLayoutNav />
                        </MessagesProvider>
                      </StoreProvider>
                    </SocialProvider>
                  </AuthProvider>
                </AdMobProvider>
              </RewardConfigProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
