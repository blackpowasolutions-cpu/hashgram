import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, Video, Store, Trophy, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Users", href: "/users", icon: Users },
  { name: "Content", href: "/content", icon: Video },
  { name: "Store", href: "/store", icon: Store },
  { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

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
        
        <div className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 h-11 px-4 text-sm font-medium",
                    isActive ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                  data-testid={`nav-${item.name.toLowerCase()}`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Button>
              </Link>
            );
          })}
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
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
