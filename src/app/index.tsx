import { useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HarvestDivider, OrderStatusBadge } from '@/components/seller-ui';
import { StoreSwitcher } from '@/components/store-switcher';
import { useStore } from '@/context/store-context';

const todayStats = [
  { label: "Today's Revenue", value: '₹4,280', icon: '💰', trend: '+12%', up: true },
  { label: 'New Orders', value: '18', icon: '📦', trend: '+3', up: true },
  { label: 'Pending', value: '5', icon: '⏳', trend: '', up: false },
  { label: 'Store Views', value: '312', icon: '👁️', trend: '+28%', up: true },
];

const quickActions = [
  { icon: '➕', label: 'Add Product', color: '#2d7a47', bg: '#dcfce7' },
  { icon: '📦', label: 'View Orders', color: '#1e40af', bg: '#dbeafe' },
  { icon: '💸', label: 'Request Payout', color: '#c97b1a', bg: '#fef3c7' },
  { icon: '📈', label: 'Analytics', color: '#7c3aed', bg: '#ede9fe' },
];

const pendingOrders = [
  {
    id: 'HC-2406-0091',
    buyer: 'Priya Sharma',
    location: 'Kukatpally',
    items: ['Organic Turmeric 500g × 2', 'Red Chilli Powder 200g × 1'],
    amount: 498,
    time: '8 min ago',
    status: 'new' as const,
  },
  {
    id: 'HC-2406-0090',
    buyer: 'Ravi Kumar',
    location: 'Miyapur',
    items: ['Fresh Tomatoes 1 kg × 3'],
    amount: 180,
    time: '24 min ago',
    status: 'new' as const,
  },
  {
    id: 'HC-2406-0089',
    buyer: 'Sunita Devi',
    location: 'KPHB Colony',
    items: ['Handwoven Cotton Towel × 2', 'Neem Soap × 4'],
    amount: 860,
    time: '41 min ago',
    status: 'accepted' as const,
  },
];

const storeHealth = [
  { label: 'Fulfilment Rate', value: '96%', icon: '✅', good: true },
  { label: 'Avg Response', value: '18 min', icon: '⚡', good: true },
  { label: 'Store Rating', value: '4.8★', icon: '⭐', good: true },
  { label: 'Return Rate', value: '2.1%', icon: '↩️', good: true },
];

export default function DashboardScreen() {
  const { activeStore } = useStore();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  return (
    <ScrollView style={s.screen} showsVerticalScrollIndicator={false}>
      <StoreSwitcher visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
      {/* Header */}
      <View style={s.header}>
        <SafeAreaView edges={['top']}>
          <View style={s.headerRow}>
            <Pressable style={s.brand} onPress={() => setSwitcherOpen(true)}>
              <View style={s.brandIcon}>
                <Text style={{ fontSize: 22 }}>{activeStore.icon}</Text>
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={s.brandName}>{activeStore.name}</Text>
                  <Text style={s.brandChevron}>⌄</Text>
                </View>
                <Text style={s.brandSub}>Good morning, Sridevi 👋</Text>
              </View>
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable style={s.hBtn}>
                <Text>🔔</Text>
                <View style={s.notifDot} />
              </Pressable>
              <Pressable style={s.hBtn}><Text>⚙️</Text></Pressable>
            </View>
          </View>

          {/* Payout Banner */}
          <Pressable style={s.payoutBanner}>
            <Text style={s.payoutIcon}>💳</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.payoutTitle}>₹12,480 available for payout</Text>
              <Text style={s.payoutSub}>T+1 settlement · Last paid: Jun 11</Text>
            </View>
            <Text style={s.payoutArrow}>›</Text>
          </Pressable>
        </SafeAreaView>
      </View>

      {/* Today's Stats */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Today's Performance</Text>
        <View style={s.statsGrid}>
          {todayStats.map((stat) => (
            <View key={stat.label} style={s.statCard}>
              <Text style={s.statIcon}>{stat.icon}</Text>
              <Text style={s.statVal}>{stat.value}</Text>
              <Text style={s.statLbl}>{stat.label}</Text>
              {stat.trend ? (
                <Text style={[s.statTrend, { color: stat.up ? '#16a34a' : '#dc2626' }]}>
                  {stat.up ? '↑' : '↓'} {stat.trend}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Quick Actions</Text>
        <View style={s.actionsRow}>
          {quickActions.map((a) => (
            <Pressable key={a.label} style={s.actionBtn}>
              <View style={[s.actionIcon, { backgroundColor: a.bg }]}>
                <Text style={{ fontSize: 20 }}>{a.icon}</Text>
              </View>
              <Text style={[s.actionLabel, { color: a.color }]}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ paddingVertical: 12 }}>
        <HarvestDivider />
      </View>

      {/* Pending Orders */}
      <View style={s.section}>
        <View style={s.sectionHead}>
          <View>
            <Text style={s.sectionTitle}>Incoming Orders</Text>
            <Text style={s.sectionSub}>Requires your attention</Text>
          </View>
          <Pressable>
            <Text style={s.seeAll}>View All ›</Text>
          </Pressable>
        </View>
        <View style={{ gap: 10 }}>
          {pendingOrders.map((order) => (
            <View key={order.id} style={s.orderCard}>
              <View style={s.orderTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.orderId}>{order.id}</Text>
                  <Text style={s.orderBuyer}>
                    👤 {order.buyer} · 📍 {order.location}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <OrderStatusBadge status={order.status} />
                  <Text style={s.orderTime}>{order.time}</Text>
                </View>
              </View>
              <View style={s.orderItems}>
                {order.items.map((item, i) => (
                  <Text key={i} style={s.orderItem}>• {item}</Text>
                ))}
              </View>
              <View style={s.orderFooter}>
                <Text style={s.orderAmt}>₹{order.amount}</Text>
                {order.status === 'new' ? (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable style={s.declineBtn}>
                      <Text style={s.declineTxt}>Decline</Text>
                    </Pressable>
                    <Pressable style={s.acceptBtn}>
                      <Text style={s.acceptTxt}>Accept Order</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable style={s.dispatchBtn}>
                    <Text style={s.dispatchTxt}>Mark Dispatched 🚚</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Store Health */}
      <View style={[s.section, { paddingBottom: 32 }]}>
        <Text style={s.sectionTitle}>Store Health</Text>
        <View style={s.healthGrid}>
          {storeHealth.map((h) => (
            <View key={h.label} style={s.healthCard}>
              <Text style={s.healthIcon}>{h.icon}</Text>
              <Text style={s.healthVal}>{h.value}</Text>
              <Text style={s.healthLbl}>{h.label}</Text>
            </View>
          ))}
        </View>

        <View style={s.tipCard}>
          <Text style={s.tipIcon}>💡</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.tipTitle}>Tip: Add harvest photos</Text>
            <Text style={s.tipSub}>
              Listings with farm photos get 3× more clicks. Add photos to your top 3 products.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f9fafb' },

  header: {
    backgroundColor: '#2d7a47',
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 8,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandIcon: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: { color: '#fff', fontWeight: '700', fontSize: 17 },
  brandChevron: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 2 },
  brandSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 1 },
  hBtn: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#dc2626',
    borderWidth: 1,
    borderColor: '#2d7a47',
  },
  payoutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  payoutIcon: { fontSize: 22 },
  payoutTitle: { color: '#fff', fontWeight: '700', fontSize: 14 },
  payoutSub: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 1 },
  payoutArrow: { color: 'rgba(255,255,255,0.6)', fontSize: 20 },

  section: { paddingHorizontal: 16, paddingTop: 16 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  sectionSub: { fontSize: 10, color: '#6b7280', marginTop: 2 },
  seeAll: { fontSize: 12, color: '#2d7a47', fontWeight: '600' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 2,
  },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statVal: { fontSize: 22, fontWeight: '700', color: '#111827' },
  statLbl: { fontSize: 11, color: '#6b7280' },
  statTrend: { fontSize: 11, fontWeight: '600', marginTop: 2 },

  actionsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: { alignItems: 'center', gap: 6, flex: 1 },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 10,
  },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  orderId: { fontSize: 13, fontWeight: '700', color: '#111827' },
  orderBuyer: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  orderTime: { fontSize: 10, color: '#9ca3af' },
  orderItems: { gap: 2 },
  orderItem: { fontSize: 12, color: '#374151' },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 10,
  },
  orderAmt: { fontSize: 16, fontWeight: '700', color: '#2d7a47' },
  declineBtn: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  declineTxt: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  acceptBtn: {
    backgroundColor: '#2d7a47',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  acceptTxt: { fontSize: 12, color: '#fff', fontWeight: '700' },
  dispatchBtn: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  dispatchTxt: { fontSize: 12, color: '#166534', fontWeight: '700' },

  healthGrid: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  healthCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  healthIcon: { fontSize: 18 },
  healthVal: { fontSize: 16, fontWeight: '700', color: '#111827' },
  healthLbl: { fontSize: 9, color: '#6b7280', textAlign: 'center' },

  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  tipIcon: { fontSize: 22 },
  tipTitle: { fontSize: 13, fontWeight: '700', color: '#92400e' },
  tipSub: { fontSize: 11, color: '#78350f', lineHeight: 16, marginTop: 3 },
});
