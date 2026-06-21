import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { SellerType, BusinessType, ShipsTo, SellerRole, MemberStatus, Seller, SocialHandles, CustomDeliveryZone, PendingInvite } from '@/services/user-api';
import { getSeller, listMembers, getSellersByUser, getUser, getPendingInvites, activateMember, removeMember, updateSeller } from '@/services/user-api';
import { listOrders } from '@/services/order-api';
import { listProducts } from '@/services/catalog-api';
import { useAuth } from '@/context/auth-context';

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
  imageUrl?: string;      // store profile icon URL
  bannerUrl?: string;     // wide banner shown behind store header
  location: string;
  phone: string;
  pincode: string;
  deliveryZones: ShipsTo[]; // seller-level delivery coverage
  customDeliveryZone?: CustomDeliveryZone;
  verified: boolean;
  fssaiNumber?: string;
  gstNumber?: string;
  businessType?: BusinessType;
  address?: string;
  socialHandles?: SocialHandles;
  status: 'live' | 'offline';  // store operational status — client-side only
  vacationMode: boolean;  // when true, new order intake is paused
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
  imageUrl?: string;      // user profile photo, enriched from UserSvc
  invitedAt: string;
  joinedAt?: string;
}

interface StoreContextValue {
  stores: Store[];
  activeStore: Store;
  teamMembers: TeamMember[];     // live members for the active store only
  loadingStores: boolean;
  storesInitialized: boolean;    // true once the first fetch for this session has resolved
  loadingTeam: boolean;
  newOrderCount: number;         // live count of 'new' orders — drives tab badge
  setNewOrderCount: (n: number) => void;
  pendingInvites: PendingInvite[];  // invites awaiting acceptance by this user
  acceptInvite: (sellerId: string, memberId: string) => Promise<void>;
  declineInvite: (sellerId: string, memberId: string) => Promise<void>;
  setActiveStore: (store: Store) => void;
  addStore: (store: Store) => void;  // called after createSeller succeeds
  updateStoreStatus: (id: string, status: 'live' | 'offline') => void;
  toggleVacation: (enabled: boolean) => Promise<void>;
  refreshTeam: () => Promise<void>;
  refreshSeller: (id: string) => Promise<void>;
  refreshStats: (id: string) => Promise<void>;  // re-fetch ordersToday / revenueToday / productCount
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

async function fetchStoreStats(sellerId: string): Promise<{
  ordersToday: number;
  revenueToday: string;
  productCount: number;
}> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [orders, products] = await Promise.all([
    listOrders({ sellerId }),
    listProducts({ sellerId, status: 'active' }),
  ]);

  const todayOrders = orders.filter(
    o => new Date(o.createdAt) >= todayStart && o.status !== 'cancelled',
  );
  const revenueToday = todayOrders.reduce((sum, o) => sum + o.total, 0);

  return {
    ordersToday:  todayOrders.length,
    revenueToday: `₹${(revenueToday / 100).toLocaleString('en-IN')}`,
    productCount: products.length,
  };
}

function mergeLiveSeller(seed: Store, live: Awaited<ReturnType<typeof getSeller>>): Store {
  return {
    ...seed,
    name:               live.name,
    type:               live.type,
    phone:              live.phone,
    location:           live.location,
    pincode:            live.pincode,
    deliveryZones:      live.deliveryZones,
    customDeliveryZone: live.customDeliveryZone,
    description:        live.description,
    imageUrl:           live.imageUrl,
    bannerUrl:          live.bannerUrl,
    verified:           live.verified,
    fssaiNumber:        live.fssaiNumber,
    gstNumber:          live.gstNumber,
    businessType:       live.businessType,
    vacationMode:       live.vacationMode ?? false,
  };
}

// ── Context ───────────────────────────────────────────────────────────────────

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const userId = session?.userId ?? null;

  const [storeList, setStoreList]               = useState<Store[]>([]);
  const [activeStoreId, setActiveStoreId]       = useState<string>('');
  const [teamMembers, setTeamMembers]           = useState<TeamMember[]>([]);
  const [loadingStores, setLoadingStores]       = useState(false);
  const [storesInitialized, setStoresInitialized] = useState(false);
  const [loadingTeam, setLoadingTeam]           = useState(false);
  const [newOrderCount, setNewOrderCount]       = useState(0);
  const [pendingInvites, setPendingInvites]     = useState<PendingInvite[]>([]);

  const activeStore = storeList.find(s => s.id === activeStoreId) ?? storeList[0];

  // Fetch stores for the logged-in user; clear on logout
  useEffect(() => {
    if (!userId) {
      setStoreList([]);
      setActiveStoreId('');
      setTeamMembers([]);
      setPendingInvites([]);
      setStoresInitialized(false);
      return;
    }
    const uid = userId;
    async function fetchUserStores() {
      setLoadingStores(true);
      try {
        const [sellers, user] = await Promise.all([
          getSellersByUser(uid),
          getUser(uid),
        ]);
        const stores = sellers.map(s => sellerToStore(s, s.memberRole));
        setStoreList(stores);
        if (stores.length > 0) {
          setActiveStoreId(prev => prev || stores[0].id);
        }
        // Always check for pending invites regardless of whether user has stores
        try {
          const invites = await getPendingInvites(user.phone);
          setPendingInvites(invites);
        } catch {
          setPendingInvites([]);
        }
        // Fetch live stats for each store in the background — don't block initial render
        for (const store of stores) {
          fetchStoreStats(store.id).then(stats => {
            setStoreList(prev =>
              prev.map(s => s.id === store.id ? { ...s, ...stats } : s),
            );
          }).catch(() => { /* keep 0 defaults on error */ });
        }
      } catch {
        setStoreList([]);
        setPendingInvites([]);
      } finally {
        setLoadingStores(false);
        setStoresInitialized(true);
      }
    }
    fetchUserStores();
  }, [userId]);

  // Fetch team members whenever active store changes
  const fetchTeam = useCallback(async (sellerId: string) => {
    if (!sellerId) return;
    setLoadingTeam(true);
    try {
      const members = await listMembers(sellerId);
      const mapped: TeamMember[] = members.map(m => ({
        ...m,
        avatar:   initials(m.name),
        imageUrl: m.imageUrl,
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
        prev.map(s => s.id !== id ? s : { ...mergeLiveSeller(s, live), status: s.status })
      );
    } catch { /* silent — keep current data */ }
  }, []);

  const refreshStats = useCallback(async (id: string) => {
    try {
      const stats = await fetchStoreStats(id);
      setStoreList(prev => prev.map(s => s.id === id ? { ...s, ...stats } : s));
    } catch { /* silent — keep current values */ }
  }, []);

  const acceptInvite = useCallback(async (sellerId: string, memberId: string) => {
    if (!userId) return;
    // This is the critical call — throws on failure so the UI can surface the error
    await activateMember(sellerId, memberId, userId);
    // Invite accepted — remove from pending list regardless of what comes next
    setPendingInvites(prev => prev.filter(i => i.id !== memberId));
    // Re-fetch stores; errors here are non-fatal (userId effect will retry on re-render)
    try {
      const sellers = await getSellersByUser(userId);
      const stores  = sellers.map(s => sellerToStore(s, s.memberRole));
      setStoreList(stores);
      if (stores.length > 0) setActiveStoreId(prev => prev || stores[0].id);
    } catch { /* re-fetch failed silently; store list will update on next effect run */ }
  }, [userId]);

  const declineInvite = useCallback(async (sellerId: string, memberId: string) => {
    await removeMember(sellerId, memberId);
    setPendingInvites(prev => prev.filter(i => i.id !== memberId));
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

  const toggleVacation = useCallback(async (enabled: boolean) => {
    const id = activeStoreId;
    await updateSeller(id, { vacationMode: enabled });
    setStoreList(prev => prev.map(s => s.id === id ? { ...s, vacationMode: enabled } : s));
  }, [activeStoreId]);

  return (
    <StoreContext.Provider value={{
      stores: storeList,
      activeStore,
      teamMembers,
      loadingStores,
      storesInitialized,
      loadingTeam,
      newOrderCount,
      setNewOrderCount,
      pendingInvites,
      acceptInvite,
      declineInvite,
      setActiveStore: handleSetActiveStore,
      addStore,
      updateStoreStatus,
      toggleVacation,
      refreshTeam,
      refreshSeller,
      refreshStats,
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
  mandal:   { label: 'Local Area Wide',  icon: '🏘️', bg: '#f3f4f6', text: '#374151' },
  district: { label: 'District Wide',    icon: '🏙️', bg: '#fef3c7', text: '#92400e' },
  state:    { label: 'State Wide',       icon: '🗺️', bg: '#dbeafe', text: '#1e40af' },
  national: { label: 'All India',        icon: '🇮🇳', bg: '#dcfce7', text: '#166534' },
};

export const SELLER_TYPE_CONFIG: Record<SellerType, { label: string; icon: string; category: string }> = {
  farmer:   { label: 'Farmer',    icon: '🌾', category: 'Vegetables & Grains' },
  artisan:  { label: 'Artisan',   icon: '🎨', category: 'Handcraft & Textiles' },
  dairy:    { label: 'Dairy',     icon: '🥛', category: 'Dairy & Animal Products' },
  homefood: { label: 'Home Food', icon: '🍱', category: 'Home Foods & Pickles' },
  trades:   { label: 'Trades',    icon: '🔧', category: 'Services & Trades' },
  kirana:   { label: 'Kirana',    icon: '🏪', category: 'Grocery & General Store' },
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
    bannerUrl:     seller.bannerUrl,
    location:      seller.location,
    phone:         seller.phone,
    pincode:       seller.pincode,
    deliveryZones:      seller.deliveryZones,
    customDeliveryZone: seller.customDeliveryZone,
    verified:           seller.verified,
    fssaiNumber:   seller.fssaiNumber,
    gstNumber:     seller.gstNumber,
    businessType:  seller.businessType,
    address:       seller.address,
    socialHandles: seller.socialHandles,
    status:        'live',
    vacationMode:  seller.vacationMode ?? false,
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
