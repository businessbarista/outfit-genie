-- Create closet_items table
CREATE TABLE public.closet_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  original_image_url TEXT NOT NULL,
  cutout_image_url TEXT,
  category TEXT NOT NULL,
  subtype TEXT,
  primary_color TEXT,
  season TEXT DEFAULT 'unknown',
  pattern TEXT DEFAULT 'unknown',
  dress_level TEXT DEFAULT 'unknown',
  layer_role TEXT DEFAULT 'unknown',
  favorite BOOLEAN DEFAULT false,
  notes TEXT
);

-- Create outfits table
CREATE TABLE public.outfits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  name TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  thumbnail_url TEXT
);

-- Create outfit_items junction table
CREATE TABLE public.outfit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outfit_id UUID NOT NULL REFERENCES public.outfits(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.closet_items(id) ON DELETE CASCADE,
  slot TEXT NOT NULL
);

-- Create suggestion_events table
CREATE TABLE public.suggestion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  suggested_item_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  action TEXT NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.closet_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outfit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestion_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for closet_items
CREATE POLICY "Users can view their own closet items"
  ON public.closet_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own closet items"
  ON public.closet_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own closet items"
  ON public.closet_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own closet items"
  ON public.closet_items FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for outfits
CREATE POLICY "Users can view their own outfits"
  ON public.outfits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own outfits"
  ON public.outfits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own outfits"
  ON public.outfits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own outfits"
  ON public.outfits FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for outfit_items (through outfit ownership)
CREATE POLICY "Users can view outfit items for their outfits"
  ON public.outfit_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.outfits
    WHERE outfits.id = outfit_items.outfit_id
    AND outfits.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert outfit items for their outfits"
  ON public.outfit_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.outfits
    WHERE outfits.id = outfit_items.outfit_id
    AND outfits.user_id = auth.uid()
  ));

CREATE POLICY "Users can update outfit items for their outfits"
  ON public.outfit_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.outfits
    WHERE outfits.id = outfit_items.outfit_id
    AND outfits.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete outfit items for their outfits"
  ON public.outfit_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.outfits
    WHERE outfits.id = outfit_items.outfit_id
    AND outfits.user_id = auth.uid()
  ));

-- RLS policies for suggestion_events
CREATE POLICY "Users can view their own suggestion events"
  ON public.suggestion_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own suggestion events"
  ON public.suggestion_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('closet-originals', 'closet-originals', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('closet-cutouts', 'closet-cutouts', false);

-- Storage policies for closet-originals
CREATE POLICY "Users can upload their own originals"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'closet-originals' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own originals"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'closet-originals' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own originals"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'closet-originals' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for closet-cutouts
CREATE POLICY "Users can upload their own cutouts"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'closet-cutouts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own cutouts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'closet-cutouts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own cutouts"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'closet-cutouts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_closet_items_updated_at
  BEFORE UPDATE ON public.closet_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_outfits_updated_at
  BEFORE UPDATE ON public.outfits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();