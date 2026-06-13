// Android emulator routes to the host machine via 10.0.2.2, not localhost
const BASE_URL = 'http://10.0.2.2:3002';

// ── Types (mirror HC_UserSvc/src/types.ts) ────────────────────────────────────

export type UserType   = 'buyer' | 'seller';
export type SellerType = 'farmer' | 'artisan' | 'dairy' | 'homefood' | 'trades';
export type ShipsTo    = 'mandal' | 'district' | 'state' | 'national';
export type SellerRole   = 'owner' | 'manager' | 'staff';
export type MemberStatus = 'active' | 'pending';

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
  description?: string;
  imageUrl?: string;
  location: string;
  pincode: string;
  lat: number;
  lng: number;
  deliveryZones: ShipsTo[];
  fssaiNumber?: string;
  verified: boolean;
  verifiedAt?: string;
  documentUrls: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SellerMember {
  id: string;
  sellerId: string;
  userId?: string;
  name: string;
  phone: string;
  role: SellerRole;
  status: MemberStatus;
  invitedAt: string;
  joinedAt?: string;
}

// accountNumber is always masked (···XXXX) when received from the API
export interface BankAccount {
  id: string;
  sellerId: string;
  accountHolderName: string;
  accountNumber: string;   // masked: ···1234
  ifscCode: string;
  bankName: string;
  upiId?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Input types ───────────────────────────────────────────────────────────────

export type CreateUserInput = Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'verified'>;
export type UpdateUserInput = Partial<Omit<CreateUserInput, 'phone'>>;

export type CreateAddressInput = Omit<Address, 'id' | 'userId' | 'lat' | 'lng' | 'createdAt' | 'updatedAt'>;
export type UpdateAddressInput = Partial<CreateAddressInput>;

export type CreateSellerInput = Omit<
  Seller,
  'id' | 'lat' | 'lng' | 'verified' | 'verifiedAt' | 'documentUrls' | 'createdAt' | 'updatedAt'
>;
export type UpdateSellerInput = Partial<Omit<CreateSellerInput, 'phone'>>;

export interface CreateSellerMemberInput {
  name: string;
  phone: string;
  role: SellerRole;
}
export interface UpdateSellerMemberInput {
  role: SellerRole;
}

export interface CreateBankAccountInput {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  upiId?: string;
}
export type UpdateBankAccountInput = Partial<CreateBankAccountInput>;

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
  userId?: string;
  phone?: string;
}): Promise<Seller[]> {
  const params = new URLSearchParams();
  if (filters?.type     !== undefined) params.set('type',     filters.type);
  if (filters?.verified !== undefined) params.set('verified', String(filters.verified));
  if (filters?.userId   !== undefined) params.set('userId',   filters.userId);
  if (filters?.phone    !== undefined) params.set('phone',    filters.phone);

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

// Returns all seller accounts linked to a user — used by the multi-store switcher
export async function getSellersByUser(userId: string): Promise<Seller[]> {
  const result = await request<Seller[]>(`/v1/users/${userId}/sellers`);
  return result ?? [];
}

// ── Seller document API ───────────────────────────────────────────────────────

export async function addDocument(sellerId: string, url: string): Promise<Seller> {
  return request<Seller>(`/v1/sellers/${sellerId}/documents`, {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

export async function removeDocument(sellerId: string, url: string): Promise<Seller> {
  return request<Seller>(`/v1/sellers/${sellerId}/documents`, {
    method: 'DELETE',
    body: JSON.stringify({ url }),
  });
}

// ── Seller team member API ────────────────────────────────────────────────────

export async function listMembers(sellerId: string): Promise<SellerMember[]> {
  const result = await request<SellerMember[]>(`/v1/sellers/${sellerId}/members`);
  return result ?? [];
}

export async function inviteMember(
  sellerId: string,
  input: CreateSellerMemberInput,
): Promise<SellerMember> {
  return request<SellerMember>(`/v1/sellers/${sellerId}/members`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateMemberRole(
  sellerId: string,
  memberId: string,
  input: UpdateSellerMemberInput,
): Promise<SellerMember> {
  return request<SellerMember>(`/v1/sellers/${sellerId}/members/${memberId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

// Called when the invited user logs in and accepts their invite.
// userId is the logged-in user's ID — sent as X-User-Id header.
export async function activateMember(
  sellerId: string,
  memberId: string,
  userId: string,
): Promise<SellerMember> {
  return request<SellerMember>(`/v1/sellers/${sellerId}/members/${memberId}/activate`, {
    method: 'PATCH',
    headers: { 'X-User-Id': userId },
  });
}

export async function removeMember(sellerId: string, memberId: string): Promise<void> {
  return request<void>(`/v1/sellers/${sellerId}/members/${memberId}`, {
    method: 'DELETE',
  });
}

// ── Seller bank account API ───────────────────────────────────────────────────

export async function getBankAccount(sellerId: string): Promise<BankAccount> {
  return request<BankAccount>(`/v1/sellers/${sellerId}/bank-account`);
}

// Upsert — safe to call on first save or to replace existing account details
export async function setBankAccount(
  sellerId: string,
  input: CreateBankAccountInput,
): Promise<BankAccount> {
  return request<BankAccount>(`/v1/sellers/${sellerId}/bank-account`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateBankAccount(
  sellerId: string,
  input: UpdateBankAccountInput,
): Promise<BankAccount> {
  return request<BankAccount>(`/v1/sellers/${sellerId}/bank-account`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
