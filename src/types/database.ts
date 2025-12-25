export interface ClosetItem {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  original_image_url: string;
  cutout_image_url: string | null;
  category: string;
  subtype: string | null;
  primary_color: string | null;
  season: string;
  pattern: string;
  dress_level: string;
  layer_role: string;
  favorite: boolean;
  notes: string | null;
}

export interface Outfit {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  name: string | null;
  source: string;
  thumbnail_url: string | null;
}

export interface OutfitItem {
  id: string;
  outfit_id: string;
  item_id: string;
  slot: string;
}

export interface SuggestionEvent {
  id: string;
  user_id: string;
  created_at: string;
  suggested_item_ids: string[];
  action: string;
}

export interface OutfitWithItems extends Outfit {
  outfit_items: (OutfitItem & { closet_items: ClosetItem })[];
}
