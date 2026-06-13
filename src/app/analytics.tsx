import { useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PayoutBadge } from '@/components/seller-ui';
import { StoreSwitcher } from '@/components/store-switcher';
import { useStore, ROLE_PERMISSIONS } from '@/context/store-context';

const periods = ['Today', 'This Week', 'This Month', 'All Time'];

const periodData: Record<string, {
  revenue: string;
  revTrend: string;
  orders: number;
  orderTrend: string;
  avgOrder: string;
  newBuyers: number;
  returningBuyers: number;
  topProducts: Array<{ name: string; icon: string; units: number; revenue: number }>;
  barData: Array<{ label: string; value: number; max: number }>;
}> = {
  Today: {
    revenue: '₹4,280',
    revTrend: '+12% vs yesterday',
    orders: 18,
    orderTrend: '+3 vs yesterday',
    avgOrder: '₹238',
    newBuyers: 7,
    returningBuyers: 11,
    topProducts: [
      { name: 'Organic Turmeric', icon: '🫚', units: 12, revenue: 2988 },
      { name: 'Fresh Tomatoes', icon: '🍅', units: 8, revenue: 480 },
      { name: 'Red Chilli Powder', icon: '🌶️', units: 4, revenue: 720 },
    ],
    barData: [
      { label: '8 AM', value: 340, max: 1200 },
      { label: '10 AM', value: 860, max: 1200 },
      { label: '12 PM', value: 1200, max: 1200 },
      { label: '2 PM', value: 720, max: 1200 },
      { label: '4 PM', value: 980, max: 1200 },
      { label: '6 PM', value: 180, max: 1200 },
    ],
  },
  'This Week': {
    revenue: '₹28,640',
    revTrend: '+8% vs last week',
    orders: 104,
    orderTrend: '+11 vs last week',
    avgOrder: '₹275',
    newBuyers: 34,
    returningBuyers: 70,
    topProducts: [
      { name: 'Organic Turmeric', icon: '🫚', units: 76, revenue: 18924 },
      { name: 'Fresh Tomatoes', icon: '🍅', units: 58, revenue: 3480 },
      { name: 'Coconut Oil', icon: '🥥', units: 24, revenue: 7680 },
    ],
    barData: [
      { label: 'Mon', value: 3200, max: 6000 },
      { label: 'Tue', value: 4800, max: 6000 },
      { label: 'Wed', value: 6000, max: 6000 },
      { label: 'Thu', value: 5200, max: 6000 },
      { label: 'Fri', value: 4600, max: 6000 },
      { label: 'Sat', value: 4840, max: 6000 },
    ],
  },
  'This Month': {
    revenue: '₹1,12,800',
    revTrend: '+22% vs last month',
    orders: 412,
    orderTrend: '+67 vs last month',
    avgOrder: '₹274',
    newBuyers: 128,
    returningBuyers: 284,
    topProducts: [
      { name: 'Organic Turmeric', icon: '🫚', units: 302, revenue: 75198 },
      { name: 'Coconut Oil', icon: '🥥', units: 86, revenue: 27520 },
      { name: 'Coriander Seeds', icon: '🌿', units: 144, revenue: 12960 },
    ],
    barData: [
      { label: 'W1', value: 22000, max: 35000 },
      { label: 'W2', value: 28000, max: 35000 },
      { label: 'W3', value: 35000, max: 35000 },
      { label: 'W4', value: 27800, max: 35000 },
    ],
  },
  'All Time': {
    revenue: '₹6,84,200',
    revTrend: 'Since Oct 2023',
    orders: 2840,
    orderTrend: 'Across 8 months',
    avgOrder: '₹241',
    newBuyers: 842,
    returningBuyers: 1998,
    topProducts: [
      { name: 'Organic Turmeric', icon: '🫚', units: 1842, revenue: 458358 },
      { name: 'Coconut Oil', icon: '🥥', units: 620, revenue: 198400 },
      { name: 'Fresh Tomatoes', icon: '🍅', units: 1208, revenue: 72480 },
    ],
    barData: [
      { label: 'Oct', value: 42000, max: 120000 },
      { label: 'Nov', value: 68000, max: 120000 },
      { label: 'Dec', value: 95000, max: 120000 },
      { label: 'Jan', value: 88000, max: 120000 },
      { label: 'Feb', value: 110000, max: 120000 },
      { label: 'Mar', value: 120000, max: 120000 },
    ],
  },
};

const payouts = [
  { date: 'Jun 11, 2026', amount: '₹11,240', status: 'paid' as const, orders: 42 },
  { date: 'Jun 10, 2026', amount: '₹8,960', status: 'paid' as const, orders: 35 },
  { date: 'Jun 09, 2026', amount: '₹14,320', status: 'paid' as const, orders: 58 },
  { date: 'Jun 12, 2026 (Today)', amount: '₹4,280', status: 'pending' as const, orders: 18 },
];

export default function AnalyticsScreen() {
  const { activeStore } = useStore();
  const perms = ROLE_PERMISSIONS[activeStore.role];
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [period, setPeriod] = useState('Today');
  const data = periodData[period];
  const barMax = data.barData.reduce((m, b) => Math.max(m, b.max), 1);

  return (
    <ScrollView style={s.screen} showsVerticalScrollIndicator={false}>
      <StoreSwitcher visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
      {/* Header */}
      <View style={s.header}>
        <SafeAreaView edges={['top']}>
          <View style={s.headerRow}>
            <Pressable onPress={() => setSwitcherOpen(true)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={s.headerTitle}>Analytics</Text>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 2 }}>⌄</Text>
              </View>
              <Text style={s.headerSub}>{activeStore.name} · Store performance</Text>
            </Pressable>
            <Pressable style={s.exportBtn}>
              <Text style={s.exportTxt}>📤 Export</Text>
            </Pressable>
          </View>

          {/* Period Selector */}
          <View style={s.periodRow}>
            {periods.map((p) => (
              <Pressable
                key={p}
                style={[s.periodBtn, period === p && s.periodBtnActive]}
                onPress={() => setPeriod(p)}>
                <Text style={[s.periodTxt, period === p && s.periodTxtActive]}>{p}</Text>
              </Pressable>
            ))}
          </View>
        </SafeAreaView>
      </View>

      {/* Revenue Card */}
      <View style={s.section}>
        <View style={s.revenueCard}>
          <View style={{ flex: 1 }}>
            <Text style={s.revLabel}>Total Revenue</Text>
            <Text style={s.revValue}>{data.revenue}</Text>
            <Text style={s.revTrend}>📈 {data.revTrend}</Text>
          </View>
          <View style={s.revRight}>
            <View style={s.revStat}>
              <Text style={s.revStatVal}>{data.orders}</Text>
              <Text style={s.revStatLbl}>Orders</Text>
              <Text style={s.revStatTrend}>{data.orderTrend}</Text>
            </View>
            <View style={s.revStat}>
              <Text style={s.revStatVal}>{data.avgOrder}</Text>
              <Text style={s.revStatLbl}>Avg Order</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Revenue Chart */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Revenue Breakdown</Text>
        <View style={s.chartCard}>
          <View style={s.bars}>
            {data.barData.map((bar) => {
              const pct = (bar.value / barMax) * 100;
              return (
                <View key={bar.label} style={s.barCol}>
                  <Text style={s.barValTxt}>
                    {bar.value >= 1000 ? `₹${(bar.value / 1000).toFixed(1)}k` : `₹${bar.value}`}
                  </Text>
                  <View style={s.barTrack}>
                    <View style={[s.barFill, { height: `${pct}%` as any }]} />
                  </View>
                  <Text style={s.barLabel}>{bar.label}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* Buyer Insights */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Buyer Insights</Text>
        <View style={s.insightRow}>
          <View style={s.insightCard}>
            <Text style={s.insightVal}>{data.newBuyers}</Text>
            <Text style={s.insightLbl}>New Buyers</Text>
            <View style={s.insightBar}>
              <View
                style={[
                  s.insightFill,
                  {
                    width: `${(data.newBuyers / (data.newBuyers + data.returningBuyers)) * 100}%` as any,
                    backgroundColor: '#c97b1a',
                  },
                ]}
              />
            </View>
          </View>
          <View style={s.insightCard}>
            <Text style={s.insightVal}>{data.returningBuyers}</Text>
            <Text style={s.insightLbl}>Returning</Text>
            <View style={s.insightBar}>
              <View
                style={[
                  s.insightFill,
                  {
                    width: `${(data.returningBuyers / (data.newBuyers + data.returningBuyers)) * 100}%` as any,
                    backgroundColor: '#2d7a47',
                  },
                ]}
              />
            </View>
          </View>
          <View style={s.insightCard}>
            <Text style={s.insightVal}>
              {Math.round((data.returningBuyers / (data.newBuyers + data.returningBuyers)) * 100)}%
            </Text>
            <Text style={s.insightLbl}>Repeat Rate</Text>
            <View style={s.insightBar}>
              <View
                style={[
                  s.insightFill,
                  {
                    width: `${(data.returningBuyers / (data.newBuyers + data.returningBuyers)) * 100}%` as any,
                    backgroundColor: '#2d7a47',
                  },
                ]}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Top Products */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Top Products</Text>
        <View style={s.topProductsCard}>
          {data.topProducts.map((p, i) => (
            <View key={p.name} style={[s.topRow, i > 0 && s.topRowBorder]}>
              <Text style={s.topRank}>{i + 1}</Text>
              <View style={s.topIcon}>
                <Text style={{ fontSize: 22 }}>{p.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.topName}>{p.name}</Text>
                <Text style={s.topUnits}>{p.units} units sold</Text>
              </View>
              <Text style={s.topRevenue}>₹{p.revenue.toLocaleString('en-IN')}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Payout History — gated to owner/manager */}
      {perms.canManagePayouts || perms.canViewAnalytics ? (
      <View style={[s.section, { paddingBottom: 32 }]}>
        <View style={s.sectionHead}>
          <Text style={s.sectionTitle}>Payout History</Text>
          <Pressable><Text style={s.seeAll}>View All ›</Text></Pressable>
        </View>
        <View style={s.payoutCard}>
          {payouts.map((p, i) => (
            <View key={i} style={[s.payoutRow, i > 0 && s.payoutRowBorder]}>
              <View style={s.payoutIcon}>
                <Text style={{ fontSize: 18 }}>💳</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.payoutDate}>{p.date}</Text>
                <Text style={s.payoutOrders}>{p.orders} orders settled</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={s.payoutAmt}>{p.amount}</Text>
                <PayoutBadge status={p.status} />
              </View>
            </View>
          ))}
        </View>

        <View style={s.nextPayoutCard}>
          <Text style={s.nextPayoutIcon}>⏰</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.nextPayoutTitle}>Next payout: Tonight at 11 PM</Text>
            <Text style={s.nextPayoutSub}>
              ₹4,280 will be transferred to your HDFC account ending 4821
            </Text>
          </View>
        </View>
      </View>
      ) : (
        <View style={[s.section, { paddingBottom: 32 }]}>
          <View style={{ backgroundColor: '#f3f4f6', borderRadius: 12, padding: 20, alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 28 }}>🔒</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>Payout data restricted</Text>
            <Text style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
              Only store owners can view payout history and financial details.
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f9fafb' },

  header: {
    backgroundColor: '#2d7a47',
    paddingHorizontal: 16,
    paddingBottom: 18,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 8,
    marginBottom: 14,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  exportBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  exportTxt: { fontSize: 12, color: '#fff', fontWeight: '600' },
  periodRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodBtnActive: { backgroundColor: '#fff' },
  periodTxt: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  periodTxtActive: { color: '#2d7a47' },

  section: { paddingHorizontal: 16, paddingTop: 16 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  seeAll: { fontSize: 12, color: '#2d7a47', fontWeight: '600' },

  revenueCard: {
    backgroundColor: '#1a4a28',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    gap: 16,
  },
  revLabel: { fontSize: 12, color: 'rgba(255,255,255,0.65)' },
  revValue: { fontSize: 32, fontWeight: '700', color: '#fff', marginTop: 2 },
  revTrend: { fontSize: 12, color: '#86efac', marginTop: 4 },
  revRight: { justifyContent: 'space-around', gap: 10 },
  revStat: { alignItems: 'flex-end' },
  revStatVal: { fontSize: 18, fontWeight: '700', color: '#fff' },
  revStatLbl: { fontSize: 10, color: 'rgba(255,255,255,0.6)' },
  revStatTrend: { fontSize: 10, color: '#86efac' },

  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 120 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barValTxt: { fontSize: 8, color: '#6b7280', textAlign: 'center' },
  barTrack: {
    flex: 1,
    width: '100%',
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: { backgroundColor: '#2d7a47', borderRadius: 4, width: '100%' },
  barLabel: { fontSize: 9, color: '#6b7280' },

  insightRow: { flexDirection: 'row', gap: 10 },
  insightCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 4,
  },
  insightVal: { fontSize: 20, fontWeight: '700', color: '#111827' },
  insightLbl: { fontSize: 10, color: '#6b7280' },
  insightBar: { height: 4, backgroundColor: '#f3f4f6', borderRadius: 2, overflow: 'hidden' },
  insightFill: { height: '100%', borderRadius: 2 },

  topProductsCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  topRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  topRowBorder: { borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  topRank: { fontSize: 14, fontWeight: '700', color: '#9ca3af', width: 20 },
  topIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  topUnits: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  topRevenue: { fontSize: 14, fontWeight: '700', color: '#2d7a47' },

  payoutCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    marginBottom: 12,
  },
  payoutRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  payoutRowBorder: { borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  payoutIcon: {
    width: 38,
    height: 38,
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payoutDate: { fontSize: 13, fontWeight: '600', color: '#111827' },
  payoutOrders: { fontSize: 11, color: '#6b7280', marginTop: 1 },
  payoutAmt: { fontSize: 14, fontWeight: '700', color: '#111827' },

  nextPayoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  nextPayoutIcon: { fontSize: 24 },
  nextPayoutTitle: { fontSize: 13, fontWeight: '700', color: '#92400e' },
  nextPayoutSub: { fontSize: 11, color: '#78350f', marginTop: 3, lineHeight: 16 },
});
