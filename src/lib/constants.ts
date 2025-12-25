export const CATEGORIES = [
  'tops',
  'bottoms',
  'outerwear',
  'shoes',
  'accessories',
  'underwear',
] as const;

export const SUBTYPES: Record<string, string[]> = {
  tops: ['t-shirt', 'polo', 'button-up', 'sweater', 'hoodie', 'tank-top', 'henley'],
  bottoms: ['jeans', 'chinos', 'shorts', 'sweatpants', 'dress-pants', 'joggers'],
  outerwear: ['jacket', 'blazer', 'coat', 'vest', 'parka', 'bomber'],
  shoes: ['sneakers', 'boots', 'loafers', 'sandals', 'dress-shoes', 'running-shoes'],
  accessories: ['hat', 'belt', 'watch', 'sunglasses', 'scarf', 'tie', 'bag'],
  underwear: ['boxers', 'briefs', 'undershirt', 'socks'],
};

export const COLORS = [
  'black',
  'white',
  'gray',
  'navy',
  'blue',
  'red',
  'green',
  'brown',
  'beige',
  'cream',
  'olive',
  'burgundy',
  'pink',
  'yellow',
  'orange',
  'purple',
  'multicolor',
] as const;

export const SEASONS = ['summer', 'spring-fall', 'winter', 'all-season', 'unknown'] as const;

export const PATTERNS = ['solid', 'patterned', 'unknown'] as const;

export const DRESS_LEVELS = ['casual', 'smart-casual', 'dressy', 'unknown'] as const;

export const LAYER_ROLES = ['base', 'mid', 'outer', 'unknown'] as const;

export const SLOTS = ['top', 'bottom', 'shoes', 'mid_layer', 'outerwear', 'accessory'] as const;

export type Category = typeof CATEGORIES[number];
export type Color = typeof COLORS[number];
export type Season = typeof SEASONS[number];
export type Pattern = typeof PATTERNS[number];
export type DressLevel = typeof DRESS_LEVELS[number];
export type LayerRole = typeof LAYER_ROLES[number];
export type Slot = typeof SLOTS[number];
