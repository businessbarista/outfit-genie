import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Shirt, LayoutGrid, Sparkles, Settings } from 'lucide-react';

const navItems = [
  { href: '/app/closet', label: 'Closet', icon: Shirt },
  { href: '/app/outfits', label: 'Outfits', icon: LayoutGrid },
  { href: '/app/suggest', label: 'Suggest', icon: Sparkles },
  { href: '/app/settings', label: 'Settings', icon: Settings },
];

export function AppNav() {
  const location = useLocation();

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          <Link to="/app/closet" className="font-semibold text-lg tracking-tight">
            Fitt
          </Link>
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
