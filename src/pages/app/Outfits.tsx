import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Outfit, ClosetItem } from '@/types/database';
import { Plus, Loader2, Trash2 } from 'lucide-react';

interface OutfitWithItems extends Outfit {
  outfit_items: { closet_items: ClosetItem; slot: string }[];
}

export default function Outfits() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [outfits, setOutfits] = useState<OutfitWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchOutfits();
  }, [user]);

  const fetchOutfits = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('outfits')
        .select(`
          *,
          outfit_items (
            slot,
            closet_items (*)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOutfits(data as OutfitWithItems[]);
    } catch (error) {
      toast({ title: 'Error loading outfits', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (outfitId: string) => {
    setDeleting(outfitId);
    try {
      const { error } = await supabase.from('outfits').delete().eq('id', outfitId);
      if (error) throw error;
      setOutfits(outfits.filter((o) => o.id !== outfitId));
      toast({ title: 'Outfit deleted' });
    } catch (error) {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    } finally {
      setDeleting(null);
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
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Outfits</h1>
        <Link to="/app/outfits/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Outfit
          </Button>
        </Link>
      </div>

      {outfits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 rounded-full bg-secondary p-4">
            <Plus className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">No outfits yet</h2>
          <p className="mt-2 text-muted-foreground">
            Create your first outfit combination.
          </p>
          <Link to="/app/outfits/new" className="mt-4">
            <Button>Create your first outfit</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {outfits.map((outfit) => (
            <Card key={outfit.id} className="overflow-hidden">
              <CardContent className="p-0">
                {/* Outfit preview grid */}
                <div className="grid grid-cols-3 gap-1 bg-secondary p-2">
                  {outfit.outfit_items.slice(0, 3).map((oi, idx) => (
                    <div
                      key={idx}
                      className="aspect-square overflow-hidden rounded bg-background"
                    >
                      <img
                        src={oi.closet_items.cutout_image_url || oi.closet_items.original_image_url}
                        alt={oi.closet_items.category}
                        className="h-full w-full object-contain p-1"
                      />
                    </div>
                  ))}
                  {outfit.outfit_items.length > 3 && (
                    <div className="flex aspect-square items-center justify-center rounded bg-background text-sm text-muted-foreground">
                      +{outfit.outfit_items.length - 3}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between p-4">
                  <div>
                    <h3 className="font-medium">
                      {outfit.name || 'Untitled Outfit'}
                    </h3>
                    <p className="text-sm text-muted-foreground capitalize">
                      {outfit.source} • {outfit.outfit_items.length} items
                    </p>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete outfit?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this outfit.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(outfit.id)}
                          disabled={deleting === outfit.id}
                        >
                          {deleting === outfit.id ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
