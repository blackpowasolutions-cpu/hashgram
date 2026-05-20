import React, { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { 
  useListAdminReels, 
  useListAdminPosts,
  useDeleteReel,
  useDeletePost,
  getListAdminReelsQueryKey,
  getListAdminPostsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Play, Heart, Eye, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Content() {
  const [activeTab, setActiveTab] = useState("reels");
  
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Moderation</h1>
          <p className="text-muted-foreground mt-1">Review and manage user-generated media across the platform.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="reels">Reels</TabsTrigger>
            <TabsTrigger value="posts">Posts</TabsTrigger>
          </TabsList>
          
          <TabsContent value="reels">
            <ReelsTab />
          </TabsContent>
          
          <TabsContent value="posts">
            <PostsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

function ReelsTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useListAdminReels({ page, limit: 24 });
  const deleteMutation = useDeleteReel();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const handleDelete = () => {
    if (!deleteConfirm) return;
    deleteMutation.mutate(
      { id: deleteConfirm },
      {
        onSuccess: () => {
          toast({ title: "Reel deleted successfully" });
          queryClient.invalidateQueries({ queryKey: getListAdminReelsQueryKey({ page, limit: 24 }) });
          setDeleteConfirm(null);
        }
      }
    );
  };

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Loading reels...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {data?.items.map((reel) => (
          <div key={reel.id} className="group relative rounded-xl overflow-hidden bg-secondary/50 border border-border aspect-[9/16]">
            {reel.thumbnailUrl ? (
              <img src={reel.thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-secondary">
                <Play className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
            )}
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="absolute top-2 right-2">
                <Button 
                  variant="destructive" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setDeleteConfirm(reel.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="absolute bottom-2 left-2 right-2 text-white text-xs space-y-1">
                <div className="font-medium truncate">@{reel.user?.username}</div>
                <div className="flex gap-3">
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {reel.views}</span>
                  <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {reel.likesCount}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reel?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The media and all associated engagement will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PostsTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useListAdminPosts({ page, limit: 20 });
  const deleteMutation = useDeletePost();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const handleDelete = () => {
    if (!deleteConfirm) return;
    deleteMutation.mutate(
      { id: deleteConfirm },
      {
        onSuccess: () => {
          toast({ title: "Post deleted successfully" });
          queryClient.invalidateQueries({ queryKey: getListAdminPostsQueryKey({ page, limit: 20 }) });
          setDeleteConfirm(null);
        }
      }
    );
  };

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Loading posts...</div>;

  return (
    <div className="space-y-4">
      {data?.items.map((post) => (
        <Card key={post.id} className="overflow-hidden">
          <CardHeader className="p-4 pb-0 flex flex-row justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                {post.user?.avatarUrl ? (
                  <img src={post.user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-medium text-xs">{post.user?.displayName?.[0]?.toUpperCase()}</span>
                )}
              </div>
              <div>
                <div className="font-medium">{post.user?.displayName}</div>
                <div className="text-xs text-muted-foreground">@{post.user?.username} • {new Date(post.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => setDeleteConfirm(post.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-4 text-sm">
            <p className="whitespace-pre-wrap">{post.content}</p>
            {post.mediaUrl && (
              <div className="mt-3 rounded-lg overflow-hidden border border-border max-h-[300px]">
                <img src={post.mediaUrl} alt="Post media" className="w-full h-full object-contain bg-secondary/50" />
              </div>
            )}
          </CardContent>
          <CardFooter className="p-4 pt-0 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" /> 
                {post.reactions?.reduce((acc, r) => acc + r.count, 0) || 0} reactions
              </span>
            </div>
          </CardFooter>
        </Card>
      ))}

      <AlertDialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The post and all associated reactions will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
