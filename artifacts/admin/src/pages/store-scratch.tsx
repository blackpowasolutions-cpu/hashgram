import React, { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  useListGiftCards,
  useCreateGiftCard,
  useUpdateGiftCard,
  useDeleteGiftCard,
  getListGiftCardsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit2, Trash2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const CARD_TYPE = "scratch" as const;

type GiftCardForm = {
  brand: string;
  category: string;
  value: string;
  pointsCost: number;
  minLevel: number;
  gradientFrom: string;
  gradientTo: string;
  emoji: string;
  description: string;
};

const defaultForm: GiftCardForm = {
  brand: "",
  category: "Reward",
  value: "$10",
  pointsCost: 0,
  minLevel: 1,
  gradientFrom: "#FF9800",
  gradientTo: "#E91E63",
  emoji: "🎰",
  description: "",
};

export default function StoreScratch() {
  const { data: giftCards, isLoading } = useListGiftCards({ type: CARD_TYPE });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useCreateGiftCard();
  const updateMutation = useUpdateGiftCard();
  const deleteMutation = useDeleteGiftCard();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<GiftCardForm>(defaultForm);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = (card: any) => {
    setEditingId(card.id);
    setForm({
      brand: card.brand,
      category: card.category,
      value: card.value,
      pointsCost: card.pointsCost,
      minLevel: card.minLevel,
      gradientFrom: card.gradientFrom,
      gradientTo: card.gradientTo,
      emoji: card.emoji,
      description: card.description,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingId) {
      updateMutation.mutate(
        { id: editingId, data: form },
        {
          onSuccess: () => {
            toast({ title: "Scratch card updated" });
            queryClient.invalidateQueries({ queryKey: getListGiftCardsQueryKey({ type: CARD_TYPE }) });
            setDialogOpen(false);
          },
        }
      );
    } else {
      createMutation.mutate(
        { data: { ...form, cardType: CARD_TYPE } },
        {
          onSuccess: () => {
            toast({ title: "Scratch card created" });
            queryClient.invalidateQueries({ queryKey: getListGiftCardsQueryKey({ type: CARD_TYPE }) });
            setDialogOpen(false);
          },
        }
      );
    }
  };

  const handleToggleActive = (id: number, currentActive: boolean) => {
    updateMutation.mutate(
      { id, data: { isActive: !currentActive } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGiftCardsQueryKey({ type: CARD_TYPE }) });
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this scratch card prize?")) {
      deleteMutation.mutate(
        { id },
        {
          onSuccess: () => {
            toast({ title: "Scratch card deleted" });
            queryClient.invalidateQueries({ queryKey: getListGiftCardsQueryKey({ type: CARD_TYPE }) });
          },
        }
      );
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Scratch Cards</h1>
            <p className="text-muted-foreground mt-1">
              Prizes revealed when a user unlocks a scratch card at 100 reel plays. Each prize can only be won once per user.
            </p>
          </div>
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Add Prize
          </Button>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-sm text-orange-400">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>These prizes are revealed when a user scratches a card earned at 100 reel plays. The app randomly picks one active prize per scratch. Each user can only win each prize once.</span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {(giftCards ?? []).map((card) => (
              <Card key={card.id} className={`overflow-hidden flex flex-col ${!card.isActive && "opacity-60"}`}>
                <div
                  className="h-32 flex flex-col justify-between p-4 text-white"
                  style={{ background: `linear-gradient(135deg, ${card.gradientFrom}, ${card.gradientTo})` }}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-3xl filter drop-shadow-md">{card.emoji}</span>
                    <div className="bg-black/20 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium">
                      Scratch Prize
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-lg drop-shadow-md">{card.brand}</div>
                    <div className="text-sm opacity-90 font-medium">{card.value}</div>
                  </div>
                </div>
                <CardContent className="p-4 flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <span className="inline-flex items-center rounded-full bg-secondary text-secondary-foreground px-2 py-0.5 text-xs">
                      {card.category}
                    </span>
                    <div className="text-xs text-muted-foreground">100 plays unlock</div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{card.description}</p>
                </CardContent>
                <CardFooter className="p-4 pt-0 border-t border-border mt-auto flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={card.isActive}
                      onCheckedChange={() => handleToggleActive(card.id, card.isActive)}
                    />
                    <span className="text-xs text-muted-foreground">{card.isActive ? "Active" : "Hidden"}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(card)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(card.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
            {!isLoading && (giftCards ?? []).length === 0 && (
              <div className="col-span-full py-16 text-center text-muted-foreground">
                <p className="text-lg mb-2">No scratch card prizes yet</p>
                <p className="text-sm">Add prizes to the pool that users can win by scratching their earned cards.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Scratch Prize" : "Add Scratch Prize"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Brand Name</Label>
              <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="e.g. Netflix" />
            </div>
            <div className="space-y-2">
              <Label>Value / Prize</Label>
              <Input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="e.g. 1 Month Free" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Entertainment" />
            </div>
            <div className="space-y-2">
              <Label>Emoji</Label>
              <Input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Gradient From</Label>
              <Input type="color" value={form.gradientFrom} onChange={(e) => setForm({ ...form, gradientFrom: e.target.value })} className="h-10" />
            </div>
            <div className="space-y-2">
              <Label>Gradient To</Label>
              <Input type="color" value={form.gradientTo} onChange={(e) => setForm({ ...form, gradientTo: e.target.value })} className="h-10" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Watch anything on Netflix for a month." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingId ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
