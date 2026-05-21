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
};

export default function RewardSettings() {
  const { data: config, isLoading } = useGetRewardConfig();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateMutation = useUpdateRewardConfig();

  const [form, setForm] = useState<ConfigForm>({
    reelsScrollInterval: 4,
    postLikesThreshold: 100,
    reelPlaysThreshold: 100,
  });

  useEffect(() => {
    if (config) {
      setForm({
        reelsScrollInterval: config.reelsScrollInterval,
        postLikesThreshold: config.postLikesThreshold,
        reelPlaysThreshold: config.reelPlaysThreshold,
      });
    }
  }, [config]);

  const handleChange = (field: keyof ConfigForm, value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 1) {
      setForm((prev) => ({ ...prev, [field]: num }));
    }
  };

  const handleSave = () => {
    updateMutation.mutate(
      { data: form },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetRewardConfigQueryKey() });
          toast({ title: "Saved", description: "Reward thresholds updated successfully." });
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
      form.reelPlaysThreshold !== config.reelPlaysThreshold);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Settings2 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Reward Settings</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Configure the thresholds that trigger each reward type in the mobile app.
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
