// Android emulator routes to the host machine via 10.0.2.2, not localhost
const BASE_URL = 'http://10.0.2.2:3004';

// ── Types (mirror HC_OrderSvc/src/types.ts) ───────────────────────────────────

export type OrderStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'processing'
  | 'dispatched'
  | 'in_transit'
  | 'delivered'
  | 'cancelled'
  | 'refund_initiated'
  | 'refunded';

export type PaymentMethod = 'upi' | 'card' | 'cod' | 'wallet';

export interface OrderItem {
  productId:   string;
  productName: string;
  sellerId:    string;
  sellerName:  string;
  quantity:    number;
  unitPrice:   number;  // paise — snapshot at order time
  totalPrice:  number;  // paise — unitPrice × quantity
  unit:        string;
  imageUrl?:   string;
}

export interface DeliveryAddress {
  label:    string;
  line1:    string;
  line2?:   string;
  city:     string;
  district: string;
  state:    string;
  pincode:  string;
  lat:      number;
  lng:      number;
}

export interface Order {
  id:                 string;
  buyerId:            string;
  buyerName:          string;
  buyerPhone:         string;
  items:              OrderItem[];
  deliveryAddress:    DeliveryAddress;
  subtotal:           number;          // paise
  deliveryFee:        number;          // paise
  discount:           number;          // paise
  total:              number;          // paise
  paymentMethod:      PaymentMethod;
  paymentId?:         string;
  status:             OrderStatus;
  trackingId?:        string;
  estimatedDelivery?: string;
  cancelledAt?:       string;
  cancelReason?:      string;
  deliveredAt?:       string;
  createdAt:          string;
  updatedAt:          string;
}

// ── Seller UI helpers ─────────────────────────────────────────────────────────

export type SellerTab = 'new' | 'accepted' | 'dispatched' | 'delivered' | 'cancelled';

export function toSellerTab(status: OrderStatus): SellerTab {
  if (status === 'confirmed' || status === 'pending_payment') return 'new';
  if (status === 'processing') return 'accepted';
  if (status === 'dispatched' || status === 'in_transit') return 'dispatched';
  if (status === 'delivered') return 'delivered';
  return 'cancelled';
}

export function payMethodLabel(method: PaymentMethod): string {
  if (method === 'upi')    return '📱 UPI';
  if (method === 'cod')    return '💵 COD';
  if (method === 'card')   return '💳 Card';
  if (method === 'wallet') return '👛 Wallet';
  return method;
}

export function formatOrderDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

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
    const msg = body.error?.title ?? 'Order service error';
    throw new Error(String(msg));
  }

  return body.data as T;
}

// ── API functions ─────────────────────────────────────────────────────────────

export async function listOrders(filters?: {
  sellerId?: string;
  buyerId?: string;
  status?: OrderStatus;
}): Promise<Order[]> {
  const params = new URLSearchParams();
  if (filters?.sellerId) params.set('sellerId', filters.sellerId);
  if (filters?.buyerId)  params.set('buyerId',  filters.buyerId);
  if (filters?.status)   params.set('status',   filters.status);
  const qs = params.toString();
  const result = await request<Order[]>(`/v1/orders${qs ? `?${qs}` : ''}`);
  return result ?? [];
}

export async function getOrder(id: string): Promise<Order> {
  return request<Order>(`/v1/orders/${id}`);
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  return request<Order>(`/v1/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function cancelOrder(id: string, reason: string): Promise<Order> {
  return request<Order>(`/v1/orders/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}
