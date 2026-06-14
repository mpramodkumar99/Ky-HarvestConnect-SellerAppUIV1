import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { SellerType, ShipsTo, SellerRole, MemberStatus, Seller } from '@/services/user-api';
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
  status: 'live' | 'offline';  // store operational status — client-side only
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
  addStore: (store: Store) => void;  // called after createSeller succeeds
  updateStoreStatus: (id: string, status: 'live' | 'offline') => void;
  refreshTeam: () => Promise<void>;
  refreshSeller: (id: string) => Promise<void>;
}

// ── Seed data — UI-only fields and offline fallback ───────────────────────────
// Live fields (name, type, phone, location, pincode, deliveryZones, description,
// imageUrl, verified, fssaiNumber) are overwritten by UserSvc on mount.

// Seed stores cleared for testing the Create New Store onboarding flow.
// Restore the entries below once onboarding testing is complete.
const STORES: Store[] = [];

// Fallback team seed — cleared with STORES for onboarding testing
const TEAM_SEED: Record<string, TeamMember[]> = {};

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
  const [activeStoreId, setActiveStoreId] = useState<string>(STORES[0]?.id ?? '');
  const [teamMembers, setTeamMembers]   = useState<TeamMember[]>(
    STORES[0]?.id ? (TEAM_SEED[STORES[0].id] ?? []) : []
  );
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
    if (!sellerId) return;
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
          if (s.id !== id || !seed) return s;
          return { ...mergeLiveSeller(seed, live), status: s.status };
        })
      );
    } catch { /* silent — keep current data */ }
  }, []);

  const handleSetActiveStore = useCallback((store: Store) => {
    setActiveStoreId(store.id);
  }, []);

  const addStore = useCallback((store: Store) => {
    setStoreList(prev => [...prev, store]);
    setActiveStoreId(store.id);
  }, []);

  const updateStoreStatus = useCallback((id: string, status: 'live' | 'offline') => {
    setStoreList(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  }, []);

  return (
    <StoreContext.Provider value={{
      stores: storeList,
      activeStore,
      teamMembers,
      loadingStores,
      loadingTeam,
      setActiveStore: handleSetActiveStore,
      addStore,
      updateStoreStatus,
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

export const SELLER_TYPE_CONFIG: Record<SellerType, { label: string; icon: string; category: string }> = {
  farmer:   { label: 'Farmer',    icon: '🌾', category: 'Vegetables & Grains' },
  artisan:  { label: 'Artisan',   icon: '🎨', category: 'Handcraft & Textiles' },
  dairy:    { label: 'Dairy',     icon: '🥛', category: 'Dairy & Animal Products' },
  homefood: { label: 'Home Food', icon: '🍱', category: 'Home Foods & Pickles' },
  trades:   { label: 'Trades',    icon: '🔧', category: 'Services & Trades' },
};

// Converts a UserSvc Seller response into a Store UI object.
// role defaults to 'owner' since you only create stores you own.
export function sellerToStore(seller: Seller, role: SellerRole = 'owner'): Store {
  const tc = SELLER_TYPE_CONFIG[seller.type];
  return {
    id:            seller.id,
    name:          seller.name,
    type:          seller.type,
    category:      tc.category,
    icon:          tc.icon,
    description:   seller.description,
    imageUrl:      seller.imageUrl,
    location:      seller.location,
    phone:         seller.phone,
    pincode:       seller.pincode,
    deliveryZones: seller.deliveryZones,
    verified:      seller.verified,
    fssaiNumber:   seller.fssaiNumber,
    status:        'live',
    role,
    memberCount:   1,
    productCount:  0,
    ordersToday:   0,
    revenueToday:  '₹0',
  };
}

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
