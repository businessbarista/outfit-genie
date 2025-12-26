import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ClosetItem, Outfit } from '@/types/database';
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

export default function EditOutfit() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [outfit, setOutfit] = useState<Outfit | null>(null);
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
    if (user && id) {
      fetchData();
    }
  }, [user, id]);

  const fetchData = async () => {
    if (!user || !id) return;

    try {
      // Fetch outfit with items
      const { data: outfitData, error: outfitError } = await supabase
        .from('outfits')
        .select(`
          *,
          outfit_items (
            slot,
            closet_items (*)
          )
        `)
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (outfitError) throw outfitError;
      if (!outfitData) {
        toast({ title: 'Outfit not found', variant: 'destructive' });
        navigate('/app/outfits');
        return;
      }

      setOutfit(outfitData);
      setName(outfitData.name || '');

      // Map existing outfit items to slots
      const newSlots: SlotSelection = {
        top: null,
        bottom: null,
        shoes: null,
        mid_layer: null,
        outerwear: null,
        accessory1: null,
        accessory2: null,
      };

      let accessoryCount = 0;
      outfitData.outfit_items?.forEach((oi: { slot: string; closet_items: ClosetItem }) => {
        const slotName = oi.slot;
        if (slotName === 'accessory') {
          accessoryCount++;
          const key = `accessory${accessoryCount}` as SlotKey;
          if (accessoryCount <= 2) {
            newSlots[key] = oi.closet_items;
          }
        } else if (slotName in newSlots) {
          newSlots[slotName as SlotKey] = oi.closet_items;
        }
      });

      setSlots(newSlots);

      // Fetch all closet items
      const { data: itemsData, error: itemsError } = await supabase
        .from('closet_items')
        .select('*')
        .eq('user_id', user.id)
        .neq('category', 'underwear')
        .order('created_at', { ascending: false });

      if (itemsError) throw itemsError;
      setItems(itemsData as ClosetItem[]);
    } catch (error) {
      toast({ title: 'Error loading outfit', variant: 'destructive' });
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
    if (!user || !id || !canSave) return;

    setSaving(true);
    try {
      // Update outfit name
      const { error: outfitError } = await supabase
        .from('outfits')
        .update({ name: name || null })
        .eq('id', id);

      if (outfitError) throw outfitError;

      // Delete existing outfit items
      const { error: deleteError } = await supabase
        .from('outfit_items')
        .delete()
        .eq('outfit_id', id);

      if (deleteError) throw deleteError;

      // Create new outfit items
      const outfitItems = Object.entries(slots)
        .filter(([_, item]) => item !== null)
        .map(([slotKey, item]) => ({
          outfit_id: id,
          item_id: item!.id,
          slot: slotKey.replace(/\d+$/, ''), // Remove numbers from accessory1/2
        }));

      const { error: itemsError } = await supabase
        .from('outfit_items')
        .insert(outfitItems);

      if (itemsError) throw itemsError;

      toast({ title: 'Outfit updated!' });
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

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app/outfits')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Edit Outfit</h1>
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
          Save Changes
        </Button>
      </div>
    </div>
  );
}
