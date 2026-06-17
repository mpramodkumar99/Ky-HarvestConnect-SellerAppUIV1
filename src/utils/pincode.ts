export interface PincodeInfo {
  name:     string;
  district: string;
  state:    string;
}

// Simple in-memory cache so repeat lookups don't re-hit the API
const cache = new Map<string, PincodeInfo | null>();

export async function lookupPincode(pin: string): Promise<PincodeInfo | null> {
  if (!/^\d{6}$/.test(pin)) return null;
  if (cache.has(pin)) return cache.get(pin)!;
  try {
    const res  = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    const data = await res.json();
    if (data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
      const po: { Name: string; District: string; State: string } = data[0].PostOffice[0];
      const info: PincodeInfo = { name: po.Name, district: po.District, state: po.State };
      cache.set(pin, info);
      return info;
    }
  } catch { /* network / parse error — fall through */ }
  cache.set(pin, null);
  return null;
}

export function parseRawPincodes(raw: string): string[] {
  return [...new Set(
    raw.split(',')
      .map(p => p.trim())
      .filter(p => /^\d{6}$/.test(p))
  )];
}
