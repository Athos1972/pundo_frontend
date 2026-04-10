export interface BestOffer {
  price: string; currency: string; shop_id: number; shop_slug: string | null; shop_name: string;
  dist_km: number | null; is_available: boolean; crawled_at: string;
  url: string | null;
  shop_location: { lat: number; lng: number } | null;
}
export interface ProductListItem {
  id: number; slug: string; name: string | null; brand: string | null;
  category_id: number | null; thumbnail_url: string | null; images: unknown[] | null; best_offer: BestOffer | null;
}
export interface ProductListResponse { total: number; items: ProductListItem[]; }

export interface PriceHistoryItem { shop_id: number; price: string; crawled_at: string; }
export interface OfferDetail {
  shop_id: number; shop_slug: string; shop_name: string; shop_address: string | null;
  shop_location: { lat: number; lng: number } | null;
  price: string; currency: string; is_available: boolean;
  sku: string | null; url: string | null; crawled_at: string;
}
export interface ProductDetailResponse {
  id: number; slug: string;
  names: Record<string, string>; descriptions: Record<string, string> | null;
  brand: { id: number; name: string | null } | null;
  category: { id: number; name: string | null } | null;
  thumbnail_url: string | null; images: unknown[] | null; attributes: Record<string, unknown> | null;
  offers: OfferDetail[];
  price_history: PriceHistoryItem[];
}

export interface ShopListItem {
  id: number; slug: string; name: string | null; address_raw: string | null;
  location: { lat: number; lng: number } | null; dist_km: number | null;
  phone: string | null; website: string | null;
  opening_hours: Record<string, unknown> | null;
  status: string; product_count: number; last_scraped: string | null;
}
export interface ShopListResponse { items: ShopListItem[]; }
export interface TopProduct { id: number; slug: string; name: string | null; price: string; currency: string; }
export interface ShopDetailResponse extends ShopListItem { top_products: TopProduct[]; }

export interface CategoryItem {
  id: number; parent_id: number | null; taxonomy_type: string;
  external_id: string; level: string | null; name: string | null; child_count: number;
}
export interface CategoryListResponse { items: CategoryItem[]; }
