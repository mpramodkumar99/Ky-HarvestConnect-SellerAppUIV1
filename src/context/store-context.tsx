import React, { createContext, useContext, useState } from 'react';
import type { SellerType } from '@/services/user-api';

export type StoreRole = 'owner' | 'manager' | 'staff';

// Store mirrors the Seller type from UserSvc with UI-only additions.
// id must match the sellerId used in catalog-svc (e.g. 'seller-101').
export interface Store {
  id: string;            // sellerId — matches catalog-svc seed IDs
  name: string;
  type: SellerType;      // from UserSvc Seller.type
  category: string;      // human-readable label for UI display
  icon: string;
  location: string;
  phone: string;
  pincode: string;
  verified: boolean;
  fssaiNumber?: string;
  role: StoreRole;       // this user's role within the seller account
  memberCount: number;
  productCount: number;
  ordersToday: number;
  revenueToday: string;
}

export interface TeamMember {
  id: string;
  name: string;
  phone: string;
  role: StoreRole;
  status: 'active' | 'pending';
  avatar: string;
  joinedAt: string;
}

interface StoreContextValue {
  stores: Store[];
  activeStore: Store;
  teamMembers: Record<string, TeamMember[]>;
  setActiveStore: (store: Store) => void;
}

// IDs match catalog-svc and user-svc seed data so product queries resolve correctly.
const STORES: Store[] = [
  {
    id: 'seller-112',
    name: 'Desi Dairy Armoor',
    type: 'dairy',
    category: 'Dairy & Animal Products',
    icon: '🥛',
    location: 'Armoor, Nizamabad',
    phone: '+919000000112',
    pincode: '503111',
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
    location: 'Nizamabad, Telangana',
    phone: '+919000000113',
    pincode: '503001',
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
    location: 'Nizamabad, Telangana',
    phone: '+919000000105',
    pincode: '503001',
    verified: true,
    fssaiNumber: '10019042000105',
    role: 'manager',
    memberCount: 4,
    productCount: 18,
    ordersToday: 24,
    revenueToday: '₹8,640',
  },
];

const TEAM: Record<string, TeamMember[]> = {
  'seller-112': [
    {
      id: 'm1',
      name: 'Sridevi Reddy',
      phone: '+91 98765 43210',
      role: 'owner',
      status: 'active',
      avatar: 'SR',
      joinedAt: 'Oct 2023',
    },
    {
      id: 'm2',
      name: 'Ramesh Kumar',
      phone: '+91 91234 56789',
      role: 'manager',
      status: 'active',
      avatar: 'RK',
      joinedAt: 'Jan 2024',
    },
    {
      id: 'm3',
      name: 'Meena Devi',
      phone: '+91 87654 32109',
      role: 'staff',
      status: 'pending',
      avatar: 'MD',
      joinedAt: 'Invited Jun 2026',
    },
  ],
  'seller-113': [
    {
      id: 'm4',
      name: 'Sridevi Reddy',
      phone: '+91 98765 43210',
      role: 'owner',
      status: 'active',
      avatar: 'SR',
      joinedAt: 'Mar 2024',
    },
  ],
  'seller-105': [
    {
      id: 'm5',
      name: 'Priya Sharma',
      phone: '+91 99887 76655',
      role: 'owner',
      status: 'active',
      avatar: 'PS',
      joinedAt: 'Feb 2024',
    },
    {
      id: 'm6',
      name: 'Sridevi Reddy',
      phone: '+91 98765 43210',
      role: 'manager',
      status: 'active',
      avatar: 'SR',
      joinedAt: 'Apr 2024',
    },
    {
      id: 'm7',
      name: 'Venkat Rao',
      phone: '+91 88990 11223',
      role: 'staff',
      status: 'active',
      avatar: 'VR',
      joinedAt: 'May 2024',
    },
    {
      id: 'm8',
      name: 'Sunita Devi',
      phone: '+91 97531 24680',
      role: 'staff',
      status: 'pending',
      avatar: 'SD',
      joinedAt: 'Invited Jun 2026',
    },
  ],
};

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [stores] = useState<Store[]>(STORES);
  const [activeStore, setActiveStore] = useState<Store>(STORES[0]);

  return (
    <StoreContext.Provider
      value={{ stores, activeStore, teamMembers: TEAM, setActiveStore }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

export const ROLE_CONFIG: Record<StoreRole, { label: string; bg: string; color: string }> = {
  owner: { label: 'Owner', bg: '#dcfce7', color: '#166534' },
  manager: { label: 'Manager', bg: '#dbeafe', color: '#1e40af' },
  staff: { label: 'Staff', bg: '#fef3c7', color: '#92400e' },
};

export const ROLE_PERMISSIONS: Record<StoreRole, {
  canEditProducts: boolean;
  canViewAnalytics: boolean;
  canManagePayouts: boolean;
  canInviteMembers: boolean;
}> = {
  owner: {
    canEditProducts: true,
    canViewAnalytics: true,
    canManagePayouts: true,
    canInviteMembers: true,
  },
  manager: {
    canEditProducts: true,
    canViewAnalytics: true,
    canManagePayouts: false,
    canInviteMembers: false,
  },
  staff: {
    canEditProducts: false,
    canViewAnalytics: false,
    canManagePayouts: false,
    canInviteMembers: false,
  },
};
