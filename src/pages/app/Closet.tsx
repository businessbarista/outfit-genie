import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toggle } from '@/components/ui/toggle';
import { ClosetItem } from '@/types/database';
import { CATEGORIES, COLORS, SEASONS, DRESS_LEVELS, PATTERNS } from '@/lib/constants';
import { Plus, Heart, Search, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Closet() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<ClosetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '',
    color: '',
    season: '',
    dress_level: '',
    pattern: '',
    favorite: false,
    search: '',
  });

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
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data as ClosetItem[]);
    } catch (error) {
      toast({
        title: 'Error loading closet',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (filters.category && item.category !== filters.category) return false;
    if (filters.color && item.primary_color !== filters.color) return false;
    if (filters.season && item.season !== filters.season) return false;
    if (filters.dress_level && item.dress_level !== filters.dress_level) return false;
    if (filters.pattern && item.pattern !== filters.pattern) return false;
    if (filters.favorite && !item.favorite) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesCategory = item.category.toLowerCase().includes(searchLower);
      const matchesSubtype = item.subtype?.toLowerCase().includes(searchLower);
      const matchesNotes = item.notes?.toLowerCase().includes(searchLower);
      if (!matchesCategory && !matchesSubtype && !matchesNotes) return false;
    }
    return true;
  });

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
        <h1 className="text-2xl font-bold">My Closet</h1>
        <Link to="/app/closet/add">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="pl-9"
          />
        </div>
        
        <Select value={filters.category} onValueChange={(v) => setFilters({ ...filters, category: v })}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat} className="capitalize">
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.color} onValueChange={(v) => setFilters({ ...filters, color: v })}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Color" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Colors</SelectItem>
            {COLORS.map((color) => (
              <SelectItem key={color} value={color} className="capitalize">
                {color}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.dress_level} onValueChange={(v) => setFilters({ ...filters, dress_level: v })}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Style" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Styles</SelectItem>
            {DRESS_LEVELS.filter(d => d !== 'unknown').map((level) => (
              <SelectItem key={level} value={level} className="capitalize">
                {level.replace('-', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Toggle
          pressed={filters.favorite}
          onPressedChange={(pressed) => setFilters({ ...filters, favorite: pressed })}
          aria-label="Toggle favorites"
          className="gap-2"
        >
          <Heart className={`h-4 w-4 ${filters.favorite ? 'fill-current' : ''}`} />
          Favorites
        </Toggle>
      </div>

      {/* Empty State */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 rounded-full bg-secondary p-4">
            <Plus className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">Your closet is empty</h2>
          <p className="mt-2 text-muted-foreground">
            Add your first clothing item to get started.
          </p>
          <Link to="/app/closet/add" className="mt-4">
            <Button>Add your first item</Button>
          </Link>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground">No items match your filters.</p>
          <Button
            variant="ghost"
            className="mt-2"
            onClick={() => setFilters({ category: '', color: '', season: '', dress_level: '', pattern: '', favorite: false, search: '' })}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        /* Item Grid */
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredItems.map((item) => (
            <Link
              key={item.id}
              to={`/app/closet/item/${item.id}`}
              className="group relative aspect-square overflow-hidden rounded-lg bg-secondary transition-transform hover:scale-[1.02]"
            >
              <img
                src={item.cutout_image_url || item.original_image_url}
                alt={`${item.category} - ${item.subtype || 'item'}`}
                className="h-full w-full object-contain p-2"
              />
              {item.favorite && (
                <div className="absolute right-2 top-2">
                  <Heart className="h-4 w-4 fill-destructive text-destructive" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/80 to-transparent p-2">
                <p className="text-xs font-medium capitalize">{item.category}</p>
                {item.subtype && (
                  <p className="text-xs text-muted-foreground capitalize">{item.subtype}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
