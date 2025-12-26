import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ClosetItem } from '@/types/database';
import { CATEGORIES } from '@/lib/constants';
import { Plus, Heart, Search, Loader2, ChevronLeft, ChevronRight, MoreVertical, SlidersHorizontal, LayoutGrid, Shirt, User, Grid3X3, Layers } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Category icons mapping
const categoryIcons: Record<string, React.ReactNode> = {
  all: <LayoutGrid className="h-5 w-5" />,
  tops: <Shirt className="h-5 w-5" />,
  bottoms: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 4h12v3l-2 13H8L6 7V4z" />
    </svg>
  ),
  outerwear: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3L8 7H4v10h4l4 4 4-4h4V7h-4L12 3z" />
    </svg>
  ),
  shoes: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 16l2-8h4l2 4h8v4H4z" />
    </svg>
  ),
  accessories: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
    </svg>
  ),
  underwear: <Shirt className="h-5 w-5" />,
  likes: <Heart className="h-5 w-5" />,
};

// Color mapping for dot display
const colorMap: Record<string, string> = {
  black: '#1a1a1a',
  white: '#ffffff',
  gray: '#6b7280',
  navy: '#1e3a5f',
  blue: '#3b82f6',
  red: '#ef4444',
  green: '#22c55e',
  brown: '#8b4513',
  beige: '#f5f5dc',
  cream: '#fffdd0',
  olive: '#808000',
  burgundy: '#800020',
  pink: '#ec4899',
  yellow: '#eab308',
  orange: '#f97316',
  purple: '#a855f7',
  multicolor: 'linear-gradient(45deg, #ef4444, #eab308, #22c55e, #3b82f6)',
};

export default function Closet() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState<ClosetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showFavorites, setShowFavorites] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'carousel' | 'grid'>('carousel');

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

  const toggleFavorite = async (item: ClosetItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('closet_items')
        .update({ favorite: !item.favorite })
        .eq('id', item.id);

      if (error) throw error;
      
      setItems(items.map(i => 
        i.id === item.id ? { ...i, favorite: !i.favorite } : i
      ));
    } catch (error) {
      toast({
        title: 'Error updating favorite',
        variant: 'destructive',
      });
    }
  };

  const filteredItems = items.filter((item) => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (showFavorites && !item.favorite) return false;
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const matchesCategory = item.category.toLowerCase().includes(searchLower);
      const matchesSubtype = item.subtype?.toLowerCase().includes(searchLower);
      const matchesNotes = item.notes?.toLowerCase().includes(searchLower);
      if (!matchesCategory && !matchesSubtype && !matchesNotes) return false;
    }
    return true;
  });

  const currentItem = filteredItems[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
  };

  // Reset index when filter changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [selectedCategory, showFavorites, searchQuery]);

  const sidebarCategories = [
    { id: 'all', label: 'All' },
    ...CATEGORIES.map(cat => ({ id: cat, label: cat.charAt(0).toUpperCase() + cat.slice(1) })),
    { id: 'likes', label: 'Likes' },
  ];

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] animate-fade-in">
      {/* Left Sidebar */}
      <aside className="hidden w-20 flex-col items-center gap-2 border-r border-border bg-card py-4 md:flex">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <User className="h-5 w-5 text-primary" />
        </div>
        
        {sidebarCategories.map((cat) => {
          const isActive = cat.id === 'likes' ? showFavorites : (selectedCategory === cat.id && !showFavorites);
          return (
            <button
              key={cat.id}
              onClick={() => {
                if (cat.id === 'likes') {
                  setShowFavorites(!showFavorites);
                  setSelectedCategory('all');
                } else {
                  setSelectedCategory(cat.id);
                  setShowFavorites(false);
                }
              }}
              className={cn(
                "relative flex w-16 flex-col items-center gap-1 rounded-xl p-2 transition-all",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                  : "text-sidebar-foreground hover:bg-muted"
              )}
            >
              {isActive && (
                <div className="absolute right-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-l-full bg-primary" />
              )}
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                isActive ? "bg-primary text-primary-foreground" : ""
              )}>
                {categoryIcons[cat.id] || categoryIcons.all}
              </div>
              <span className="text-[10px] font-medium">{cat.label}</span>
            </button>
          );
        })}
      </aside>

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 md:px-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Closet</h1>
            <p className="text-sm text-muted-foreground">Total {items.length} items</p>
          </div>
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex rounded-full bg-muted p-1">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-full",
                  viewMode === 'carousel' && "bg-background shadow-sm"
                )}
                onClick={() => setViewMode('carousel')}
              >
                <Layers className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-full",
                  viewMode === 'grid' && "bg-background shadow-sm"
                )}
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={() => setShowSearch(true)}
            >
              <Search className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-full">
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {CATEGORIES.map((cat) => (
                  <DropdownMenuItem
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setShowFavorites(false);
                    }}
                    className="capitalize"
                  >
                    {cat}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onClick={() => {
                  setSelectedCategory('all');
                  setShowFavorites(false);
                }}>
                  Show All
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Mobile Category Pills */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 md:hidden">
          {sidebarCategories.slice(0, 5).map((cat) => {
            const isActive = cat.id === 'likes' ? showFavorites : (selectedCategory === cat.id && !showFavorites);
            return (
              <button
                key={cat.id}
                onClick={() => {
                  if (cat.id === 'likes') {
                    setShowFavorites(!showFavorites);
                    setSelectedCategory('all');
                  } else {
                    setSelectedCategory(cat.id);
                    setShowFavorites(false);
                  }
                }}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-card text-muted-foreground"
                )}
              >
                {categoryIcons[cat.id]}
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className={cn(
          "relative flex-1 px-4 pb-20",
          viewMode === 'carousel' ? "flex items-center justify-center" : "overflow-y-auto"
        )}>
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center">
              <div className="mb-4 rounded-full bg-secondary p-6">
                <Plus className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold">
                {items.length === 0 ? 'Your closet is empty' : 'No items found'}
              </h2>
              <p className="mt-2 text-muted-foreground">
                {items.length === 0 
                  ? 'Add your first clothing item to get started.'
                  : 'Try adjusting your filters.'}
              </p>
              {items.length === 0 && (
                <Link to="/app/closet/add" className="mt-4">
                  <Button className="gap-2 rounded-full bg-primary px-6">
                    <Plus className="h-4 w-4" />
                    Add Item
                  </Button>
                </Link>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-2 gap-3 py-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="group relative cursor-pointer overflow-hidden rounded-2xl bg-card shadow-md transition-transform hover:scale-[1.02]"
                  onClick={() => navigate(`/app/closet/item/${item.id}`)}
                >
                  {/* Favorite Button */}
                  <button
                    onClick={(e) => toggleFavorite(item, e)}
                    className={cn(
                      "absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full transition-all",
                      item.favorite 
                        ? "bg-favorite/20 text-favorite" 
                        : "bg-background/80 text-muted-foreground opacity-0 group-hover:opacity-100"
                    )}
                  >
                    <Heart className={cn("h-4 w-4", item.favorite && "fill-current")} />
                  </button>

                  {/* Image */}
                  <div className="aspect-square bg-gradient-to-b from-secondary/30 to-secondary/60">
                    <img
                      src={item.cutout_image_url || item.original_image_url}
                      alt={`${item.category} - ${item.subtype || 'item'}`}
                      className="h-full w-full object-contain p-2"
                    />
                  </div>

                  {/* Info */}
                  <div className="p-2">
                    <h4 className="truncate text-sm font-semibold capitalize text-foreground">
                      {item.subtype || item.category}
                    </h4>
                    <div className="mt-1 flex items-center gap-1.5">
                      {item.primary_color && (
                        <span
                          className="h-2.5 w-2.5 rounded-full border border-border"
                          style={{ 
                            background: colorMap[item.primary_color] || item.primary_color 
                          }}
                        />
                      )}
                      <span className="truncate text-xs capitalize text-muted-foreground">
                        {item.category}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : currentItem ? (
            /* Carousel View */
            <>
              {/* Navigation Arrows */}
              {filteredItems.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute left-2 z-10 h-10 w-10 rounded-full shadow-lg md:left-8"
                    onClick={goToPrevious}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-2 z-10 h-10 w-10 rounded-full shadow-lg md:right-8"
                    onClick={goToNext}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </>
              )}

              {/* Main Card */}
              <div 
                className="relative mx-auto w-full max-w-sm cursor-pointer overflow-hidden rounded-3xl bg-card shadow-xl transition-transform hover:scale-[1.01]"
                onClick={() => navigate(`/app/closet/item/${currentItem.id}`)}
              >
                {/* Category Badge */}
                <div className="absolute left-4 top-4 z-10">
                  <span className="rounded-full bg-card/90 px-3 py-1.5 text-xs font-medium capitalize shadow-sm backdrop-blur-sm">
                    {currentItem.category}
                  </span>
                </div>

                {/* Options Menu */}
                <div className="absolute right-4 top-4 z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-muted/80 backdrop-blur-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/app/closet/item/${currentItem.id}`);
                      }}>
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => toggleFavorite(currentItem, e)}
                      >
                        {currentItem.favorite ? 'Remove from Favorites' : 'Add to Favorites'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Image */}
                <div className="aspect-[3/4] w-full bg-gradient-to-b from-secondary/50 to-secondary">
                  <img
                    src={currentItem.cutout_image_url || currentItem.original_image_url}
                    alt={`${currentItem.category} - ${currentItem.subtype || 'item'}`}
                    className="h-full w-full object-contain p-4"
                  />
                </div>

                {/* Info Footer */}
                <div className="bg-card p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold capitalize text-foreground">
                        {currentItem.subtype || currentItem.category}
                      </h3>
                      <p className="mt-0.5 text-sm capitalize text-muted-foreground">
                        {currentItem.season === 'all-season' ? 'All Season' : currentItem.season?.replace('-', ' ')}
                      </p>
                    </div>
                    <button
                      onClick={(e) => toggleFavorite(currentItem, e)}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                        currentItem.favorite 
                          ? "bg-favorite/10 text-favorite" 
                          : "bg-muted text-muted-foreground hover:text-favorite"
                      )}
                    >
                      <Heart className={cn("h-5 w-5", currentItem.favorite && "fill-current")} />
                    </button>
                  </div>

                  {/* Color Tags */}
                  {currentItem.primary_color && (
                    <div className="mt-3 flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full border border-border"
                        style={{ 
                          background: colorMap[currentItem.primary_color] || currentItem.primary_color 
                        }}
                      />
                      <span className="text-sm capitalize text-muted-foreground">
                        {currentItem.primary_color}
                      </span>
                    </div>
                  )}

                  {/* Item Counter */}
                  <div className="mt-3 text-center text-xs text-muted-foreground">
                    {currentIndex + 1} of {filteredItems.length}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Floating Add Button */}
        <Link
          to="/app/closet/add"
          className="fixed bottom-24 right-4 z-20 md:bottom-8 md:right-8"
        >
          <Button className="h-14 gap-2 rounded-full bg-primary px-6 text-base font-semibold shadow-lg hover:bg-primary/90">
            <Plus className="h-5 w-5" />
            Add Item
          </Button>
        </Link>
      </main>

      {/* Search Dialog */}
      <Dialog open={showSearch} onOpenChange={setShowSearch}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Search Items</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, category, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
              autoFocus
            />
          </div>
          {searchQuery && (
            <p className="text-sm text-muted-foreground">
              Found {filteredItems.length} items
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
