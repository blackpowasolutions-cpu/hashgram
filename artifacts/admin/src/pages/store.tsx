import React, { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { 
  useListGiftCards, 
  useCreateGiftCard, 
  useUpdateGiftCard, 
  useDeleteGiftCard,
  getListGiftCardsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit2, Trash2, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";

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
  brand: "", category: "Retail", value: "$10", pointsCost: 1000, 
  minLevel: 1, gradientFrom: "#FE2C55", gradientTo: "#20D5EC", 
  emoji: "🎁", description: ""
};

export default function Store() {
  const { data: giftCards, isLoading } = useListGiftCards();
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
            toast({ title: "Gift card updated" });
            queryClient.invalidateQueries({ queryKey: getListGiftCardsQueryKey() });
            setDialogOpen(false);
          }
        }
      );
    } else {
      createMutation.mutate(
        { data: form },
        {
          onSuccess: () => {
            toast({ title: "Gift card created" });
            queryClient.invalidateQueries({ queryKey: getListGiftCardsQueryKey() });
            setDialogOpen(false);
          }
        }
      );
    }
  };

  const handleToggleActive = (id: number, currentActive: boolean) => {
    updateMutation.mutate(
      { id, data: { isActive: !currentActive } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGiftCardsQueryKey() });
        }
      }
    );
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this gift card?")) {
      deleteMutation.mutate(
        { id },
        {
          onSuccess: () => {
            toast({ title: "Gift card deleted" });
            queryClient.invalidateQueries({ queryKey: getListGiftCardsQueryKey() });
          }
        }
      );
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reward Store</h1>
            <p className="text-muted-foreground mt-1">Manage gift cards and point redemption options.</p>
          </div>
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Add Reward
          </Button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">Loading store...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {giftCards?.map((card) => (
              <Card key={card.id} className={`overflow-hidden flex flex-col ${!card.isActive && 'opacity-60'}`}>
                <div 
                  className="h-32 flex flex-col justify-between p-4 text-white"
                  style={{ background: `linear-gradient(135deg, ${card.gradientFrom}, ${card.gradientTo})` }}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-3xl filter drop-shadow-md">{card.emoji}</span>
                    <div className="bg-black/20 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium">
                      Lvl {card.minLevel}+
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-lg drop-shadow-md">{card.brand}</div>
                    <div className="text-sm opacity-90 font-medium">{card.value}</div>
                  </div>
                </div>
                <CardContent className="p-4 flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <Badge className="bg-secondary text-secondary-foreground border-none px-2 py-0.5 text-xs">
                      {card.category}
                    </Badge>
                    <div className="font-mono font-bold text-primary">{card.pointsCost.toLocaleString()} pts</div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{card.description}</p>
                </CardContent>
                <CardFooter className="p-4 pt-0 border-t border-border mt-auto flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={card.isActive} 
                      onCheckedChange={() => handleToggleActive(card.id, card.isActive)} 
                    />
                    <span className="text-xs text-muted-foreground">{card.isActive ? 'Active' : 'Hidden'}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(card)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(card.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Reward" : "Create New Reward"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Brand Name</Label>
              <Input value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} placeholder="e.g. Amazon" />
            </div>
            <div className="space-y-2">
              <Label>Value</Label>
              <Input value={form.value} onChange={e => setForm({...form, value: e.target.value})} placeholder="e.g. $10" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="e.g. Retail" />
            </div>
            <div className="space-y-2">
              <Label>Emoji</Label>
              <Input value={form.emoji} onChange={e => setForm({...form, emoji: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Points Cost</Label>
              <Input type="number" value={form.pointsCost} onChange={e => setForm({...form, pointsCost: parseInt(e.target.value) || 0})} />
            </div>
            <div className="space-y-2">
              <Label>Minimum Level Required</Label>
              <Input type="number" value={form.minLevel} onChange={e => setForm({...form, minLevel: parseInt(e.target.value) || 1})} />
            </div>
            <div className="space-y-2">
              <Label>Gradient From Color</Label>
              <Input type="color" value={form.gradientFrom} onChange={e => setForm({...form, gradientFrom: e.target.value})} className="h-10" />
            </div>
            <div className="space-y-2">
              <Label>Gradient To Color</Label>
              <Input type="color" value={form.gradientTo} onChange={e => setForm({...form, gradientTo: e.target.value})} className="h-10" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingId ? "Save Changes" : "Create Reward"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function Badge({ className, children }: { className?: string, children: React.ReactNode }) {
  return <span className={`inline-flex items-center rounded-full ${className}`}>{children}</span>
}
