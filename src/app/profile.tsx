import { useState, useEffect } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { KycBadge, RoleBadge } from '@/components/seller-ui';
import { StoreSwitcher } from '@/components/store-switcher';
import { useStore, ROLE_PERMISSIONS, ROLE_CONFIG, DELIVERY_ZONE_CONFIG } from '@/context/store-context';
import { useToast } from '@/components/toast-provider';
import { getBankAccount, type BankAccount } from '@/services/user-api';

type MenuItem = {
  icon: string;
  label: string;
  desc: string;
  badge?: string;
  highlight?: boolean;
  route?: string;
  comingSoon?: boolean;
};

const menuItems: MenuItem[] = [
  { icon: '🏪', label: 'Store Settings',      desc: 'Store name, photo, description, category',     comingSoon: true },
  { icon: '🌾', label: 'My Products',          desc: 'Manage your product catalogue', badge: '6 listed', route: '/products' },
  { icon: '📦', label: 'Order History',        desc: 'All completed and cancelled orders',            route: '/orders' },
  { icon: '💳', label: 'Bank & Payouts',       desc: 'HDFC ···4821 · T+1 settlement', highlight: true, comingSoon: true },
  { icon: '📊', label: 'Transaction History',  desc: 'All credits, debits, and commissions',          comingSoon: true },
  { icon: '🚚', label: 'Delivery Zones',       desc: 'Mandal, district, state coverage areas',        comingSoon: true },
  { icon: '🛡️', label: 'KYC & Documents',     desc: 'Aadhaar, FSSAI, bank verification',             comingSoon: true },
  { icon: '🎁', label: 'Promotions & Offers',  desc: 'Create discounts and bundle deals' },
  { icon: '📣', label: 'Share My Store',       desc: 'Share your storefront link' },
  { icon: '⭐', label: 'Reviews & Ratings',    desc: '4.8 avg · 342 reviews', badge: '2 new' },
  { icon: '❓', label: 'Help & Support',       desc: 'FAQs, contact, seller guides' },
  { icon: '⚙️', label: 'App Settings',        desc: 'Notifications, language, privacy' },
];

const storeStats = [
  { label: 'Products', value: '6', icon: '🌾' },
  { label: 'Total Orders', value: '2,840', icon: '📦' },
  { label: 'Rating', value: '4.8★', icon: '⭐' },
  { label: 'Total GMV', value: '₹6.8L', icon: '💰' },
];

export default function ProfileScreen() {
  const { stores, activeStore, teamMembers, loadingTeam, setActiveStore } = useStore();
  const perms = ROLE_PERMISSIONS[activeStore.role];
  const router = useRouter();
  const { showToast } = useToast();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);

  useEffect(() => {
    getBankAccount(activeStore.id)
      .then(setBankAccount)
      .catch(() => setBankAccount(null));
  }, [activeStore.id]);

  function handleMenuPress(item: MenuItem) {
    if (item.route) {
      router.push(item.route as string);
    } else if (item.comingSoon) {
      showToast(`${item.label} is coming soon.`, 'info');
    }
  }

  return (
    <ScrollView style={s.screen} showsVerticalScrollIndicator={false}>
      <StoreSwitcher visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
      {/* Header */}
      <View style={s.header}>
        <SafeAreaView edges={['top']}>
          <View style={s.avatarRow}>
            <Pressable style={s.avatarWrap} onPress={() => setSwitcherOpen(true)}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{activeStore.icon}</Text>
              </View>
              <View style={s.switchBadge}>
                <Text style={{ fontSize: 10 }}>⌄</Text>
              </View>
            </Pressable>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={s.storeName}>{activeStore.name}</Text>
                <RoleBadge role={activeStore.role} />
              </View>
              <Text style={s.sellerName}>Sridevi Reddy · Seller since Oct 2023</Text>
              <View style={s.locationRow}>
                <Text style={s.locationTxt}>📍 {activeStore.location}</Text>
              </View>
            </View>
            <Pressable style={s.editBtn}>
              <Text style={{ fontSize: 16 }}>✏️</Text>
            </Pressable>
          </View>

          {/* Store Stats */}
          <View style={s.statsRow}>
            {storeStats.map((stat, i) => (
              <View key={stat.label} style={[s.stat, i < storeStats.length - 1 && s.statBorder]}>
                <Text style={s.statIcon}>{stat.icon}</Text>
                <Text style={s.statVal}>{stat.value}</Text>
                <Text style={s.statLbl}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </SafeAreaView>
      </View>

      {/* KYC + Bank Status */}
      <View style={s.statusCardWrap}>
        <View style={s.statusCard}>
          <View style={s.statusRow}>
            <View style={s.statusIcon}>
              <Text style={{ fontSize: 18 }}>🛡️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.statusTitle}>Identity & Compliance</Text>
              <Text style={s.statusSub}>Aadhaar · FSSAI · Bank Account</Text>
            </View>
            <KycBadge status={activeStore.verified ? 'verified' : 'pending'} />
          </View>

          <View style={[s.statusRow, { marginTop: 10 }]}>
            <View style={s.statusIcon}>
              <Text style={{ fontSize: 18 }}>💰</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.statusTitle}>Payout Account</Text>
              <Text style={s.statusSub}>
                {bankAccount
                  ? `${bankAccount.bankName} · ${bankAccount.accountNumber} · ${bankAccount.ifscCode}`
                  : 'Not set up yet'}
              </Text>
            </View>
            <Pressable style={s.changeBtn} onPress={() => showToast('Bank & Payouts is coming soon.', 'info')}>
              <Text style={s.changeTxt}>{bankAccount ? 'Change' : 'Add'}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Store Coverage */}
      <View style={s.coverageWrap}>
        <View style={s.coverageCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={s.coverageTitle}>Delivery Coverage</Text>
            <Pressable><Text style={s.editCoverage}>Edit ›</Text></Pressable>
          </View>
          <View style={s.coverageBadges}>
            {activeStore.deliveryZones.length > 0 ? (
              activeStore.deliveryZones.map(zone => {
                const zc = DELIVERY_ZONE_CONFIG[zone];
                return (
                  <View key={zone} style={[s.coverageBadge, { backgroundColor: zc.bg }]}>
                    <Text style={[s.coverageBadgeTxt, { color: zc.text }]}>{zc.icon} {zc.label}</Text>
                  </View>
                );
              })
            ) : (
              <Text style={{ fontSize: 12, color: '#9ca3af' }}>No delivery zones configured</Text>
            )}
          </View>
        </View>
      </View>

      {/* FSSAI Info */}
      <View style={{ paddingHorizontal: 16 }}>
        <View style={s.fssaiCard}>
          <Text style={s.fssaiIcon}>📋</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.fssaiTitle}>FSSAI License</Text>
            <Text style={s.fssaiNum}>
              {activeStore.fssaiNumber ?? 'Not provided'}
            </Text>
          </View>
          <View style={[s.fssaiStatus, { backgroundColor: activeStore.fssaiNumber ? '#dcfce7' : '#f3f4f6' }]}>
            <Text style={[s.fssaiStatusTxt, { color: activeStore.fssaiNumber ? '#166534' : '#6b7280' }]}>
              {activeStore.fssaiNumber ? 'Active' : 'Pending'}
            </Text>
          </View>
        </View>
      </View>

      {/* My Stores */}
      <View style={s.sectionWrap}>
        <View style={s.sectionHead}>
          <Text style={s.sectionTitle}>My Stores</Text>
          <Pressable onPress={() => setSwitcherOpen(true)}>
            <Text style={s.seeAll}>Switch ›</Text>
          </Pressable>
        </View>
        <View style={{ gap: 8 }}>
          {stores.map((store) => {
            const rc = ROLE_CONFIG[store.role];
            const isActive = store.id === activeStore.id;
            return (
              <Pressable
                key={store.id}
                style={[s.storeCard, isActive && s.storeCardActive]}
                onPress={() => setActiveStore(store)}>
                <View style={[s.storeCardIcon, isActive && s.storeCardIconActive]}>
                  <Text style={{ fontSize: 22 }}>{store.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[s.storeCardName, isActive && s.storeCardNameActive]}>{store.name}</Text>
                    <View style={[s.rolePill, { backgroundColor: rc.bg }]}>
                      <Text style={[s.rolePillTxt, { color: rc.color }]}>{rc.label}</Text>
                    </View>
                    {isActive && (
                      <View style={s.activeDot}>
                        <Text style={{ fontSize: 8, color: '#fff', fontWeight: '700' }}>Active</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.storeCardMeta}>{store.productCount} products · {store.ordersToday} orders today · {store.revenueToday}</Text>
                </View>
                <Text style={{ fontSize: 16, color: isActive ? '#2d7a47' : '#d1d5db' }}>
                  {isActive ? '✓' : '›'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Team Members */}
      <View style={s.sectionWrap}>
        <View style={s.sectionHead}>
          <View>
            <Text style={s.sectionTitle}>Team Members</Text>
            <Text style={s.sectionSub}>{activeStore.name}</Text>
          </View>
          {perms.canInviteMembers && (
            <Pressable style={s.inviteBtn}>
              <Text style={s.inviteBtnTxt}>＋ Invite</Text>
            </Pressable>
          )}
        </View>
        <View style={s.teamCard}>
          {loadingTeam && (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#2d7a47" />
            </View>
          )}
          {!loadingTeam && teamMembers.map((member, i) => {
            const rc = ROLE_CONFIG[member.role];
            return (
              <View key={member.id} style={[s.memberRow, i > 0 && s.memberRowBorder]}>
                <View style={s.memberAvatar}>
                  <Text style={s.memberAvatarTxt}>{member.avatar}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.memberName}>{member.name}</Text>
                  <Text style={s.memberPhone}>{member.phone}</Text>
                  <Text style={s.memberJoined}>
                    {member.status === 'pending'
                      ? `Invited ${new Date(member.invitedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`
                      : member.joinedAt
                        ? `Joined ${new Date(member.joinedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`
                        : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View style={[s.rolePill, { backgroundColor: rc.bg }]}>
                    <Text style={[s.rolePillTxt, { color: rc.color }]}>{rc.label}</Text>
                  </View>
                  <View style={[
                    s.statusPill,
                    { backgroundColor: member.status === 'active' ? '#dcfce7' : '#fef3c7' },
                  ]}>
                    <Text style={[
                      s.statusPillTxt,
                      { color: member.status === 'active' ? '#166534' : '#92400e' },
                    ]}>
                      {member.status === 'active' ? 'Active' : 'Pending'}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Menu Items */}
      <View style={s.menuSection}>
        {menuItems.map((item, i) => (
          <Pressable key={i} style={[s.menuItem, item.highlight && s.menuItemHL]} onPress={() => handleMenuPress(item)}>
            <View style={[s.menuIcon, item.highlight && s.menuIconHL]}>
              <Text style={{ fontSize: 18 }}>{item.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.menuLabel}>{item.label}</Text>
              <Text style={s.menuDesc}>{item.desc}</Text>
            </View>
            {item.badge && (
              <View style={s.badge}>
                <Text style={s.badgeText}>{item.badge}</Text>
              </View>
            )}
            <Text style={s.chevron}>›</Text>
          </Pressable>
        ))}
      </View>

      {/* Seller Tier */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <View style={s.tierCard}>
          <Text style={s.tierIcon}>🏆</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.tierTitle}>Gold Seller · HarvestConnect</Text>
            <Text style={s.tierSub}>
              Top 5% of sellers · Eligible for featured placement · Priority support
            </Text>
          </View>
        </View>
      </View>

      {/* Logout */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 }}>
        <Pressable style={s.logoutBtn}>
          <Text style={s.logoutText}>🚪  Logout</Text>
        </Pressable>
        <Text style={s.version}>HarvestConnect Seller · v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f9fafb' },

  header: {
    backgroundColor: '#2d7a47',
    paddingHorizontal: 16,
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
    marginTop: 8,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: { fontSize: 36 },
  switchBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    backgroundColor: '#fff',
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  storeName: { fontSize: 20, fontWeight: '700', color: '#fff' },
  sellerName: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  locationRow: { marginTop: 3 },
  locationTxt: { fontSize: 11, color: 'rgba(255,255,255,0.65)' },
  editBtn: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 14,
    justifyContent: 'space-around',
  },
  stat: { alignItems: 'center', flex: 1 },
  statBorder: { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.2)' },
  statIcon: { fontSize: 16, marginBottom: 2 },
  statVal: { fontSize: 16, fontWeight: '700', color: '#fff' },
  statLbl: { fontSize: 9, color: 'rgba(255,255,255,0.65)', marginTop: 1, textAlign: 'center' },

  statusCardWrap: { paddingHorizontal: 16, marginTop: -16, zIndex: 1, marginBottom: 12 },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusIcon: {
    width: 38,
    height: 38,
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: { fontSize: 13, fontWeight: '600', color: '#111827' },
  statusSub: { fontSize: 11, color: '#6b7280', marginTop: 1 },
  changeBtn: {
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  changeTxt: { fontSize: 11, color: '#374151', fontWeight: '600' },

  coverageWrap: { paddingHorizontal: 16, marginBottom: 12 },
  coverageCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  coverageTitle: { fontSize: 13, fontWeight: '700', color: '#111827' },
  editCoverage: { fontSize: 12, color: '#2d7a47', fontWeight: '600' },
  coverageBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  coverageBadge: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  coverageBadgeTxt: { fontSize: 11, fontWeight: '600' },

  fssaiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  fssaiIcon: { fontSize: 22 },
  fssaiTitle: { fontSize: 13, fontWeight: '600', color: '#111827' },
  fssaiNum: { fontSize: 11, color: '#6b7280', marginTop: 1 },
  fssaiStatus: {
    backgroundColor: '#dcfce7',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  fssaiStatusTxt: { fontSize: 11, fontWeight: '700', color: '#166534' },

  menuSection: { paddingHorizontal: 16, paddingTop: 4, gap: 2 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
  },
  menuItemHL: { backgroundColor: '#f0fdf4' },
  menuIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconHL: { backgroundColor: '#d1fae5' },
  menuLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  menuDesc: { fontSize: 11, color: '#6b7280', marginTop: 1 },
  badge: {
    backgroundColor: '#dcfce7',
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 10, color: '#166534', fontWeight: '600' },
  chevron: { fontSize: 18, color: '#9ca3af' },

  tierCard: {
    flexDirection: 'row',
    backgroundColor: '#1a4a28',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    alignItems: 'center',
  },
  tierIcon: { fontSize: 28 },
  tierTitle: { fontSize: 14, fontWeight: '700', color: '#fff' },
  tierSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 3, lineHeight: 16 },

  logoutBtn: {
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoutText: { fontSize: 14, fontWeight: '600', color: '#ef4444' },
  version: { fontSize: 10, color: '#9ca3af', textAlign: 'center' },

  sectionWrap: { paddingHorizontal: 16, paddingTop: 16 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  sectionSub: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  seeAll: { fontSize: 12, color: '#2d7a47', fontWeight: '600' },

  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  storeCardActive: { backgroundColor: '#f0fdf4', borderColor: '#86efac' },
  storeCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeCardIconActive: { backgroundColor: '#dcfce7' },
  storeCardName: { fontSize: 13, fontWeight: '700', color: '#111827' },
  storeCardNameActive: { color: '#166534' },
  storeCardMeta: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  rolePill: { borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2 },
  rolePillTxt: { fontSize: 10, fontWeight: '700' },
  activeDot: {
    backgroundColor: '#2d7a47',
    borderRadius: 99,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  inviteBtn: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  inviteBtnTxt: { fontSize: 12, fontWeight: '700', color: '#2d7a47' },

  teamCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  memberRowBorder: { borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2d7a47',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
  memberName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  memberPhone: { fontSize: 11, color: '#6b7280', marginTop: 1 },
  memberJoined: { fontSize: 10, color: '#9ca3af', marginTop: 1 },
  statusPill: { borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2 },
  statusPillTxt: { fontSize: 10, fontWeight: '600' },
});
