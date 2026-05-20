import React, { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { 
  useListAdminUsers, 
  useSuspendUser, 
  useUpdateUserRole, 
  useAdjustUserPoints,
  getListAdminUsersQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, MoreHorizontal, Shield, Ban, Coins, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function Users() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  
  const { data, isLoading } = useListAdminUsers({ page, limit: 20, search: search || undefined });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const suspendMutation = useSuspendUser();
  const roleMutation = useUpdateUserRole();
  const pointsMutation = useAdjustUserPoints();

  const [pointsDialogUser, setPointsDialogUser] = useState<any>(null);
  const [pointsAmount, setPointsAmount] = useState(0);
  const [pointsReason, setPointsReason] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const invalidateList = () => {
    queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey({ page, limit: 20, search: search || undefined }) });
  };

  const handleSuspendToggle = (id: number, currentSuspended: boolean) => {
    suspendMutation.mutate(
      { id, data: { suspended: !currentSuspended } },
      {
        onSuccess: () => {
          toast({ title: "User status updated" });
          invalidateList();
        }
      }
    );
  };

  const handleRoleToggle = (id: number, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    roleMutation.mutate(
      { id, data: { role: newRole as "user" | "admin" } },
      {
        onSuccess: () => {
          toast({ title: "User role updated" });
          invalidateList();
        }
      }
    );
  };

  const handleAdjustPoints = () => {
    if (!pointsDialogUser || pointsAmount === 0 || !pointsReason) return;
    
    pointsMutation.mutate(
      { id: pointsDialogUser.id, data: { amount: pointsAmount, reason: pointsReason } },
      {
        onSuccess: () => {
          toast({ title: "Points adjusted successfully" });
          setPointsDialogUser(null);
          setPointsAmount(0);
          setPointsReason("");
          invalidateList();
        }
      }
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Users</h1>
            <p className="text-muted-foreground mt-1">Manage user accounts, roles, and points balances.</p>
          </div>
          
          <form onSubmit={handleSearch} className="flex w-full sm:w-auto gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search username or email..." 
                className="pl-9"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <Button type="submit" variant="secondary">Search</Button>
          </form>
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role & Status</TableHead>
                <TableHead>Stats</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">Loading users...</TableCell>
                </TableRow>
              ) : data?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">No users found.</TableCell>
                </TableRow>
              ) : (
                data?.items.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-medium text-xs">{user.displayName?.[0]?.toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{user.displayName}</div>
                          <div className="text-xs text-muted-foreground">@{user.username}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {user.role === "admin" ? (
                          <Badge variant="default" className="bg-primary/20 text-primary hover:bg-primary/30 border-none">Admin</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">User</Badge>
                        )}
                        {user.isSuspended && (
                          <Badge variant="destructive">Suspended</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>Followers: {user.followersCount || 0}</div>
                        <div>Reels: {user.reelsCount || 0}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono font-medium">{user.points.toLocaleString()} pts</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setPointsDialogUser(user)}>
                            <Coins className="mr-2 h-4 w-4" />
                            Adjust Points
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleRoleToggle(user.id, user.role)}>
                            <Shield className="mr-2 h-4 w-4" />
                            {user.role === "admin" ? "Revoke Admin" : "Make Admin"}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleSuspendToggle(user.id, user.isSuspended)}
                            className={user.isSuspended ? "text-green-600" : "text-destructive"}
                          >
                            <Ban className="mr-2 h-4 w-4" />
                            {user.isSuspended ? "Unsuspend Account" : "Suspend Account"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination controls could go here if needed based on data.total */}
      </div>

      <Dialog open={!!pointsDialogUser} onOpenChange={(o) => !o && setPointsDialogUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Points</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="text-sm text-muted-foreground">
              Adjusting points for <span className="font-bold text-foreground">@{pointsDialogUser?.username}</span> (Current balance: {pointsDialogUser?.points})
            </div>
            <div className="space-y-2">
              <Label>Amount (positive to add, negative to deduct)</Label>
              <Input 
                type="number" 
                value={pointsAmount} 
                onChange={(e) => setPointsAmount(parseInt(e.target.value) || 0)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Reason (required)</Label>
              <Input 
                placeholder="e.g. Contest winner, Refund" 
                value={pointsReason} 
                onChange={(e) => setPointsReason(e.target.value)} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPointsDialogUser(null)}>Cancel</Button>
            <Button 
              onClick={handleAdjustPoints} 
              disabled={pointsMutation.isPending || !pointsReason || pointsAmount === 0}
            >
              {pointsMutation.isPending ? "Applying..." : "Apply Adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
