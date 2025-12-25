import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Shirt, Sparkles, LayoutGrid } from 'lucide-react';

export default function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/app/closet', { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <span className="font-semibold text-lg tracking-tight">Fitt</span>
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <div className="max-w-2xl space-y-8 animate-fade-in">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Never overthink your outfit again
          </h1>
          <p className="text-lg text-muted-foreground sm:text-xl">
            Upload your wardrobe, get AI-powered outfit suggestions, and look
            great every day without the decision fatigue.
          </p>
          <Link to="/login">
            <Button size="lg" className="text-base">
              Get Started
            </Button>
          </Link>
        </div>

        {/* Features */}
        <div className="mt-20 grid max-w-4xl gap-8 sm:grid-cols-3">
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
              <Shirt className="h-6 w-6 text-foreground" />
            </div>
            <h3 className="font-semibold">Digital Closet</h3>
            <p className="text-sm text-muted-foreground">
              Upload your clothes with auto background removal and smart tagging.
            </p>
          </div>
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
              <LayoutGrid className="h-6 w-6 text-foreground" />
            </div>
            <h3 className="font-semibold">Organize Outfits</h3>
            <p className="text-sm text-muted-foreground">
              Create and save your favorite outfit combinations for any occasion.
            </p>
          </div>
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
              <Sparkles className="h-6 w-6 text-foreground" />
            </div>
            <h3 className="font-semibold">AI Suggestions</h3>
            <p className="text-sm text-muted-foreground">
              Get smart outfit recommendations based on your actual wardrobe.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Fitt. All rights reserved.
      </footer>
    </div>
  );
}
