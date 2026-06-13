import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { SellerType, ShipsTo, SellerRole, MemberStatus } from '@/services/user-api';
import { getSeller, listMembers } from '@/services/user-api';

// Re-export so screens can import StoreRole from here without coupling to user-api
export type { SellerRole as StoreRole };

// Store mirrors the Seller type from UserSvc with UI-only additions (category, icon, role, counts).
// id must match the sellerId used in catalog-svc (e.g. 'seller-112').
export interface Store {
  id: string;             // sellerId — matches catalog-svc seed IDs
  name: string;
  type: SellerType;       // from UserSvc Seller.type
  category: string;       // human-readable label for UI display
  icon: string;
  description?: string;   // store bio shown in Store Settings
  imageUrl?: string;      // store logo / photo URL
  location: string;
  phone: string;
  pincode: string;
  deliveryZones: ShipsTo[]; // seller-level delivery coverage
  verified: boolean;
  fssaiNumber?: string;
  role: SellerRole;       // this user's role within the seller account
  memberCount: number;
  productCount: number;
  ordersToday: number;
  revenueToday: string;
}

// Mirrors SellerMember from UserSvc; avatar is a UI-only addition (initials fallback)
export interface TeamMember {
  id: string;
  sellerId: string;
  userId?: string;
  name: string;
  phone: string;
  role: SellerRole;
  status: MemberStatus;
  avatar: string;         // UI-only: initials, e.g. 'SR'
  invitedAt: string;
  joinedAt?: string;
}

interface StoreContextValue {
  stores: Store[];
  activeStore: Store;
  teamMembers: TeamMember[];     // live members for the active store only
  loadingStores: boolean;
  loadingTeam: boolean;
  setActiveStore: (store: Store) => void;
  refreshTeam: () => Promise<void>;
  refreshSeller: (id: string) => Promise<void>;
}

// ── Seed data — UI-only fields and offline fallback ───────────────────────────
// Live fields (name, type, phone, location, pincode, deliveryZones, description,
// imageUrl, verified, fssaiNumber) are overwritten by UserSvc on mount.

const STORES: Store[] = [
  {
    id: 'seller-112',
    name: 'Desi Dairy Armoor',
    type: 'dairy',
    category: 'Dairy & Animal Products',
    icon: '🥛',
    description: 'Fresh milk, curd and paneer sourced directly from our Armoor farm.',
    location: 'Armoor, Nizamabad',
    phone: '+919000000112',
    pincode: '503111',
    deliveryZones: ['mandal', 'district'],
    verified: true,
    fssaiNumber: '10019042000112',
    role: 'owner',
    memberCount: 3,
    productCount: 6,
    ordersToday: 18,
    revenueToday: '₹4,280',
  },
  {
    id: 'seller-113',
    name: 'Amma Kitchen',
    type: 'homefood',
    category: 'Home Foods & Pickles',
    icon: '🍱',
    description: 'Traditional Telangana pickles and home-made snacks made with love.',
    location: 'Nizamabad, Telangana',
    phone: '+919000000113',
    pincode: '503001',
    deliveryZones: ['mandal', 'district', 'state'],
    verified: true,
    fssaiNumber: '10019042000113',
    role: 'owner',
    memberCount: 1,
    productCount: 12,
    ordersToday: 7,
    revenueToday: '₹2,100',
  },
  {
    id: 'seller-105',
    name: 'Spice Route Nizamabad',
    type: 'farmer',
    category: 'Vegetables & Spices',
    icon: '🌶️',
    description: 'Organic turmeric, chillies and seasonal vegetables from Nizamabad district.',
    location: 'Nizamabad, Telangana',
    phone: '+919000000105',
    pincode: '503001',
    deliveryZones: ['state', 'national'],
    verified: true,
    fssaiNumber: '10019042000105',
    role: 'manager',
    memberCount: 4,
    productCount: 18,
    ordersToday: 24,
    revenueToday: '₹8,640',
  },
];

// Fallback team seed — used when UserSvc is unreachable
const TEAM_SEED: Record<string, TeamMember[]> = {
  'seller-112': [
    { id: 'm1', sellerId: 'seller-112', name: 'Sridevi Reddy',  phone: '+919876543210', role: 'owner',   status: 'active',  avatar: 'SR', invitedAt: '2023-10-01T00:00:00.000Z', joinedAt: '2023-10-01T00:00:00.000Z' },
    { id: 'm2', sellerId: 'seller-112', name: 'Ramesh Kumar',   phone: '+919123456789', role: 'manager', status: 'active',  avatar: 'RK', invitedAt: '2024-01-10T00:00:00.000Z', joinedAt: '2024-01-12T00:00:00.000Z' },
    { id: 'm3', sellerId: 'seller-112', name: 'Meena Devi',     phone: '+918765432109', role: 'staff',   status: 'pending', avatar: 'MD', invitedAt: '2026-06-10T00:00:00.000Z' },
  ],
  'seller-113': [
    { id: 'm4', sellerId: 'seller-113', name: 'Sridevi Reddy',  phone: '+919876543210', role: 'owner',   status: 'active',  avatar: 'SR', invitedAt: '2024-03-01T00:00:00.000Z', joinedAt: '2024-03-01T00:00:00.000Z' },
  ],
  'seller-105': [
    { id: 'm5', sellerId: 'seller-105', name: 'Priya Sharma',   phone: '+919988776655', role: 'owner',   status: 'active',  avatar: 'PS', invitedAt: '2024-02-01T00:00:00.000Z', joinedAt: '2024-02-01T00:00:00.000Z' },
    { id: 'm6', sellerId: 'seller-105', name: 'Sridevi Reddy',  phone: '+919876543210', role: 'manager', status: 'active',  avatar: 'SR', invitedAt: '2024-04-01T00:00:00.000Z', joinedAt: '2024-04-03T00:00:00.000Z' },
    { id: 'm7', sellerId: 'seller-105', name: 'Venkat Rao',     phone: '+918899011223', role: 'staff',   status: 'active',  avatar: 'VR', invitedAt: '2024-05-01T00:00:00.000Z', joinedAt: '2024-05-02T00:00:00.000Z' },
    { id: 'm8', sellerId: 'seller-105', name: 'Sunita Devi',    phone: '+919753124680', role: 'staff',   status: 'pending', avatar: 'SD', invitedAt: '2026-06-10T00:00:00.000Z' },
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase();
}

function mergeLiveSeller(seed: Store, live: Awaited<ReturnType<typeof getSeller>>): Store {
  return {
    ...seed,
    name:          live.name,
    type:          live.type,
    phone:         live.phone,
    location:      live.location,
    pincode:       live.pincode,
    deliveryZones: live.deliveryZones,
    description:   live.description,
    imageUrl:      live.imageUrl,
    verified:      live.verified,
    fssaiNumber:   live.fssaiNumber,
  };
}

// ── Context ───────────────────────────────────────────────────────────────────

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [storeList, setStoreList]       = useState<Store[]>(STORES);
  const [activeStoreId, setActiveStoreId] = useState<string>(STORES[0].id);
  const [teamMembers, setTeamMembers]   = useState<TeamMember[]>(TEAM_SEED[STORES[0].id] ?? []);
  const [loadingStores, setLoadingStores] = useState(false);
  const [loadingTeam, setLoadingTeam]   = useState(false);

  const activeStore = storeList.find(s => s.id === activeStoreId) ?? storeList[0];

  // Fetch live seller data for all stores on mount
  useEffect(() => {
    async function fetchAllStores() {
      setLoadingStores(true);
      try {
        const results = await Promise.all(
          STORES.map(seed => getSeller(seed.id).catch(() => null))
        );
        setStoreList(STORES.map((seed, i) => {
          const live = results[i];
          return live ? mergeLiveSeller(seed, live) : seed;
        }));
      } finally {
        setLoadingStores(false);
      }
    }
    fetchAllStores();
  }, []);

  // Fetch team members whenever active store changes
  const fetchTeam = useCallback(async (sellerId: string) => {
    setLoadingTeam(true);
    try {
      const members = await listMembers(sellerId);
      const mapped: TeamMember[] = members.map(m => ({
        ...m,
        avatar: initials(m.name),
      }));
      setTeamMembers(mapped);
      setStoreList(prev =>
        prev.map(s => s.id === sellerId ? { ...s, memberCount: members.length } : s)
      );
    } catch {
      setTeamMembers(TEAM_SEED[sellerId] ?? []);
    } finally {
      setLoadingTeam(false);
    }
  }, []);

  useEffect(() => {
    fetchTeam(activeStoreId);
  }, [activeStoreId, fetchTeam]);

  const refreshTeam = useCallback(() => fetchTeam(activeStoreId), [activeStoreId, fetchTeam]);

  const refreshSeller = useCallback(async (id: string) => {
    try {
      const live = await getSeller(id);
      setStoreList(prev =>
        prev.map(s => {
          const seed = STORES.find(ss => ss.id === id);
          return s.id === id && seed ? mergeLiveSeller(seed, live) : s;
        })
      );
    } catch { /* silent — keep current data */ }
  }, []);

  const handleSetActiveStore = useCallback((store: Store) => {
    setActiveStoreId(store.id);
  }, []);

  return (
    <StoreContext.Provider value={{
      stores: storeList,
      activeStore,
      teamMembers,
      loadingStores,
      loadingTeam,
      setActiveStore: handleSetActiveStore,
      refreshTeam,
      refreshSeller,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

// ── Display configs ───────────────────────────────────────────────────────────

export type { SellerRole };

export const ROLE_CONFIG: Record<SellerRole, { label: string; bg: string; color: string }> = {
  owner:   { label: 'Owner',   bg: '#dcfce7', color: '#166534' },
  manager: { label: 'Manager', bg: '#dbeafe', color: '#1e40af' },
  staff:   { label: 'Staff',   bg: '#fef3c7', color: '#92400e' },
};

export const DELIVERY_ZONE_CONFIG: Record<ShipsTo, { label: string; icon: string; bg: string; text: string }> = {
  mandal:   { label: 'Local Mandal',  icon: '🏘️', bg: '#f3f4f6', text: '#374151' },
  district: { label: 'District Wide', icon: '🏙️', bg: '#fef3c7', text: '#92400e' },
  state:    { label: 'State Wide',    icon: '🗺️', bg: '#dbeafe', text: '#1e40af' },
  national: { label: 'All India',     icon: '🇮🇳', bg: '#dcfce7', text: '#166534' },
};

export const ROLE_PERMISSIONS: Record<SellerRole, {
  canEditProducts: boolean;
  canViewAnalytics: boolean;
  canManagePayouts: boolean;
  canInviteMembers: boolean;
}> = {
  owner: {
    canEditProducts:   true,
    canViewAnalytics:  true,
    canManagePayouts:  true,
    canInviteMembers:  true,
  },
  manager: {
    canEditProducts:   true,
    canViewAnalytics:  true,
    canManagePayouts:  false,
    canInviteMembers:  false,
  },
  staff: {
    canEditProducts:   false,
    canViewAnalytics:  false,
    canManagePayouts:  false,
    canInviteMembers:  false,
  },
};
