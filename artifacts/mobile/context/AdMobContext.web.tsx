import React, { createContext, useContext } from "react";

interface AdConfig {
  enabled: boolean;
  androidAppId: string;
  iosAppId: string;
  interstitialAndroidUnitId: string;
  interstitialIosUnitId: string;
  nativeAndroidUnitId: string;
  nativeIosUnitId: string;
  appOpenAndroidUnitId: string;
  appOpenIosUnitId: string;
  interstitialFrequency: number;
  interstitialCooldownSeconds: number;
  nativeAdInterval: number;
}

const DEFAULT_CONFIG: AdConfig = {
  enabled: false,
  androidAppId: "",
  iosAppId: "",
  interstitialAndroidUnitId: "",
  interstitialIosUnitId: "",
  nativeAndroidUnitId: "",
  nativeIosUnitId: "",
  appOpenAndroidUnitId: "",
  appOpenIosUnitId: "",
  interstitialFrequency: 3,
  interstitialCooldownSeconds: 30,
  nativeAdInterval: 5,
};

interface AdMobContextValue {
  adConfig: AdConfig;
  showInterstitial: () => Promise<void>;
  nativeAdUnitId: string | null;
}

const AdMobContext = createContext<AdMobContextValue>({
  adConfig: DEFAULT_CONFIG,
  showInterstitial: async () => {},
  nativeAdUnitId: null,
});

export function AdMobProvider({ children }: { children: React.ReactNode }) {
  return (
    <AdMobContext.Provider
      value={{ adConfig: DEFAULT_CONFIG, showInterstitial: async () => {}, nativeAdUnitId: null }}
    >
      {children}
    </AdMobContext.Provider>
  );
}

export function useAdMob(): AdMobContextValue {
  return useContext(AdMobContext);
}
