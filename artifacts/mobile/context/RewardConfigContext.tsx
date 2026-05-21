import React, { createContext, useContext, useEffect, useState } from "react";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

interface RewardConfig {
  reelsScrollInterval: number;
  postLikesThreshold: number;
  reelPlaysThreshold: number;
}

const DEFAULTS: RewardConfig = {
  reelsScrollInterval: 4,
  postLikesThreshold: 100,
  reelPlaysThreshold: 100,
};

const RewardConfigContext = createContext<RewardConfig>(DEFAULTS);

export function RewardConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<RewardConfig>(DEFAULTS);

  useEffect(() => {
    fetch(`${API_BASE}/store/reward-config`)
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      })
      .then((data: Partial<RewardConfig>) => {
        setConfig({
          reelsScrollInterval: data.reelsScrollInterval ?? DEFAULTS.reelsScrollInterval,
          postLikesThreshold: data.postLikesThreshold ?? DEFAULTS.postLikesThreshold,
          reelPlaysThreshold: data.reelPlaysThreshold ?? DEFAULTS.reelPlaysThreshold,
        });
      })
      .catch(() => {});
  }, []);

  return (
    <RewardConfigContext.Provider value={config}>
      {children}
    </RewardConfigContext.Provider>
  );
}

export function useRewardConfig(): RewardConfig {
  return useContext(RewardConfigContext);
}
