// Android emulator routes to the host machine via 10.0.2.2, not localhost
const BASE_URL = 'http://10.0.2.2:3003';

// ── Types (mirror HC_CatalogSvc/src/types.ts) ────────────────────────────────

export type Category =
  | 'farm_products'
  | 'processed_foods'
  | 'foods'
  | 'arts_handmade'
  | 'services';

export type SubCategory =
  | 'grains_staples'
  | 'vegetables_spices'
  | 'animal_products'
  | 'pastes_powders'
  | 'oils'
  | 'preserved_packaged'
  | 'furniture'
  | 'iron_works'
  | 'vendor_products'
  | 'dealer_products'
  | 'materials_finishes'
  | 'utilities'
  | 'beauty_wellness'
  | 'technical'
  | 'construction_finishing'
  | 'mechanical'
  | 'rentals';

export type ShipsTo = 'mandal' | 'district' | 'state' | 'national';
export type ProductStatus = 'draft' | 'active' | 'archived';

export const LOW_STOCK_THRESHOLD = 10;

export interface CatalogProduct {
  id: string;
  name: string;
  description: string;
  category: Category;
  subCategory: SubCategory;
  price: number;          // paise — divide by 100 for ₹ display
  originalPrice?: number; // paise
  unit: string;
  stockQuantity: number;  // units available; 0 = out of stock; 9999 for services
  sellerId: string;
  sellerName: string;
  location: string;
  inStock: boolean;       // server-derived: stockQuantity > 0
  isVerified: boolean;    // admin-controlled, read-only from seller perspective
  isHandmade: boolean;
  shipsTo: ShipsTo;
  images: string[];       // ordered list of image URLs, max 5
  status: ProductStatus;
  rating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

// sellerId/sellerName/location are set at creation; not editable after.
// isVerified and inStock are server-managed; not included in either input type.
export type CreateProductInput = Omit<CatalogProduct, 'id' | 'createdAt' | 'updatedAt' | 'isVerified' | 'inStock'>;
export type UpdateProductInput = Partial<Omit<CreateProductInput, 'sellerId' | 'sellerName' | 'location'>>;

// ── Metadata (for form pickers) ───────────────────────────────────────────────

export const CATEGORIES: { value: Category; label: string; icon: string }[] = [
  { value: 'farm_products',    label: 'Farm Products',    icon: '🌾' },
  { value: 'processed_foods',  label: 'Processed Foods',  icon: '🫙' },
  { value: 'foods',            label: 'Foods',            icon: '🍱' },
  { value: 'arts_handmade',    label: 'Arts & Handmade',  icon: '🪡' },
  { value: 'services',         label: 'Services',         icon: '🔧' },
];

export const SUB_CATEGORIES_BY_CATEGORY: Record<Category, { value: SubCategory; label: string }[]> = {
  farm_products: [
    { value: 'grains_staples',     label: 'Grains & Staples' },
    { value: 'vegetables_spices',  label: 'Vegetables & Spices' },
    { value: 'animal_products',    label: 'Animal Products' },
  ],
  processed_foods: [
    { value: 'pastes_powders',     label: 'Pastes & Powders' },
    { value: 'oils',               label: 'Oils' },
  ],
  foods: [
    { value: 'preserved_packaged', label: 'Preserved & Packaged' },
  ],
  arts_handmade: [
    { value: 'furniture',          label: 'Furniture' },
    { value: 'iron_works',         label: 'Iron Works' },
    { value: 'vendor_products',    label: 'Vendor Products' },
    { value: 'dealer_products',    label: 'Dealer Products' },
    { value: 'materials_finishes', label: 'Materials & Finishes' },
  ],
  services: [
    { value: 'utilities',              label: 'Utilities' },
    { value: 'beauty_wellness',        label: 'Beauty & Wellness' },
    { value: 'technical',              label: 'Technical' },
    { value: 'construction_finishing', label: 'Construction' },
    { value: 'mechanical',             label: 'Mechanical' },
    { value: 'rentals',                label: 'Rentals' },
  ],
};

export const SHIPS_TO_OPTIONS: { value: ShipsTo; label: string }[] = [
  { value: 'mandal',   label: 'Mandal' },
  { value: 'district', label: 'District' },
  { value: 'state',    label: 'State' },
  { value: 'national', label: 'National' },
];

export const COMMON_UNITS = ['kg', '500g', '250g', 'litre', '500ml', 'piece', 'dozen', 'bundle'];

// ── HTTP helpers ──────────────────────────────────────────────────────────────

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });

  if (res.status === 204) return undefined as T;

  const body = await res.json() as {
    success: boolean;
    data?: T;
    error?: { title: string; detail?: unknown };
  };

  if (!body.success) {
    const msg = body.error?.title ?? 'Catalog service error';
    throw new Error(String(msg));
  }

  return body.data as T;
}

// ── API functions ─────────────────────────────────────────────────────────────

export async function listProducts(filters?: {
  category?: Category;
  subCategory?: SubCategory;
  shipsTo?: ShipsTo;
  sellerId?: string;
  status?: ProductStatus;
}): Promise<CatalogProduct[]> {
  const params = new URLSearchParams();
  if (filters?.category)    params.set('category',    filters.category);
  if (filters?.subCategory) params.set('subCategory', filters.subCategory);
  if (filters?.shipsTo)     params.set('shipsTo',     filters.shipsTo);
  if (filters?.sellerId)    params.set('sellerId',    filters.sellerId);
  if (filters?.status)      params.set('status',      filters.status);

  const qs = params.toString();
  const result = await request<CatalogProduct[]>(`/v1/products${qs ? `?${qs}` : ''}`);
  return result ?? [];
}

export async function getProduct(id: string): Promise<CatalogProduct> {
  return request<CatalogProduct>(`/v1/products/${id}`);
}

export async function createProduct(input: CreateProductInput): Promise<CatalogProduct> {
  return request<CatalogProduct>('/v1/products', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// sellerId is sent as X-Seller-Id for server-side ownership verification.
export async function updateProduct(
  id: string,
  input: UpdateProductInput,
  sellerId: string,
): Promise<CatalogProduct> {
  return request<CatalogProduct>(`/v1/products/${id}`, {
    method: 'PATCH',
    headers: { 'X-Seller-Id': sellerId },
    body: JSON.stringify(input),
  });
}

export async function deleteProduct(id: string, sellerId: string): Promise<void> {
  return request<void>(`/v1/products/${id}`, {
    method: 'DELETE',
    headers: { 'X-Seller-Id': sellerId },
  });
}
