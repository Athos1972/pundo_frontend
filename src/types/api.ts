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
  // Enriched fields (backend v2) — optional for backward compat with test mocks
  review_stats?: { average_stars: number; total_count: number } | null;
  shop_type?: ShopTypeRead | null;
  spoken_languages?: string[] | null;
  language_votes?: VoteAggregateItem[];
  is_open_now?: boolean | null;
  has_parking?: boolean | null;
  has_own_delivery?: boolean | null;
  is_online_only?: boolean;
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

export interface ShopTypeRead {
  id: number
  canonical: string
  google_types: string[]
  translations: { de?: string | null; ru?: string | null; el?: string | null; ar?: string | null; he?: string | null }
}

export interface ShopDetailResponse extends ShopListItem {
  top_products: TopProduct[];
  opening_hours_raw?: OpeningHoursRaw | null;
  description?: string | null;
  // shop_type and spoken_languages are now part of ShopListItem (enriched fields)
}

export interface CategoryItem {
  id: number; parent_id: number | null; taxonomy_type: string;
  external_id: string; level: string | null; name: string | null; child_count: number;
}
export interface CategoryListResponse { items: CategoryItem[]; }

// ─── Shop Review Preview (for Reviews Popover) ───────────────────────────────

export interface ShopReviewPreview {
  id: number
  user_display_name: string
  stars: 1 | 2 | 3 | 4 | 5
  comment: string | null
  created_at: string
}

export interface ShopReviewsResponse {
  reviews: ShopReviewPreview[]
}

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

// ─── Spotted-In ───────────────────────────────────────────────────────────────

export interface SpottedCreateResponse {
  spotted_id: number
  status: 'pending'
  message: string
}

export interface SpottedUpload {
  spotted_id: number
  status: 'pending' | 'successful' | 'rejected'
  created_at: string
  shop?: {
    shop_id: number
    shop_name: string
  }
  product?: {
    product_id: number
    product_name: string
  }
  detected_price?: number | null
  detected_currency?: string | null
  error_reason?: string | null
}

export interface SpottedListResponse {
  spotted: SpottedUpload[]
  total: number
}

// ─── Community Votes (F3500 + F3400) ─────────────────────────────────────────

export type AttributeType =
  | 'language_en' | 'language_de' | 'language_el'
  | 'language_ru' | 'language_ar' | 'language_he'
  | 'parking' | 'price_level' | 'delivery'
  | 'click_collect' | 'reservation_required' | 'terrace'

export interface VoteAggregateItem {
  attribute_type: AttributeType
  weighted_avg: number
  vote_count: number
  my_value: number | null
}

export interface ShopVotesResponse {
  shop_id: number
  aggregates: VoteAggregateItem[]
}

export interface VoteUpsertResponse {
  vote_id: number
  shop_id: number
  attribute_type: string
  value: number
  is_new: boolean
  credits_awarded: number
  new_credit_total: number
}

// ─── Trust Profile (F3200) ────────────────────────────────────────────────────

export interface BadgeOut {
  badge_type: string
  awarded_at: string
}

export interface TrustProfileResponse {
  user_id: number
  trust_level: number
  credits: number
  badges: BadgeOut[]
}

// ─── Favorites & Alerts ───────────────────────────────────────────────────────

export type AlertInterval = 'sofort' | 'täglich' | 'wöchentlich' | 'nie'

export interface FavoriteListItem {
  id: number
  product_id: number
  product_slug: string
  product_name: string
  brand: string | null
  image_url: string | null
  best_offer_price: string | null
  best_offer_currency: string
  best_offer_shop: string | null
  best_offer_dist_km: number | null
  alert_interval: AlertInterval | null
}

export interface FavoriteListResponse {
  items: FavoriteListItem[]
  total: number
  page: number
  limit: number
}

export interface FavoriteStatusResponse {
  is_favorite: boolean
  favorite_id: number | null
  alert_interval: AlertInterval | null
}

export interface NotificationSettings {
  default_alert_interval: AlertInterval
}

export interface SimilaritySearchQuota {
  used_today: number
  limit_daily: number
  used_week: number
  limit_weekly: number
  used_month: number
  limit_monthly: number
}
