import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/useAuth";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, Video, ShoppingBag, Trophy, LogOut, Newspaper, Ticket, Settings2, ChevronDown, ChevronRight, Tv2 } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Users", href: "/users", icon: Users },
  { name: "Content", href: "/content", icon: Video },
  { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
];

const REWARDS_ITEMS = [
  { name: "Reels Store", href: "/store/reels", icon: ShoppingBag },
  { name: "Newsfeed Gifts", href: "/store/newsfeed", icon: Newspaper },
  { name: "Scratch Cards", href: "/store/scratch", icon: Ticket },
  { name: "Reward Settings", href: "/rewards/settings", icon: Settings2 },
];

const ADS_ITEMS = [
  { name: "Ad Settings", href: "/ads/settings", icon: Tv2 },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  const rewardsActive = location.startsWith("/store") || location.startsWith("/rewards");
  const [rewardsOpen, setRewardsOpen] = useState(rewardsActive);
  const adsActive = location.startsWith("/ads");
  const [adsOpen, setAdsOpen] = useState(adsActive);

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated && location !== "/login") {
      setLocation("/login");
    }
  }, [isLoading, isAuthenticated, location, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background text-foreground dark overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
            R
          </div>
          <h1 className="text-xl font-bold font-sans tracking-tight">Reels Admin</h1>
        </div>

        <div className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 h-11 px-4 text-sm font-medium",
                    isActive
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                  data-testid={`nav-${item.name.toLowerCase()}`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Button>
              </Link>
            );
          })}

          {/* Rewards collapsible group */}
          <div>
            <Button
              variant={rewardsActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 h-11 px-4 text-sm font-medium",
                rewardsActive
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
              onClick={() => setRewardsOpen((o) => !o)}
              data-testid="nav-rewards"
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="flex-1 text-left">Rewards</span>
              {rewardsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>

            {rewardsOpen && (
              <div className="mt-1 ml-4 space-y-1">
                {REWARDS_ITEMS.map((item) => {
                  const isActive = location === item.href || location.startsWith(item.href);
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start gap-3 h-9 px-3 text-sm",
                          isActive
                            ? "bg-secondary text-secondary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                        )}
                        data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <item.icon className="h-3.5 w-3.5" />
                        {item.name}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ads collapsible group */}
          <div>
            <Button
              variant={adsActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 h-11 px-4 text-sm font-medium",
                adsActive
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
              onClick={() => setAdsOpen((o) => !o)}
              data-testid="nav-ads"
            >
              <Tv2 className="h-4 w-4" />
              <span className="flex-1 text-left">Ads</span>
              {adsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>

            {adsOpen && (
              <div className="mt-1 ml-4 space-y-1">
                {ADS_ITEMS.map((item) => {
                  const isActive = location === item.href || location.startsWith(item.href);
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start gap-3 h-9 px-3 text-sm",
                          isActive
                            ? "bg-secondary text-secondary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                        )}
                        data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <item.icon className="h-3.5 w-3.5" />
                        {item.name}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="font-medium text-sm">{user?.displayName?.[0]?.toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-sm font-medium truncate">{user?.displayName}</div>
              <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={logout}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-background">
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
