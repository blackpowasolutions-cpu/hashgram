import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  androidAppId: "ca-app-pub-3940256099942544~3347511713",
  iosAppId: "ca-app-pub-3940256099942544~1458002511",
  interstitialAndroidUnitId: "ca-app-pub-3940256099942544/1033173712",
  interstitialIosUnitId: "ca-app-pub-3940256099942544/4411468910",
  nativeAndroidUnitId: "ca-app-pub-3940256099942544/2247696110",
  nativeIosUnitId: "ca-app-pub-3940256099942544/3986624511",
  appOpenAndroidUnitId: "ca-app-pub-3940256099942544/9257395921",
  appOpenIosUnitId: "ca-app-pub-3940256099942544/5575463023",
  interstitialFrequency: 3,
  interstitialCooldownSeconds: 30,
  nativeAdInterval: 5,
};

interface AdMobContextValue {
  adConfig: AdConfig;
  showInterstitial: () => Promise<void>;
  nativeAdUnitId: string | null;
}

// ─── AdMob module loader (graceful fallback on web / Expo Go) ─────────────────

type AdMobModule = {
  InterstitialAd: {
    createForAdRequest: (
      unitId: string,
      opts?: object
    ) => { load: () => void; show: () => Promise<void>; loaded: boolean; addAdEventListener: (...a: any[]) => () => void };
  };
  AppOpenAd: {
    createForAdRequest: (
      unitId: string,
      opts?: object
    ) => { load: () => void; show: () => Promise<void>; loaded: boolean; addAdEventListener: (...a: any[]) => () => void };
  };
  AdEventType: { LOADED: string; ERROR: string; CLOSED: string };
  TestIds: { INTERSTITIAL: string; APP_OPEN: string; NATIVE: string };
};

let admobModule: AdMobModule | null = null;

function tryLoadAdMob(): AdMobModule | null {
  if (Platform.OS === "web") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const m = require("react-native-google-mobile-ads");
    admobModule = m;
    return m;
  } catch {
    return null;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AdMobContext = createContext<AdMobContextValue>({
  adConfig: DEFAULT_CONFIG,
  showInterstitial: async () => {},
  nativeAdUnitId: null,
});

export function AdMobProvider({ children }: { children: React.ReactNode }) {
  const [adConfig, setAdConfig] = useState<AdConfig>(DEFAULT_CONFIG);
  const actionCountRef = useRef(0);
  const lastShownRef = useRef(0);
  const interstitialRef = useRef<ReturnType<AdMobModule["InterstitialAd"]["createForAdRequest"]> | null>(null);
  const appOpenRef = useRef<ReturnType<AdMobModule["AppOpenAd"]["createForAdRequest"]> | null>(null);
  const adMob = useRef<AdMobModule | null>(null);

  // Fetch ad config from backend
  useEffect(() => {
    fetch(`${API_BASE}/ads/config`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setAdConfig({ ...DEFAULT_CONFIG, ...data });
      })
      .catch(() => {});
  }, []);

  // Load AdMob module once config is ready
  useEffect(() => {
    if (!adConfig.enabled) return;
    adMob.current = tryLoadAdMob();
  }, [adConfig.enabled]);

  // ── Interstitial loading helper ──────────────────────────────────────────────

  const loadInterstitial = useCallback(() => {
    const m = adMob.current;
    if (!m || !adConfig.enabled) return;
    const unitId =
      Platform.OS === "ios"
        ? adConfig.interstitialIosUnitId
        : adConfig.interstitialAndroidUnitId;
    try {
      const ad = m.InterstitialAd.createForAdRequest(unitId, { requestNonPersonalizedAdsOnly: true });
      let unsubscribeLoaded: (() => void) | null = null;
      let unsubscribeError: (() => void) | null = null;
      unsubscribeLoaded = ad.addAdEventListener(m.AdEventType.LOADED, () => {
        interstitialRef.current = ad;
        unsubscribeLoaded?.();
        unsubscribeError?.();
      });
      unsubscribeError = ad.addAdEventListener(m.AdEventType.ERROR, () => {
        interstitialRef.current = null;
        unsubscribeLoaded?.();
        unsubscribeError?.();
      });
      ad.load();
    } catch {}
  }, [adConfig]);

  // Preload first interstitial when module is ready
  useEffect(() => {
    if (adConfig.enabled && adMob.current) loadInterstitial();
  }, [adConfig.enabled, loadInterstitial]);

  // ── Show interstitial ────────────────────────────────────────────────────────

  const showInterstitial = useCallback(async () => {
    if (!adConfig.enabled) return;
    const m = adMob.current;
    if (!m) return;

    actionCountRef.current += 1;
    const freq = Math.max(1, adConfig.interstitialFrequency);
    if (actionCountRef.current % freq !== 0) return;

    const now = Date.now();
    const cooldownMs = adConfig.interstitialCooldownSeconds * 1000;
    if (now - lastShownRef.current < cooldownMs) return;

    const ad = interstitialRef.current;
    if (!ad || !ad.loaded) {
      loadInterstitial();
      return;
    }
    try {
      interstitialRef.current = null;
      lastShownRef.current = now;
      await ad.show();
    } catch {}

    // Preload next one
    loadInterstitial();
  }, [adConfig, loadInterstitial]);

  // ── App Open ads (foreground events) ────────────────────────────────────────

  useEffect(() => {
    if (!adConfig.enabled) return;
    const m = adMob.current;
    if (!m) return;

    const unitId =
      Platform.OS === "ios" ? adConfig.appOpenIosUnitId : adConfig.appOpenAndroidUnitId;

    let loadingInProgress = false;

    function loadAppOpen() {
      if (!m || loadingInProgress) return;
      loadingInProgress = true;
      try {
        const ad = m.AppOpenAd.createForAdRequest(unitId, { requestNonPersonalizedAdsOnly: true });
        let unsubLoaded: (() => void) | null = null;
        let unsubError: (() => void) | null = null;
        unsubLoaded = ad.addAdEventListener(m.AdEventType.LOADED, () => {
          appOpenRef.current = ad;
          loadingInProgress = false;
          unsubLoaded?.();
          unsubError?.();
        });
        unsubError = ad.addAdEventListener(m.AdEventType.ERROR, () => {
          loadingInProgress = false;
          unsubLoaded?.();
          unsubError?.();
        });
        ad.load();
      } catch {
        loadingInProgress = false;
      }
    }

    loadAppOpen();

    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      const now = Date.now();
      const cooldownMs = adConfig.interstitialCooldownSeconds * 1000;
      if (now - lastShownRef.current < cooldownMs) return;
      const ad = appOpenRef.current;
      if (!ad || !ad.loaded) { loadAppOpen(); return; }
      appOpenRef.current = null;
      lastShownRef.current = now;
      ad.show().catch(() => {});
      loadAppOpen();
    });

    return () => sub.remove();
  }, [adConfig]);

  // ── Native ad unit ID for reels feed ────────────────────────────────────────

  const nativeAdUnitId = adConfig.enabled
    ? (Platform.OS === "ios" ? adConfig.nativeIosUnitId : adConfig.nativeAndroidUnitId)
    : null;

  return (
    <AdMobContext.Provider value={{ adConfig, showInterstitial, nativeAdUnitId }}>
      {children}
    </AdMobContext.Provider>
  );
}

export function useAdMob(): AdMobContextValue {
  return useContext(AdMobContext);
}
