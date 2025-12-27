import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { ClosetItem } from '@/types/database';
import { CATEGORIES, SUBTYPES, COLORS, SEASONS, PATTERNS, DRESS_LEVELS, LAYER_ROLES } from '@/lib/constants';
import { ArrowLeft, Loader2, Save, Trash2, Wand2 } from 'lucide-react';

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [item, setItem] = useState<ClosetItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchItem();
  }, [id, user]);

  const fetchItem = async () => {
    if (!id || !user) return;

    try {
      const { data, error } = await supabase
        .from('closet_items')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setItem(data as ClosetItem);
    } catch (error) {
      toast({ title: 'Item not found', variant: 'destructive' });
      navigate('/app/closet');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!item) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('closet_items')
        .update({
          category: item.category,
          subtype: item.subtype,
          primary_color: item.primary_color,
          season: item.season,
          pattern: item.pattern,
          dress_level: item.dress_level,
          layer_role: item.layer_role,
          favorite: item.favorite,
          notes: item.notes,
        })
        .eq('id', item.id);

      if (error) throw error;
      toast({ title: 'Item updated!' });
    } catch (error) {
      toast({ title: 'Failed to update', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!item || !user) return;

    setDeleting(true);
    try {
      // Delete from storage
      const basePath = `${user.id}/${item.id}`;
      await supabase.storage.from('closet-originals').remove([`${basePath}/original.jpg`, `${basePath}/original.png`, `${basePath}/original.jpeg`]);
      await supabase.storage.from('closet-cutouts').remove([`${basePath}/cutout.png`]);

      // Delete from database
      const { error } = await supabase.from('closet_items').delete().eq('id', item.id);
      if (error) throw error;

      toast({ title: 'Item deleted' });
      navigate('/app/closet');
    } catch (error) {
      toast({ title: 'Failed to delete', variant: 'destructive' });
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!item) return null;

  const subtypeOptions = SUBTYPES[item.category] || [];

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app/closet')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold capitalize">{item.category} Details</h1>
      </div>

      {/* Preview */}
      <Card>
        <CardContent className="p-4">
          <div className="aspect-square overflow-hidden rounded-lg bg-secondary">
            <img
              src={item.cutout_image_url || item.original_image_url}
              alt={`${item.category} - ${item.subtype || 'item'}`}
              className="h-full w-full object-contain"
            />
          </div>
        </CardContent>
      </Card>

      {/* Editor */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={item.category} onValueChange={(v) => setItem({ ...item, category: v, subtype: '' })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat} className="capitalize">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Subtype</Label>
              <Select value={item.subtype || ''} onValueChange={(v) => setItem({ ...item, subtype: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subtype" />
                </SelectTrigger>
                <SelectContent>
                  {subtypeOptions.map((sub) => (
                    <SelectItem key={sub} value={sub} className="capitalize">
                      {sub.replace('-', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <Select value={item.primary_color || ''} onValueChange={(v) => setItem({ ...item, primary_color: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  {COLORS.map((color) => (
                    <SelectItem key={color} value={color} className="capitalize">
                      {color}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Season</Label>
              <Select value={item.season} onValueChange={(v) => setItem({ ...item, season: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEASONS.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s.replace('-', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Pattern</Label>
              <Select value={item.pattern} onValueChange={(v) => setItem({ ...item, pattern: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PATTERNS.map((p) => (
                    <SelectItem key={p} value={p} className="capitalize">
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Style</Label>
              <Select value={item.dress_level} onValueChange={(v) => setItem({ ...item, dress_level: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DRESS_LEVELS.map((d) => (
                    <SelectItem key={d} value={d} className="capitalize">
                      {d.replace('-', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Layer Role</Label>
              <Select value={item.layer_role} onValueChange={(v) => setItem({ ...item, layer_role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LAYER_ROLES.map((l) => (
                    <SelectItem key={l} value={l} className="capitalize">
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between space-x-2 sm:col-span-2">
              <Label htmlFor="favorite">Favorite</Label>
              <Switch
                id="favorite"
                checked={item.favorite}
                onCheckedChange={(checked) => setItem({ ...item, favorite: checked })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Add any notes..."
              value={item.notes || ''}
              onChange={(e) => setItem({ ...item, notes: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Build Outfit Button */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="font-semibold">Build an Outfit</p>
            <p className="text-sm text-muted-foreground">
              Get AI suggestions that complement this item
            </p>
          </div>
          <Button
            className="gap-2"
            onClick={() => navigate(`/app/closet/item/${item.id}/build`)}
          >
            <Wand2 className="h-4 w-4" />
            Build Outfit
          </Button>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="gap-2">
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this item?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this clothing item from your closet.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
