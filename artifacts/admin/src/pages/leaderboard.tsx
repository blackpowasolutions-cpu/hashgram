import React from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useGetLeaderboard } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function Leaderboard() {
  const { data: entries, isLoading } = useGetLeaderboard({ period: "alltime", limit: 100 });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
          <p className="text-muted-foreground mt-1">Platform-wide user rankings by points and levels.</p>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px] text-center">Rank</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead className="text-right">Total Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">Loading rankings...</TableCell>
                  </TableRow>
                ) : (
                  entries?.map((entry) => (
                    <TableRow key={entry.userId}>
                      <TableCell className="text-center font-bold text-lg text-muted-foreground">
                        #{entry.rank}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-border">
                            {entry.user?.avatarUrl ? (
                              <img src={entry.user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-medium text-sm">{entry.user?.displayName?.[0]?.toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{entry.user?.displayName}</div>
                            <div className="text-xs text-muted-foreground">@{entry.user?.username}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <LevelBadge level={entry.level} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-mono font-bold text-lg text-primary">{entry.points.toLocaleString()}</div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function LevelBadge({ level }: { level: number }) {
  let label = "Bronze";
  let classes = "bg-amber-700/20 text-amber-700 dark:text-amber-500 hover:bg-amber-700/30";
  
  if (level >= 120) {
    label = "Diamond";
    classes = "bg-cyan-400/20 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-400/30";
  } else if (level >= 80) {
    label = "Platinum";
    classes = "bg-slate-300/20 text-slate-600 dark:text-slate-300 hover:bg-slate-300/30";
  } else if (level >= 50) {
    label = "Gold";
    classes = "bg-yellow-500/20 text-yellow-600 dark:text-yellow-500 hover:bg-yellow-500/30";
  } else if (level >= 10) {
    label = "Silver";
    classes = "bg-stone-400/20 text-stone-600 dark:text-stone-400 hover:bg-stone-400/30";
  }

  return (
    <Badge variant="outline" className={`border-none font-bold uppercase tracking-wider text-[10px] ${classes}`}>
      {label} Lvl {level}
    </Badge>
  );
}
