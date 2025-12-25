import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ClosetItem } from '@/types/database';
import { ArrowLeft, Loader2, Plus, X, Check } from 'lucide-react';

interface SlotSelection {
  top: ClosetItem | null;
  bottom: ClosetItem | null;
  shoes: ClosetItem | null;
  mid_layer: ClosetItem | null;
  outerwear: ClosetItem | null;
  accessory1: ClosetItem | null;
  accessory2: ClosetItem | null;
}

type SlotKey = keyof SlotSelection;

const SLOT_CONFIG: { key: SlotKey; label: string; required: boolean; category: string[] }[] = [
  { key: 'top', label: 'Top', required: true, category: ['tops'] },
  { key: 'bottom', label: 'Bottom', required: true, category: ['bottoms'] },
  { key: 'shoes', label: 'Shoes', required: true, category: ['shoes'] },
  { key: 'mid_layer', label: 'Mid Layer', required: false, category: ['tops', 'outerwear'] },
  { key: 'outerwear', label: 'Outerwear', required: false, category: ['outerwear'] },
  { key: 'accessory1', label: 'Accessory 1', required: false, category: ['accessories'] },
  { key: 'accessory2', label: 'Accessory 2', required: false, category: ['accessories'] },
];

export default function NewOutfit() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [items, setItems] = useState<ClosetItem[]>([]);
  const [slots, setSlots] = useState<SlotSelection>({
    top: null,
    bottom: null,
    shoes: null,
    mid_layer: null,
    outerwear: null,
    accessory1: null,
    accessory2: null,
  });
  const [activeSlot, setActiveSlot] = useState<SlotKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchItems();
  }, [user]);

  const fetchItems = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('closet_items')
        .select('*')
        .eq('user_id', user.id)
        .neq('category', 'underwear')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data as ClosetItem[]);
    } catch (error) {
      toast({ title: 'Error loading items', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getItemsForSlot = (slot: SlotKey): ClosetItem[] => {
    const config = SLOT_CONFIG.find((s) => s.key === slot);
    if (!config) return [];
    return items.filter((item) => config.category.includes(item.category));
  };

  const handleSelectItem = (item: ClosetItem) => {
    if (!activeSlot) return;
    setSlots({ ...slots, [activeSlot]: item });
    setActiveSlot(null);
  };

  const handleClearSlot = (slot: SlotKey) => {
    setSlots({ ...slots, [slot]: null });
  };

  const canSave = slots.top && slots.bottom && slots.shoes;

  const handleSave = async () => {
    if (!user || !canSave) return;

    setSaving(true);
    try {
      // Create outfit
      const { data: outfit, error: outfitError } = await supabase
        .from('outfits')
        .insert({
          user_id: user.id,
          name: name || null,
          source: 'manual',
        })
        .select()
        .single();

      if (outfitError) throw outfitError;

      // Create outfit items
      const outfitItems = Object.entries(slots)
        .filter(([_, item]) => item !== null)
        .map(([slotKey, item]) => ({
          outfit_id: outfit.id,
          item_id: item!.id,
          slot: slotKey.replace(/\d+$/, ''), // Remove numbers from accessory1/2
        }));

      const { error: itemsError } = await supabase
        .from('outfit_items')
        .insert(outfitItems);

      if (itemsError) throw itemsError;

      toast({ title: 'Outfit created!' });
      navigate('/app/outfits');
    } catch (error) {
      toast({ title: 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Check for missing categories
  const hasTops = items.some((i) => i.category === 'tops');
  const hasBottoms = items.some((i) => i.category === 'bottoms');
  const hasShoes = items.some((i) => i.category === 'shoes');

  if (!hasTops || !hasBottoms || !hasShoes) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/app/outfits')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Create Outfit</h1>
        </div>

        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h2 className="text-xl font-semibold">Missing required items</h2>
          <p className="mt-2 text-muted-foreground">
            You need at least one top, one bottom, and one pair of shoes to create an outfit.
          </p>
          <ul className="mt-4 space-y-1 text-sm">
            {!hasTops && <li className="text-destructive">• Missing tops</li>}
            {!hasBottoms && <li className="text-destructive">• Missing bottoms</li>}
            {!hasShoes && <li className="text-destructive">• Missing shoes</li>}
          </ul>
          <Button className="mt-6" onClick={() => navigate('/app/closet/add')}>
            Add Missing Items
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app/outfits')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Create Outfit</h1>
      </div>

      <div className="space-y-2">
        <Label>Outfit Name (optional)</Label>
        <Input
          placeholder="e.g., Casual Friday, Date Night..."
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {SLOT_CONFIG.map((config) => {
          const selectedItem = slots[config.key];
          const availableItems = getItemsForSlot(config.key);

          return (
            <Card key={config.key} className={config.required ? '' : 'opacity-75'}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm font-medium">
                  {config.label}
                  {config.required && <span className="text-xs text-destructive">Required</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedItem ? (
                  <div className="relative">
                    <div className="aspect-square overflow-hidden rounded-lg bg-secondary">
                      <img
                        src={selectedItem.cutout_image_url || selectedItem.original_image_url}
                        alt={selectedItem.category}
                        className="h-full w-full object-contain p-2"
                      />
                    </div>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
                      onClick={() => handleClearSlot(config.key)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Dialog open={activeSlot === config.key} onOpenChange={(open) => setActiveSlot(open ? config.key : null)}>
                    <DialogTrigger asChild>
                      <button
                        className="flex aspect-square w-full items-center justify-center rounded-lg border-2 border-dashed border-border bg-secondary/50 transition-colors hover:bg-secondary"
                        disabled={availableItems.length === 0}
                      >
                        {availableItems.length === 0 ? (
                          <span className="text-sm text-muted-foreground">No items</span>
                        ) : (
                          <Plus className="h-8 w-8 text-muted-foreground" />
                        )}
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[80vh] overflow-auto">
                      <DialogHeader>
                        <DialogTitle>Select {config.label}</DialogTitle>
                      </DialogHeader>
                      <div className="grid grid-cols-3 gap-2">
                        {availableItems.map((item) => (
                          <button
                            key={item.id}
                            className="aspect-square overflow-hidden rounded-lg bg-secondary transition-transform hover:scale-105"
                            onClick={() => handleSelectItem(item)}
                          >
                            <img
                              src={item.cutout_image_url || item.original_image_url}
                              alt={item.category}
                              className="h-full w-full object-contain p-1"
                            />
                          </button>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => navigate('/app/outfits')}>
          Cancel
        </Button>
        <Button className="flex-1 gap-2" onClick={handleSave} disabled={!canSave || saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Save Outfit
        </Button>
      </div>
    </div>
  );
}
