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
      type RawPO = { Name: string; Block: string; BranchType: string; District: string; State: string };
      const offices: RawPO[] = data[0].PostOffice;
      const po = offices[0];
      let name: string;
      if (po.BranchType === 'Head Post Office') {
        name = po.Name;
      } else if (po.Block === po.District) {
        // Block and District are the same (e.g. "Nizamabad") — not useful as a locality.
        // Use the Sub Post Office name instead, which reflects the actual mandal/town.
        const subPO = offices.find(o => o.BranchType === 'Sub Post Office');
        name = subPO ? subPO.Name : po.Block;
      } else {
        name = po.Block;
      }
      const info: PincodeInfo = { name, district: po.District, state: po.State };
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
