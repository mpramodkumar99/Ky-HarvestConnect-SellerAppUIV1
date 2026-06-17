// Razorpay IFSC API — free, unauthenticated
// GET https://ifsc.razorpay.com/{IFSC_CODE}
// Returns 200 with bank details or 404 for invalid codes

export interface IFSCInfo {
  bank:    string;
  branch:  string;
  address: string;
  city:    string;
  state:   string;
}

const cache = new Map<string, IFSCInfo | null>();

export async function lookupIFSC(code: string): Promise<IFSCInfo | null> {
  const key = code.toUpperCase().trim();
  if (cache.has(key)) return cache.get(key) ?? null;
  try {
    const res = await fetch(`https://ifsc.razorpay.com/${key}`);
    if (!res.ok) { cache.set(key, null); return null; }
    const data = await res.json() as Record<string, string>;
    const info: IFSCInfo = {
      bank:    data['BANK']    ?? '',
      branch:  data['BRANCH']  ?? '',
      address: data['ADDRESS'] ?? '',
      city:    data['CITY']    ?? '',
      state:   data['STATE']   ?? '',
    };
    cache.set(key, info);
    return info;
  } catch {
    return null;
  }
}

export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
