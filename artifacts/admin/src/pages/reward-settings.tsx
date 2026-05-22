import React, { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  useGetRewardConfig,
  useUpdateRewardConfig,
  getGetRewardConfigQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Settings2, RefreshCw } from "lucide-react";

type ConfigForm = {
  reelsScrollInterval: number;
  postLikesThreshold: number;
  reelPlaysThreshold: number;
  inactivityPenaltyPoints: number;
  inactivityPenaltyHours: number;
};

const DEFAULTS: ConfigForm = {
  reelsScrollInterval: 4,
  postLikesThreshold: 100,
  reelPlaysThreshold: 100,
  inactivityPenaltyPoints: 100,
  inactivityPenaltyHours: 6,
};

export default function RewardSettings() {
  const { data: config, isLoading } = useGetRewardConfig();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateMutation = useUpdateRewardConfig();

  const [form, setForm] = useState<ConfigForm>(DEFAULTS);

  useEffect(() => {
    if (config) {
      setForm({
        reelsScrollInterval: config.reelsScrollInterval,
        postLikesThreshold: config.postLikesThreshold,
        reelPlaysThreshold: config.reelPlaysThreshold,
        inactivityPenaltyPoints: config.inactivityPenaltyPoints,
        inactivityPenaltyHours: config.inactivityPenaltyHours,
      });
    }
  }, [config]);

  const handleChange = (field: keyof ConfigForm, value: string, min = 1) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= min) {
      setForm((prev) => ({ ...prev, [field]: num }));
    }
  };

  const handleSave = () => {
    updateMutation.mutate(
      { data: form },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetRewardConfigQueryKey() });
          toast({ title: "Saved", description: "Reward settings updated successfully." });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to save reward settings.", variant: "destructive" });
        },
      }
    );
  };

  const isDirty =
    config &&
    (form.reelsScrollInterval !== config.reelsScrollInterval ||
      form.postLikesThreshold !== config.postLikesThreshold ||
      form.reelPlaysThreshold !== config.reelPlaysThreshold ||
      form.inactivityPenaltyPoints !== config.inactivityPenaltyPoints ||
      form.inactivityPenaltyHours !== config.inactivityPenaltyHours);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Settings2 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Reward Settings</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Configure reward thresholds and inactivity penalties for the mobile app.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading current settings…</span>
          </div>
        ) : (
          <div className="grid gap-5 max-w-xl">

            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Reel Feed Gift Cards</CardTitle>
                <CardDescription>
                  A gift card surprise is injected into the reel feed after every N reels scrolled.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="reelsScrollInterval">Reels per gift card</Label>
                  <Input
                    id="reelsScrollInterval"
                    type="number"
                    min={1}
                    value={form.reelsScrollInterval}
                    onChange={(e) => handleChange("reelsScrollInterval", e.target.value)}
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    Current: every <strong>{config?.reelsScrollInterval}</strong> reels
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Newsfeed Scratch Cards</CardTitle>
                <CardDescription>
                  A scratch card unlocks on a newsfeed post once it reaches this many likes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="postLikesThreshold">Likes required</Label>
                  <Input
                    id="postLikesThreshold"
                    type="number"
                    min={1}
                    value={form.postLikesThreshold}
                    onChange={(e) => handleChange("postLikesThreshold", e.target.value)}
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    Current: <strong>{config?.postLikesThreshold}</strong> likes
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Profile Scratch Cards</CardTitle>
                <CardDescription>
                  A scratch card unlocks on a reel tile in the profile tab once it accumulates this many plays.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="reelPlaysThreshold">Plays required</Label>
                  <Input
                    id="reelPlaysThreshold"
                    type="number"
                    min={1}
                    value={form.reelPlaysThreshold}
                    onChange={(e) => handleChange("reelPlaysThreshold", e.target.value)}
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    Current: <strong>{config?.reelPlaysThreshold}</strong> plays
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card border-orange-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-orange-500" />
                  Inactivity Penalty
                </CardTitle>
                <CardDescription>
                  Deduct points from users who haven't been active for a set period. Set penalty to 0 to disable.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="inactivityPenaltyPoints">Points deducted</Label>
                    <Input
                      id="inactivityPenaltyPoints"
                      type="number"
                      min={0}
                      value={form.inactivityPenaltyPoints}
                      onChange={(e) => handleChange("inactivityPenaltyPoints", e.target.value, 0)}
                      className="w-32"
                    />
                    <p className="text-xs text-muted-foreground">
                      Current: <strong>{config?.inactivityPenaltyPoints}</strong> pts per window
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inactivityPenaltyHours">Window (hours)</Label>
                    <Input
                      id="inactivityPenaltyHours"
                      type="number"
                      min={1}
                      value={form.inactivityPenaltyHours}
                      onChange={(e) => handleChange("inactivityPenaltyHours", e.target.value)}
                      className="w-32"
                    />
                    <p className="text-xs text-muted-foreground">
                      Current: every <strong>{config?.inactivityPenaltyHours}</strong> h of inactivity
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3 bg-muted rounded px-3 py-2">
                  Example: {form.inactivityPenaltyPoints} pts deducted per {form.inactivityPenaltyHours} h of inactivity — after 24 h offline that's {Math.floor(24 / form.inactivityPenaltyHours) * form.inactivityPenaltyPoints} pts lost.
                </p>
              </CardContent>
            </Card>

            <div className="flex items-center gap-3 pt-1">
              <Button
                onClick={handleSave}
                disabled={!isDirty || updateMutation.isPending}
                className="gap-2"
              >
                {updateMutation.isPending && <RefreshCw className="h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
              {isDirty && (
                <Button
                  variant="ghost"
                  onClick={() => config && setForm({
                    reelsScrollInterval: config.reelsScrollInterval,
                    postLikesThreshold: config.postLikesThreshold,
                    reelPlaysThreshold: config.reelPlaysThreshold,
                    inactivityPenaltyPoints: config.inactivityPenaltyPoints,
                    inactivityPenaltyHours: config.inactivityPenaltyHours,
                  })}
                  className="text-muted-foreground"
                >
                  Discard
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
