import { Platform } from 'react-native';

const BASE_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:3005'
  : 'http://localhost:3005';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });

  if (res.status === 204) return undefined as T;

  const body = await res.json() as {
    success: boolean;
    data?: T;
    error?: { title: string };
  };

  if (!body.success) {
    throw new Error(body.error?.title ?? 'Payment service error');
  }

  return body.data as T;
}

export type PayoutStatus = 'pending' | 'processing' | 'paid' | 'rejected';

export interface Payout {
  id: string;
  sellerId: string;
  amount: number;      // paise
  status: PayoutStatus;
  bankAccountId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export async function listPayouts(sellerId: string): Promise<Payout[]> {
  const result = await request<Payout[]>(`/v1/payouts?sellerId=${encodeURIComponent(sellerId)}`);
  return result ?? [];
}

export async function requestPayout(input: {
  sellerId: string;
  amount: number;
  bankAccountId?: string;
  notes?: string;
}): Promise<Payout> {
  return request<Payout>('/v1/payouts', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
