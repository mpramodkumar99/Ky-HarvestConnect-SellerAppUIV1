import { Platform } from 'react-native';

const BASE_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:3001'
  : 'http://localhost:3001';

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.title ?? 'Request failed');
  return json.data as T;
}

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (raw.startsWith('+')) return raw;
  return `+91${digits}`;
}

export interface AuthSession {
  token:     string;
  userId:    string;
  userType:  'buyer' | 'seller';
  sessionId: string;
  expiresAt: string;
}

export async function requestOtp(phone: string): Promise<{ message: string; phone: string }> {
  return post('/v1/auth/otp/request', { phone });
}

export async function verifyOtp(phone: string, code: string): Promise<AuthSession> {
  return post('/v1/auth/otp/verify', { phone, code });
}

export async function verifyToken(
  token: string,
): Promise<{ valid: boolean; userId?: string; phone?: string; userType?: string }> {
  return post('/v1/auth/token/verify', { token });
}

export async function revokeSession(sessionId: string, token: string): Promise<void> {
  await fetch(`${BASE_URL}/v1/auth/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}
