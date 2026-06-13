import React, { createContext, useContext, useState } from 'react';

export type StoreRole = 'owner' | 'manager' | 'staff';

export interface Store {
  id: string;
  name: string;
  category: string;
  icon: string;
  location: string;
  role: StoreRole;
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

const STORES: Store[] = [
  {
    id: 's1',
    name: 'Lakshmi Farms',
    category: 'Vegetables & Spices',
    icon: '🌾',
    location: 'Armoor Mandal, Nizamabad',
    role: 'owner',
    memberCount: 3,
    productCount: 6,
    ordersToday: 18,
    revenueToday: '₹4,280',
  },
  {
    id: 's2',
    name: 'Sridevi Spice Co.',
    category: 'Spices & Condiments',
    icon: '🌶️',
    location: 'Nizamabad Town',
    role: 'owner',
    memberCount: 1,
    productCount: 12,
    ordersToday: 7,
    revenueToday: '₹2,100',
  },
  {
    id: 's3',
    name: 'Krishna Organics',
    category: 'Organic Produce',
    icon: '🥬',
    location: 'Karimnagar District',
    role: 'manager',
    memberCount: 4,
    productCount: 18,
    ordersToday: 24,
    revenueToday: '₹8,640',
  },
];

const TEAM: Record<string, TeamMember[]> = {
  s1: [
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
  s2: [
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
  s3: [
    {
      id: 'm5',
      name: 'Krishna Rao',
      phone: '+91 99887 76655',
      role: 'owner',
      status: 'active',
      avatar: 'KR',
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
