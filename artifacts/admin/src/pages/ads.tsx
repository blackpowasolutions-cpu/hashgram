import React, { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  useGetAdsConfig,
  useUpdateAdsConfig,
  getGetAdsConfigQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Tv2, Smartphone, Zap, MonitorPlay, AppWindow } from "lucide-react";

type ConfigForm = {
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
};

const DEFAULTS: ConfigForm = {
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

function AdUnitPair({
  label,
  androidField,
  iosField,
  form,
  onChange,
}: {
  label: string;
  androidField: keyof ConfigForm;
  iosField: keyof ConfigForm;
  form: ConfigForm;
  onChange: (field: keyof ConfigForm, value: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Smartphone className="h-3 w-3" /> Android Unit ID
          </Label>
          <Input
            value={form[androidField] as string}
            onChange={(e) => onChange(androidField, e.target.value)}
            className="font-mono text-xs"
            placeholder="ca-app-pub-XXXXXXXX/XXXXXXXXXX"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <AppWindow className="h-3 w-3" /> iOS Unit ID
          </Label>
          <Input
            value={form[iosField] as string}
            onChange={(e) => onChange(iosField, e.target.value)}
            className="font-mono text-xs"
            placeholder="ca-app-pub-XXXXXXXX/XXXXXXXXXX"
          />
        </div>
      </div>
    </div>
  );
}

export default function AdsSettings() {
  const { data: config, isLoading } = useGetAdsConfig();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateMutation = useUpdateAdsConfig();

  const [form, setForm] = useState<ConfigForm>(DEFAULTS);
  const [saved, setSaved] = useState<ConfigForm>(DEFAULTS);
  const isDirty = JSON.stringify(form) !== JSON.stringify(saved);

  useEffect(() => {
    if (config) {
      const loaded: ConfigForm = {
        enabled: config.enabled,
        androidAppId: config.androidAppId,
        iosAppId: config.iosAppId,
        interstitialAndroidUnitId: config.interstitialAndroidUnitId,
        interstitialIosUnitId: config.interstitialIosUnitId,
        nativeAndroidUnitId: config.nativeAndroidUnitId,
        nativeIosUnitId: config.nativeIosUnitId,
        appOpenAndroidUnitId: config.appOpenAndroidUnitId,
        appOpenIosUnitId: config.appOpenIosUnitId,
        interstitialFrequency: config.interstitialFrequency,
        interstitialCooldownSeconds: config.interstitialCooldownSeconds,
        nativeAdInterval: config.nativeAdInterval,
      };
      setForm(loaded);
      setSaved(loaded);
    }
  }, [config]);

  const handleText = (field: keyof ConfigForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleInt = (field: keyof ConfigForm, value: string, min = 1) => {
    const n = parseInt(value, 10);
    if (!isNaN(n) && n >= min) setForm((prev) => ({ ...prev, [field]: n }));
  };

  const handleSave = () => {
    updateMutation.mutate(
      { data: form },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetAdsConfigQueryKey() });
          setSaved(form);
          toast({ title: "Saved", description: "Ad settings updated." });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to save ad settings.", variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Ad Settings</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Configure Google AdMob ad unit IDs and placement behaviour. Pre-filled with Google&apos;s official test IDs.
            </p>
          </div>
          <div className="flex gap-2">
            {isDirty && (
              <Button variant="outline" onClick={() => setForm(saved)}>
                Discard
              </Button>
            )}
            <Button onClick={handleSave} disabled={!isDirty || updateMutation.isPending}>
              {updateMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* Global toggle */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Tv2 className="h-5 w-5 text-primary" />
              <CardTitle>Global Ad Toggle</CardTitle>
            </div>
            <CardDescription>
              Master switch — when off, no ads are requested or shown anywhere in the app.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Ads Enabled</p>
                <p className="text-xs text-muted-foreground">
                  Requires a native build with the AdMob plugin. Expo Go will silently skip all ads.
                </p>
              </div>
              <Switch
                checked={form.enabled}
                onCheckedChange={(v) => setForm((p) => ({ ...p, enabled: v }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* App IDs */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <CardTitle>App IDs</CardTitle>
            </div>
            <CardDescription>
              Your AdMob App IDs — found in the AdMob console under App Settings. These must also be set
              in <code className="text-xs bg-secondary px-1 rounded">app.json</code> before building the native app.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Smartphone className="h-3 w-3" /> Android App ID
                </Label>
                <Input
                  value={form.androidAppId}
                  onChange={(e) => handleText("androidAppId", e.target.value)}
                  className="font-mono text-xs"
                  placeholder="ca-app-pub-XXXXXXXX~XXXXXXXXXX"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <AppWindow className="h-3 w-3" /> iOS App ID
                </Label>
                <Input
                  value={form.iosAppId}
                  onChange={(e) => handleText("iosAppId", e.target.value)}
                  className="font-mono text-xs"
                  placeholder="ca-app-pub-XXXXXXXX~XXXXXXXXXX"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interstitial Ads */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <CardTitle>Interstitial Ads</CardTitle>
            </div>
            <CardDescription>
              Full-screen ads shown at natural break points: publishing a reel or post, liking, commenting,
              sharing, visiting a profile, and following a user.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <AdUnitPair
              label="Interstitial Ad Unit IDs"
              androidField="interstitialAndroidUnitId"
              iosField="interstitialIosUnitId"
              form={form}
              onChange={handleText}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2 border-t border-border">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Trigger frequency (every N actions)
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={form.interstitialFrequency}
                  onChange={(e) => handleInt("interstitialFrequency", e.target.value, 1)}
                />
                <p className="text-xs text-muted-foreground">
                  Show an interstitial after every N eligible user actions (e.g. 3 = every 3rd action).
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Cooldown between ads (seconds)
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={form.interstitialCooldownSeconds}
                  onChange={(e) => handleInt("interstitialCooldownSeconds", e.target.value, 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum seconds that must pass between two consecutive interstitial ads.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Native Ads (Reels Feed) */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MonitorPlay className="h-5 w-5 text-primary" />
              <CardTitle>Native Ads — Reels Feed</CardTitle>
            </div>
            <CardDescription>
              Full-screen native ad cards inserted into the vertical reels feed with the same natural flow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <AdUnitPair
              label="Native Ad Unit IDs"
              androidField="nativeAndroidUnitId"
              iosField="nativeIosUnitId"
              form={form}
              onChange={handleText}
            />
            <div className="pt-2 border-t border-border max-w-xs">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Feed insertion interval (every N reels)
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={form.nativeAdInterval}
                  onChange={(e) => handleInt("nativeAdInterval", e.target.value, 1)}
                />
                <p className="text-xs text-muted-foreground">
                  Insert a native ad card after every N reels (e.g. 5 = after reel 5, 10, 15…).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* App Open Ads */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AppWindow className="h-5 w-5 text-primary" />
              <CardTitle>App Open Ads</CardTitle>
            </div>
            <CardDescription>
              Shown when the user brings the app to the foreground after it has been backgrounded. Respects
              the same cooldown window as interstitials.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdUnitPair
              label="App Open Ad Unit IDs"
              androidField="appOpenAndroidUnitId"
              iosField="appOpenIosUnitId"
              form={form}
              onChange={handleText}
            />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
