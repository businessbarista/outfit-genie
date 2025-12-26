-- Make storage buckets public so images can be displayed
UPDATE storage.buckets SET public = true WHERE id = 'closet-originals';
UPDATE storage.buckets SET public = true WHERE id = 'closet-cutouts';