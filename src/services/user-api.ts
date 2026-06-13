// Android emulator routes to the host machine via 10.0.2.2, not localhost
const BASE_URL = 'http://10.0.2.2:3002';

// ── Types (mirror HC_UserSvc/src/types.ts) ────────────────────────────────────

export type UserType = 'buyer' | 'seller';
export type SellerType = 'farmer' | 'artisan' | 'dairy' | 'homefood';

export interface User {
  id: string;
  name: string;
  phone: string;       // E.164 format: +919876543210
  email?: string;
  type: UserType;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  id: string;
  userId: string;
  label: string;       // 'Home' | 'Work' | 'Other' | custom
  line1: string;
  line2?: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  lat: number;
  lng: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Seller {
  id: string;
  userId?: string;
  name: string;
  type: SellerType;
  phone: string;
  email?: string;
  location: string;
  pincode: string;
  lat: number;
  lng: number;
  fssaiNumber?: string;
  verified: boolean;
  verifiedAt?: string;
  documentUrls: string[];
  createdAt: string;
  updatedAt: string;
}

// Input types
export type CreateUserInput = Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'verified'>;
export type UpdateUserInput = Partial<Omit<CreateUserInput, 'phone'>>;

export type CreateAddressInput = Omit<Address, 'id' | 'userId' | 'lat' | 'lng' | 'createdAt' | 'updatedAt'>;
export type UpdateAddressInput = Partial<CreateAddressInput>;

export type CreateSellerInput = Omit<
  Seller,
  'id' | 'lat' | 'lng' | 'verified' | 'verifiedAt' | 'documentUrls' | 'createdAt' | 'updatedAt'
>;
export type UpdateSellerInput = Partial<Omit<CreateSellerInput, 'phone'>>;

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
    const msg = body.error?.title ?? 'User service error';
    throw new Error(String(msg));
  }

  return body.data as T;
}

// ── User API ──────────────────────────────────────────────────────────────────

export async function createUser(input: CreateUserInput): Promise<User> {
  return request<User>('/v1/users', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getUser(id: string): Promise<User> {
  return request<User>(`/v1/users/${id}`);
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<User> {
  return request<User>(`/v1/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

// ── Address API ───────────────────────────────────────────────────────────────

export async function listAddresses(userId: string): Promise<Address[]> {
  const result = await request<Address[]>(`/v1/users/${userId}/addresses`);
  return result ?? [];
}

export async function addAddress(userId: string, input: CreateAddressInput): Promise<Address> {
  return request<Address>(`/v1/users/${userId}/addresses`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateAddress(
  userId: string,
  addrId: string,
  input: UpdateAddressInput,
): Promise<Address> {
  return request<Address>(`/v1/users/${userId}/addresses/${addrId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteAddress(userId: string, addrId: string): Promise<void> {
  return request<void>(`/v1/users/${userId}/addresses/${addrId}`, {
    method: 'DELETE',
  });
}

// ── Seller API ────────────────────────────────────────────────────────────────

export async function listSellers(filters?: {
  type?: SellerType;
  verified?: boolean;
}): Promise<Seller[]> {
  const params = new URLSearchParams();
  if (filters?.type !== undefined)     params.set('type', filters.type);
  if (filters?.verified !== undefined) params.set('verified', String(filters.verified));

  const qs = params.toString();
  const result = await request<Seller[]>(`/v1/sellers${qs ? `?${qs}` : ''}`);
  return result ?? [];
}

export async function getSeller(id: string): Promise<Seller> {
  return request<Seller>(`/v1/sellers/${id}`);
}

export async function createSeller(input: CreateSellerInput): Promise<Seller> {
  return request<Seller>('/v1/sellers', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateSeller(id: string, input: UpdateSellerInput): Promise<Seller> {
  return request<Seller>(`/v1/sellers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
