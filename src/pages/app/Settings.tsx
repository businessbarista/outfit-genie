import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { LogOut, Trash2, Loader2 } from 'lucide-react';

export default function Settings() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleDeleteAllData = async () => {
    if (!user) return;

    setDeleting(true);
    try {
      // Delete all closet items (cascade deletes outfit_items)
      const { error: itemsError } = await supabase
        .from('closet_items')
        .delete()
        .eq('user_id', user.id);

      if (itemsError) throw itemsError;

      // Delete all outfits
      const { error: outfitsError } = await supabase
        .from('outfits')
        .delete()
        .eq('user_id', user.id);

      if (outfitsError) throw outfitsError;

      // Delete suggestion events
      const { error: eventsError } = await supabase
        .from('suggestion_events')
        .delete()
        .eq('user_id', user.id);

      if (eventsError) throw eventsError;

      // Delete storage files
      const { data: originals } = await supabase.storage
        .from('closet-originals')
        .list(user.id);

      if (originals) {
        for (const folder of originals) {
          const { data: files } = await supabase.storage
            .from('closet-originals')
            .list(`${user.id}/${folder.name}`);
          
          if (files) {
            await supabase.storage
              .from('closet-originals')
              .remove(files.map((f) => `${user.id}/${folder.name}/${f.name}`));
          }
        }
      }

      const { data: cutouts } = await supabase.storage
        .from('closet-cutouts')
        .list(user.id);

      if (cutouts) {
        for (const folder of cutouts) {
          const { data: files } = await supabase.storage
            .from('closet-cutouts')
            .list(`${user.id}/${folder.name}`);
          
          if (files) {
            await supabase.storage
              .from('closet-cutouts')
              .remove(files.map((f) => `${user.id}/${folder.name}/${f.name}`));
          }
        }
      }

      toast({ title: 'All data deleted', description: 'Your closet has been cleared.' });
    } catch (error) {
      console.error('Delete error:', error);
      toast({ title: 'Failed to delete data', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Manage your account settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="font-medium">Email</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions that affect your data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full gap-2">
                <Trash2 className="h-4 w-4" />
                Delete All My Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete all data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all your clothing items, outfits, and preferences. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAllData}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Everything'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
