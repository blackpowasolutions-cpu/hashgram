import React from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useGetAdminStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Video, MessageSquare, Gift, Trophy, ArrowUpRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: stats, isLoading } = useGetAdminStats();

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Health</h1>
          <p className="text-muted-foreground mt-1">Overview of system metrics and user activity.</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard 
                title="Total Users" 
                value={stats.totalUsers.toLocaleString()} 
                icon={Users} 
                subtext={`+${stats.newUsersThisWeek} this week`} 
              />
              <MetricCard 
                title="Total Reels" 
                value={stats.totalReels.toLocaleString()} 
                icon={Video} 
              />
              <MetricCard 
                title="Total Posts" 
                value={stats.totalPosts.toLocaleString()} 
                icon={MessageSquare} 
              />
              <MetricCard 
                title="Gift Purchases" 
                value={stats.totalGiftPurchases.toLocaleString()} 
                icon={Gift} 
                subtext={`${stats.totalPointsDistributed.toLocaleString()} pts distributed`} 
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    Top Performing Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.topUsers?.map((user, i) => (
                      <div key={user.userId} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-xs text-muted-foreground">
                            {i + 1}
                          </div>
                          <div>
                            <div className="font-medium">{user.user?.displayName}</div>
                            <div className="text-xs text-muted-foreground">@{user.user?.username}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-primary">{user.points.toLocaleString()} pts</div>
                          <div className="text-xs text-muted-foreground">Level {user.level}</div>
                        </div>
                      </div>
                    ))}
                    {!stats.topUsers?.length && (
                      <div className="text-center text-sm text-muted-foreground py-4">No data available</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowUpRight className="h-5 w-5 text-primary" />
                    Recent Growth
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center h-[280px]">
                  <div className="text-center space-y-2">
                    <div className="text-5xl font-bold">{stats.newUsersToday}</div>
                    <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">NEW USERS TODAY</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">Failed to load platform stats</div>
        )}
      </div>
    </AdminLayout>
  );
}

function MetricCard({ title, value, icon: Icon, subtext }: { title: string, value: string | number, icon: any, subtext?: string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
        {subtext && (
          <div className="mt-4 text-xs font-medium text-muted-foreground flex items-center gap-1">
            {subtext}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
