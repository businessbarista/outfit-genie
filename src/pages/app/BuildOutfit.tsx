import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ClosetItem } from '@/types/database';
import { ArrowLeft, Loader2, Save, RefreshCw, ShoppingBag, Sparkles, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ShoppingSuggestion {
  category: string;
  description: string;
  color: string;
  style: string;
  reasoning: string;
}

interface OutfitResult {
  anchor_item: ClosetItem;
  closet_picks: {
    top?: string | null;
    bottom?: string | null;
    shoes?: string | null;
    outerwear?: string | null;
    accessories?: string[];
  };
  shopping_suggestions: ShoppingSuggestion[];
  outfit_reasoning: string;
  style_notes: string;
}

export default function BuildOutfit() {
  const { id: anchorItemId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [items, setItems] = useState<ClosetItem[]>([]);
  const [result, setResult] = useState<OutfitResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && anchorItemId) {
      fetchItemsAndBuild();
    }
  }, [user, anchorItemId]);

  const fetchItemsAndBuild = async () => {
    if (!user) return;

    try {
      // Fetch all items for mapping
      const { data, error } = await supabase
        .from('closet_items')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setItems(data as ClosetItem[]);
      setLoading(false);

      // Auto-build on load
      await buildOutfit();
    } catch (error) {
      toast({ title: 'Error loading items', variant: 'destructive' });
      setLoading(false);
    }
  };

  const buildOutfit = async () => {
    if (!user || !anchorItemId) return;

    setBuilding(true);
    try {
      const { data, error } = await supabase.functions.invoke('build-outfit', {
        body: { userId: user.id, anchorItemId },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);
    } catch (error) {
      console.error('Build outfit error:', error);
      toast({
        title: 'Failed to build outfit',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBuilding(false);
    }
  };

  const getItemById = (id: string | null | undefined): ClosetItem | null => {
    if (!id) return null;
    return items.find((i) => i.id === id) || null;
  };

  const handleSave = async () => {
    if (!user || !result) return;

    setSaving(true);
    try {
      // Create outfit
      const { data: outfit, error: outfitError } = await supabase
        .from('outfits')
        .insert({
          user_id: user.id,
          name: `Outfit with ${result.anchor_item.subtype || result.anchor_item.category}`,
          source: 'suggested',
        })
        .select()
        .single();

      if (outfitError) throw outfitError;

      // Build outfit items
      const outfitItems: { outfit_id: string; item_id: string; slot: string }[] = [];

      // Add anchor item
      const anchorSlot = result.anchor_item.category === 'tops' ? 'top' :
        result.anchor_item.category === 'bottoms' ? 'bottom' :
        result.anchor_item.category === 'shoes' ? 'shoes' :
        result.anchor_item.category === 'outerwear' ? 'outerwear' : 'accessory';
      
      outfitItems.push({ outfit_id: outfit.id, item_id: result.anchor_item.id, slot: anchorSlot });

      // Add closet picks
      if (result.closet_picks.top) {
        outfitItems.push({ outfit_id: outfit.id, item_id: result.closet_picks.top, slot: 'top' });
      }
      if (result.closet_picks.bottom) {
        outfitItems.push({ outfit_id: outfit.id, item_id: result.closet_picks.bottom, slot: 'bottom' });
      }
      if (result.closet_picks.shoes) {
        outfitItems.push({ outfit_id: outfit.id, item_id: result.closet_picks.shoes, slot: 'shoes' });
      }
      if (result.closet_picks.outerwear) {
        outfitItems.push({ outfit_id: outfit.id, item_id: result.closet_picks.outerwear, slot: 'outerwear' });
      }
      result.closet_picks.accessories?.forEach((accId) => {
        if (accId) outfitItems.push({ outfit_id: outfit.id, item_id: accId, slot: 'accessory' });
      });

      const { error: itemsError } = await supabase.from('outfit_items').insert(outfitItems);
      if (itemsError) throw itemsError;

      toast({ title: 'Outfit saved!' });
      navigate('/app/outfits');
    } catch (error) {
      toast({ title: 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const generateSearchUrl = (suggestion: ShoppingSuggestion) => {
    const query = encodeURIComponent(`${suggestion.color} ${suggestion.description} ${suggestion.style}`);
    return `https://www.google.com/search?q=${query}&tbm=shop`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const anchorItem = result?.anchor_item || getItemById(anchorItemId);

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Build Outfit</h1>
          {anchorItem && (
            <p className="text-sm text-muted-foreground capitalize">
              Around your {anchorItem.subtype || anchorItem.category}
            </p>
          )}
        </div>
      </div>

      {building && !result ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-4">
              <Sparkles className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <h2 className="text-xl font-semibold">Building your outfit...</h2>
            <p className="mt-2 text-muted-foreground">
              AI is finding the perfect pieces to complement your item
            </p>
            <Loader2 className="mt-4 h-6 w-6 animate-spin text-primary" />
          </CardContent>
        </Card>
      ) : result ? (
        <div className="space-y-6">
          {/* Anchor Item */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                Anchor Item
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="h-24 w-24 overflow-hidden rounded-xl bg-secondary">
                  <img
                    src={result.anchor_item.cutout_image_url || result.anchor_item.original_image_url}
                    alt="Anchor"
                    className="h-full w-full object-contain p-2"
                  />
                </div>
                <div>
                  <p className="font-semibold capitalize">
                    {result.anchor_item.subtype || result.anchor_item.category}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {result.anchor_item.primary_color} • {result.anchor_item.dress_level}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Closet Picks */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">From Your Closet</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
                {result.closet_picks.top && (
                  <ItemSlot
                    label="Top"
                    item={getItemById(result.closet_picks.top)}
                    onClick={() => navigate(`/app/closet/item/${result.closet_picks.top}`)}
                  />
                )}
                {result.closet_picks.bottom && (
                  <ItemSlot
                    label="Bottom"
                    item={getItemById(result.closet_picks.bottom)}
                    onClick={() => navigate(`/app/closet/item/${result.closet_picks.bottom}`)}
                  />
                )}
                {result.closet_picks.shoes && (
                  <ItemSlot
                    label="Shoes"
                    item={getItemById(result.closet_picks.shoes)}
                    onClick={() => navigate(`/app/closet/item/${result.closet_picks.shoes}`)}
                  />
                )}
                {result.closet_picks.outerwear && (
                  <ItemSlot
                    label="Outerwear"
                    item={getItemById(result.closet_picks.outerwear)}
                    onClick={() => navigate(`/app/closet/item/${result.closet_picks.outerwear}`)}
                  />
                )}
                {result.closet_picks.accessories?.map((accId, idx) => (
                  <ItemSlot
                    key={idx}
                    label="Accessory"
                    item={getItemById(accId)}
                    onClick={() => navigate(`/app/closet/item/${accId}`)}
                  />
                ))}
              </div>

              {result.outfit_reasoning && (
                <div className="mt-4 rounded-lg bg-muted/50 p-3">
                  <p className="text-sm italic text-muted-foreground">
                    "{result.outfit_reasoning}"
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shopping Suggestions */}
          {result.shopping_suggestions && result.shopping_suggestions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShoppingBag className="h-4 w-4" />
                  Shopping Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.shopping_suggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card p-3"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize">
                          {suggestion.category}
                        </Badge>
                        <span className="text-sm font-medium capitalize">
                          {suggestion.color} {suggestion.description}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {suggestion.reasoning}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 gap-1"
                      onClick={() => window.open(generateSearchUrl(suggestion), '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                      Shop
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Style Notes */}
          {result.style_notes && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Style Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{result.style_notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={buildOutfit}
              disabled={building}
            >
              {building ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Try Another
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
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground">Something went wrong. Please try again.</p>
            <Button className="mt-4" onClick={() => navigate(-1)}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ItemSlot({
  label,
  item,
  onClick,
}: {
  label: string;
  item: ClosetItem | null;
  onClick?: () => void;
}) {
  if (!item) return null;

  return (
    <div
      className="cursor-pointer space-y-1 transition-transform hover:scale-[1.02]"
      onClick={onClick}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="aspect-square overflow-hidden rounded-xl bg-secondary">
        <img
          src={item.cutout_image_url || item.original_image_url}
          alt={label}
          className="h-full w-full object-contain p-2"
        />
      </div>
      <p className="truncate text-xs capitalize text-foreground">
        {item.subtype || item.category}
      </p>
    </div>
  );
}
