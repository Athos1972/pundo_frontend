export type PriceType = 'fixed' | 'on_request' | 'free' | 'variable'

export interface ProductImages {
  thumb:    string | null
  card:     string | null
  carousel: string | null
  detail:   string | null
  orig:     string | null
}

export interface BestOffer {
  price: string | null; currency: string; price_type: PriceType; price_note: string | null;
  shop_id: number; shop_slug: string | null; shop_name: string;
  dist_km: number | null; is_available: boolean; crawled_at: string;
  url: string | null;
  shop_location: { lat: number; lng: number } | null;
  shop_type?: 'local' | 'online_only';
  delivery_available?: boolean;
}
export interface ProductListItem {
  id: number; slug: string; names: Record<string, string>; brand: string | null;
  category_id: number | null; thumbnail_url: string | null; images: ProductImages | null; best_offer: BestOffer | null;
}
export interface ProductListResponse { total: number; items: ProductListItem[]; }

export interface PriceHistoryItem { shop_id: number; price: string; crawled_at: string; }
export interface OfferDetail {
  shop_id: number; shop_slug: string; shop_name: string; shop_address: string | null;
  shop_location: { lat: number; lng: number } | null;
  price: string | null; currency: string; price_type: PriceType; price_note: string | null;
  shop_phone: string | null;
  is_available: boolean;
  sku: string | null; url: string | null; crawled_at: string;
  shop_type?: 'local' | 'online_only';
  delivery_available?: boolean;
}
export interface ProductDetailResponse {
  id: number; slug: string;
  names: Record<string, string>; descriptions: Record<string, string> | null;
  brand: { id: number; name: string | null } | null;
  category: { id: number; name: string | null } | null;
  thumbnail_url: string | null; images: ProductImages | null; attributes: Record<string, unknown> | null;
  offers: OfferDetail[];
  price_history: PriceHistoryItem[];
}

export interface ShopListItem {
  id: number; slug: string; name: string | null; address_raw: string | null;
  location: { lat: number; lng: number } | null; dist_km: number | null;
  phone: string | null; whatsapp_number: string | null; whatsapp_url: string | null; website: string | null;
  opening_hours: Record<string, unknown> | null;
  status: string; product_count: number; last_scraped: string | null;
}
export interface ShopListResponse { items: ShopListItem[]; }
export interface TopProduct { id: number; slug: string; name: string | null; price: string | null; currency: string; price_type: PriceType; }

export interface OpeningHoursPeriodTime { day: number; hour: number; minute: number; }
export interface OpeningHoursPeriod { open: OpeningHoursPeriodTime; close: OpeningHoursPeriodTime; }
export interface OpeningHoursSpecialDay {
  date: string;
  isOpen: boolean;
  openingHours?: { open: string; close: string };
}
export interface OpeningHoursRaw {
  periods?: OpeningHoursPeriod[];
  weekdayDescriptions?: string[];
  specialDays?: OpeningHoursSpecialDay[];
}

export interface ShopDetailResponse extends ShopListItem {
  top_products: TopProduct[];
  spoken_languages?: string[];
  opening_hours_raw?: OpeningHoursRaw | null;
  description?: string | null;
}

export interface CategoryItem {
  id: number; parent_id: number | null; taxonomy_type: string;
  external_id: string; level: string | null; name: string | null; child_count: number;
}
export interface CategoryListResponse { items: CategoryItem[]; }

// ─── Reviews ──────────────────────────────────────────────────────────────────

export interface ReviewPhoto {
  id: number
  url: string
  thumbnail_url: string | null
  status: 'pending' | 'approved' | 'rejected'
  moderation_reason: string | null
  moderation_categories: string[] | null
}

export interface Review {
  id: number
  user_id: number
  user_display_name: string
  entity_type: 'product' | 'shop'
  entity_id: number
  stars: 1 | 2 | 3 | 4 | 5
  comment: string | null
  photos: ReviewPhoto[]
  is_visible: boolean
  created_at: string
  updated_at: string
}

export interface ReviewStats {
  average_stars: number
  total_count: number
  distribution: Record<string, number>   // keys: "1".."5"
}

export interface PhotoStatusItem {
  photo_id: number
  status: 'pending' | 'approved' | 'rejected'
  moderation_reason: string | null
  moderation_categories: string[] | null
}

export interface CreateReviewRequest {
  entity_type: 'product' | 'shop'
  entity_id: number
  stars: number
  comment?: string
}

export interface UpdateReviewRequest {
  stars?: number
  comment?: string
}
