export type StoreSettings = {
  id: number;
  name: string;
  logo_url: string | null;
  is_open: boolean;
  delivery_fee: number;
  delivery_price_per_km: number;
  delivery_zones: Array<{ id: string; neighborhood: string; distance_km: number }>;
  minimum_order_value: number;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
};

export type MenuProduct = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  stock_quantity: number | null;
  display_order: number;
  addon_groups: MenuAddonGroup[];
};

export type MenuAddon = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  display_order: number;
};

export type MenuAddonGroup = {
  id: string;
  name: string;
  description: string | null;
  min_selections: number;
  max_selections: number;
  display_order: number;
  addons: MenuAddon[];
};

export type MenuCategory = {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  products: MenuProduct[];
};

export type PublicMenuData = {
  settings: StoreSettings;
  categories: MenuCategory[];
};
