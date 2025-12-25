import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ClosetItem } from '@/types/database';
import { Sparkles, Loader2, Save, RefreshCw, AlertCircle } from 'lucide-react';

interface SuggestedOutfit {
  top: ClosetItem | null;
  bottom: ClosetItem | null;
  shoes: ClosetItem | null;
  mid_layer?: ClosetItem | null;
  outerwear?: ClosetItem | null;
  accessories?: ClosetItem[];
  reasoning?: string;
}

export default function Suggest() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<ClosetItem[]>([]);
  const [suggestion, setSuggestion] = useState<SuggestedOutfit | null>(null);
  const [loading, setLoading] = useState(true);
  const [suggesting, setSuggesting] = useState(false);
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

  const hasTops = items.some((i) => i.category === 'tops');
  const hasBottoms = items.some((i) => i.category === 'bottoms');
  const hasShoes = items.some((i) => i.category === 'shoes');
  const canSuggest = hasTops && hasBottoms && hasShoes;

  const handleSuggest = async () => {
    if (!user || !canSuggest) return;

    setSuggesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-outfit', {
        body: { userId: user.id },
      });

      if (error) throw error;

      if (data.outfit) {
        // Map item IDs to actual items
        const findItem = (id: string) => items.find((i) => i.id === id) || null;
        
        setSuggestion({
          top: findItem(data.outfit.top),
          bottom: findItem(data.outfit.bottom),
          shoes: findItem(data.outfit.shoes),
          mid_layer: data.outfit.mid_layer ? findItem(data.outfit.mid_layer) : null,
          outerwear: data.outfit.outerwear ? findItem(data.outfit.outerwear) : null,
          accessories: data.outfit.accessories?.map((id: string) => findItem(id)).filter(Boolean) || [],
          reasoning: data.reasoning,
        });
      }
    } catch (error) {
      console.error('Suggestion error:', error);
      toast({ title: 'Suggestion failed', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setSuggesting(false);
    }
  };

  const handleSave = async () => {
    if (!user || !suggestion) return;

    setSaving(true);
    try {
      // Create outfit
      const { data: outfit, error: outfitError } = await supabase
        .from('outfits')
        .insert({
          user_id: user.id,
          name: 'AI Suggested Outfit',
          source: 'suggested',
        })
        .select()
        .single();

      if (outfitError) throw outfitError;

      // Build outfit items
      const outfitItems: { outfit_id: string; item_id: string; slot: string }[] = [];
      
      if (suggestion.top) outfitItems.push({ outfit_id: outfit.id, item_id: suggestion.top.id, slot: 'top' });
      if (suggestion.bottom) outfitItems.push({ outfit_id: outfit.id, item_id: suggestion.bottom.id, slot: 'bottom' });
      if (suggestion.shoes) outfitItems.push({ outfit_id: outfit.id, item_id: suggestion.shoes.id, slot: 'shoes' });
      if (suggestion.mid_layer) outfitItems.push({ outfit_id: outfit.id, item_id: suggestion.mid_layer.id, slot: 'mid_layer' });
      if (suggestion.outerwear) outfitItems.push({ outfit_id: outfit.id, item_id: suggestion.outerwear.id, slot: 'outerwear' });
      suggestion.accessories?.forEach((acc) => {
        if (acc) outfitItems.push({ outfit_id: outfit.id, item_id: acc.id, slot: 'accessory' });
      });

      const { error: itemsError } = await supabase.from('outfit_items').insert(outfitItems);
      if (itemsError) throw itemsError;

      // Log suggestion event
      await supabase.from('suggestion_events').insert({
        user_id: user.id,
        suggested_item_ids: outfitItems.map((i) => i.item_id),
        action: 'saved',
      });

      toast({ title: 'Outfit saved!' });
      setSuggestion(null);
    } catch (error) {
      toast({ title: 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    if (!user || !suggestion) return;

    // Log skip event
    const itemIds = [
      suggestion.top?.id,
      suggestion.bottom?.id,
      suggestion.shoes?.id,
      suggestion.mid_layer?.id,
      suggestion.outerwear?.id,
      ...(suggestion.accessories?.map((a) => a?.id) || []),
    ].filter(Boolean);

    await supabase.from('suggestion_events').insert({
      user_id: user.id,
      suggested_item_ids: itemIds,
      action: 'skipped',
    });

    // Get another suggestion
    handleSuggest();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canSuggest) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold">AI Suggestions</h1>
        
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 rounded-full bg-secondary p-4">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">Missing required items</h2>
          <p className="mt-2 text-muted-foreground">
            You need at least one top, one bottom, and one pair of shoes for AI suggestions.
          </p>
          <ul className="mt-4 space-y-1 text-sm">
            {!hasTops && <li className="text-destructive">• Missing tops</li>}
            {!hasBottoms && <li className="text-destructive">• Missing bottoms</li>}
            {!hasShoes && <li className="text-destructive">• Missing shoes</li>}
          </ul>
          <Link to="/app/closet/add" className="mt-6">
            <Button>Add Missing Items</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">AI Suggestions</h1>

      {!suggestion ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-secondary p-4">
              <Sparkles className="h-8 w-8 text-foreground" />
            </div>
            <h2 className="text-xl font-semibold">Get outfit inspiration</h2>
            <p className="mt-2 text-muted-foreground">
              Let AI suggest an outfit from your closet based on style, colors, and what you haven't worn recently.
            </p>
            <Button
              size="lg"
              className="mt-6 gap-2"
              onClick={handleSuggest}
              disabled={suggesting}
            >
              {suggesting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
              Suggest Outfit
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Outfit Preview */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-4">
                {suggestion.top && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Top</p>
                    <div className="aspect-square overflow-hidden rounded-lg bg-secondary">
                      <img
                        src={suggestion.top.cutout_image_url || suggestion.top.original_image_url}
                        alt="Top"
                        className="h-full w-full object-contain p-2"
                      />
                    </div>
                  </div>
                )}
                {suggestion.bottom && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Bottom</p>
                    <div className="aspect-square overflow-hidden rounded-lg bg-secondary">
                      <img
                        src={suggestion.bottom.cutout_image_url || suggestion.bottom.original_image_url}
                        alt="Bottom"
                        className="h-full w-full object-contain p-2"
                      />
                    </div>
                  </div>
                )}
                {suggestion.shoes && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Shoes</p>
                    <div className="aspect-square overflow-hidden rounded-lg bg-secondary">
                      <img
                        src={suggestion.shoes.cutout_image_url || suggestion.shoes.original_image_url}
                        alt="Shoes"
                        className="h-full w-full object-contain p-2"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Optional items */}
              {(suggestion.mid_layer || suggestion.outerwear || (suggestion.accessories && suggestion.accessories.length > 0)) && (
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {suggestion.mid_layer && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Mid Layer</p>
                      <div className="aspect-square overflow-hidden rounded bg-secondary">
                        <img
                          src={suggestion.mid_layer.cutout_image_url || suggestion.mid_layer.original_image_url}
                          alt="Mid Layer"
                          className="h-full w-full object-contain p-1"
                        />
                      </div>
                    </div>
                  )}
                  {suggestion.outerwear && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Outerwear</p>
                      <div className="aspect-square overflow-hidden rounded bg-secondary">
                        <img
                          src={suggestion.outerwear.cutout_image_url || suggestion.outerwear.original_image_url}
                          alt="Outerwear"
                          className="h-full w-full object-contain p-1"
                        />
                      </div>
                    </div>
                  )}
                  {suggestion.accessories?.map((acc, idx) => (
                    <div key={idx} className="space-y-1">
                      <p className="text-xs text-muted-foreground">Accessory</p>
                      <div className="aspect-square overflow-hidden rounded bg-secondary">
                        <img
                          src={acc.cutout_image_url || acc.original_image_url}
                          alt="Accessory"
                          className="h-full w-full object-contain p-1"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {suggestion.reasoning && (
                <p className="mt-4 text-sm text-muted-foreground italic">
                  "{suggestion.reasoning}"
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleSkip}
              disabled={suggesting}
            >
              {suggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Suggest Another
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Outfit
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
