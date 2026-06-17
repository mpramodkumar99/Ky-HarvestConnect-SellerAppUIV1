import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ScrollView, View, Text, Pressable, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PayoutBadge } from '@/components/seller-ui';
import { StoreSwitcher } from '@/components/store-switcher';
import { useStore, ROLE_PERMISSIONS } from '@/context/store-context';
import { useLanguage } from '@/context/language-context';
import { useAppColors, type AppColors } from '@/hooks/use-app-colors';
import { listOrders } from '@/services/order-api';
import type { Order } from '@/services/order-api';

type Period = 'Today' | 'This Week' | 'This Month' | 'All Time';

function startOfDay(d: Date): Date {
  const r = new Date(d); r.setHours(0, 0, 0, 0); return r;
}
function startOfWeek(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay();
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1));
  r.setHours(0, 0, 0, 0);
  return r;
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

interface BarPoint { label: string; value: number; max: number; }

function computeBars(delivered: Order[], period: Period): BarPoint[] {
  const now = new Date();
  let labels: string[];
  let vals: number[];

  if (period === 'Today') {
    labels = ['8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM'];
    vals = new Array(6).fill(0);
    for (const o of delivered) {
      const h = new Date(o.createdAt).getHours();
      const i = Math.floor((h - 8) / 2);
      if (i >= 0 && i < 6) vals[i] += o.total;
    }
  } else if (period === 'This Week') {
    labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    vals = new Array(7).fill(0);
    const ws = startOfWeek(now).getTime();
    for (const o of delivered) {
      const i = Math.round((new Date(o.createdAt).getTime() - ws) / 86400000);
      if (i >= 0 && i < 7) vals[i] += o.total;
    }
  } else if (period === 'This Month') {
    labels = ['W1', 'W2', 'W3', 'W4'];
    vals = new Array(4).fill(0);
    for (const o of delivered) {
      const i = Math.min(Math.floor((new Date(o.createdAt).getDate() - 1) / 7), 3);
      vals[i] += o.total;
    }
  } else {
    labels = [];
    vals = new Array(6).fill(0);
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(d.toLocaleDateString('en-IN', { month: 'short' }));
    }
    for (const o of delivered) {
      const d = new Date(o.createdAt);
      const mo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      const i = 5 - mo;
      if (i >= 0 && i < 6) vals[i] += o.total;
    }
  }

  const mx = Math.max(...vals.map(v => v / 100), 1);
  return labels.map((label, i) => ({ label, value: Math.round(vals[i] / 100), max: mx }));
}

interface DerivedStats {
  revenue: string;
  revTrend: string;
  orderCount: number;
  orderTrend: string;
  avgOrder: string;
  newBuyers: number;
  returningBuyers: number;
  topProducts: Array<{ name: string; units: number; revenue: number }>;
  barData: BarPoint[];
}

function deriveStats(allOrders: Order[], period: Period, sellerId: string): DerivedStats {
  const now = new Date();
  const from: Date | null =
    period === 'Today' ? startOfDay(now) :
    period === 'This Week' ? startOfWeek(now) :
    period === 'This Month' ? startOfMonth(now) :
    null;

  const inPeriod = from
    ? allOrders.filter(o => new Date(o.createdAt) >= from)
    : allOrders;
  const delivered = inPeriod.filter(o => o.status === 'delivered');
  const revPaise = delivered.reduce((s, o) => s + o.total, 0);
  const revenue = revPaise / 100;
  const avgOrderVal = delivered.length > 0 ? revenue / delivered.length : 0;

  let revTrend: string;
  let orderTrend: string;
  if (period !== 'All Time') {
    let prevFrom: Date;
    let prevTo: Date;
    let label: string;
    if (period === 'Today') {
      prevTo = startOfDay(now);
      prevFrom = new Date(prevTo); prevFrom.setDate(prevFrom.getDate() - 1);
      label = 'yesterday';
    } else if (period === 'This Week') {
      prevTo = startOfWeek(now);
      prevFrom = new Date(prevTo); prevFrom.setDate(prevFrom.getDate() - 7);
      label = 'last week';
    } else {
      prevTo = startOfMonth(now);
      prevFrom = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      label = 'last month';
    }
    const prev = allOrders.filter(o => { const d = new Date(o.createdAt); return d >= prevFrom && d < prevTo; });
    const prevRev = prev.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0) / 100;
    const cntDiff = inPeriod.length - prev.length;

    if (prevRev === 0 && revenue === 0) revTrend = 'No orders yet';
    else if (prevRev === 0) revTrend = 'First revenue!';
    else {
      const pct = Math.round(((revenue - prevRev) / prevRev) * 100);
      revTrend = `${pct >= 0 ? '+' : ''}${pct}% vs ${label}`;
    }
    orderTrend = `${cntDiff >= 0 ? '+' : ''}${cntDiff} vs ${label}`;
  } else {
    const sorted = [...allOrders].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    revTrend = sorted.length > 0
      ? `Since ${new Date(sorted[0].createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`
      : 'No orders yet';
    orderTrend = `${allOrders.length} orders total`;
  }

  const beforeFrom = from
    ? allOrders.filter(o => new Date(o.createdAt) < from && o.status === 'delivered')
    : [];
  const oldBuyers = new Set(beforeFrom.map(o => o.buyerId));
  const periodBuyers = [...new Set(delivered.map(o => o.buyerId))];
  const newBuyers = periodBuyers.filter(id => !oldBuyers.has(id)).length;
  const returningBuyers = periodBuyers.filter(id => oldBuyers.has(id)).length;

  const pm = new Map<string, { name: string; units: number; revPaise: number }>();
  for (const order of delivered) {
    for (const item of order.items) {
      if (item.sellerId !== sellerId) continue;
      const ex = pm.get(item.productId) ?? { name: item.productName, units: 0, revPaise: 0 };
      pm.set(item.productId, {
        name: item.productName,
        units: ex.units + item.quantity,
        revPaise: ex.revPaise + item.totalPrice,
      });
    }
  }
  const topProducts = [...pm.values()]
    .sort((a, b) => b.revPaise - a.revPaise)
    .slice(0, 3)
    .map(p => ({ name: p.name, units: p.units, revenue: Math.round(p.revPaise / 100) }));

  return {
    revenue: `₹${Math.round(revenue).toLocaleString('en-IN')}`,
    revTrend,
    orderCount: inPeriod.length,
    orderTrend,
    avgOrder: `₹${Math.round(avgOrderVal).toLocaleString('en-IN')}`,
    newBuyers,
    returningBuyers,
    topProducts,
    barData: computeBars(delivered, period),
  };
}

type PayoutStatus = 'pending' | 'paid';
interface PayoutEntry {
  dateLabel: string;
  amount:    string;
  netAmount: number;
  status:    PayoutStatus;
  orders:    number;
  sortKey:   number;
}

function derivePayouts(orders: Order[]): PayoutEntry[] {
  const todayStr = new Date().toDateString();
  const byDate = new Map<string, { gross: number; count: number; dateObj: Date }>();

  for (const order of orders) {
    if (order.status !== 'delivered' && order.status !== 'completed') continue;
    const d   = new Date(order.updatedAt ?? order.createdAt);
    const key = d.toDateString();
    const gross = order.items.reduce(
      (s: number, i: { price: number; quantity: number }) => s + i.price * i.quantity, 0,
    );
    const entry = byDate.get(key);
    if (entry) { entry.gross += gross; entry.count += 1; }
    else byDate.set(key, { gross, count: 1, dateObj: new Date(d.getFullYear(), d.getMonth(), d.getDate()) });
  }

  return Array.from(byDate.entries())
    .map(([key, { gross, count, dateObj }]) => {
      const net     = Math.round(gross * 0.93);
      const isToday = key === todayStr;
      return {
        dateLabel: dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                   + (isToday ? ' (Today)' : ''),
        amount:    '₹' + net.toLocaleString('en-IN'),
        netAmount: net,
        status:    (isToday ? 'pending' : 'paid') as PayoutStatus,
        orders:    count,
        sortKey:   dateObj.getTime(),
      };
    })
    .sort((a, b) => b.sortKey - a.sortKey);
}

export default function AnalyticsScreen() {
  const { activeStore } = useStore();
  const { t } = useLanguage();
  const c = useAppColors();
  const s = makeStyles(c);
  const perms = ROLE_PERMISSIONS[activeStore.role];
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [period, setPeriod] = useState<Period>('Today');
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const PERIODS: { label: string; value: Period }[] = [
    { label: t('analytics_period_today'), value: 'Today' },
    { label: t('analytics_period_week'),  value: 'This Week' },
    { label: t('analytics_period_month'), value: 'This Month' },
    { label: t('analytics_period_all'),   value: 'All Time' },
  ];

  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await listOrders({ sellerId: activeStore.id });
      setAllOrders(data);
    } catch {
      // keep previous data on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeStore.id]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const stats = useMemo(
    () => deriveStats(allOrders, period, activeStore.id),
    [allOrders, period, activeStore.id],
  );

  const payouts = useMemo(() => derivePayouts(allOrders), [allOrders]);
  const pendingPayout = payouts.find(p => p.status === 'pending');

  const barMax = stats.barData.reduce((m, b) => Math.max(m, b.max), 1);
  const totalBuyers = stats.newBuyers + stats.returningBuyers;

  return (
    <ScrollView
      style={s.screen}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchOrders(true)}
          tintColor="#2d7a47"
        />
      }>
      <StoreSwitcher visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />

      {/* Header */}
      <View style={s.header}>
        <SafeAreaView edges={['top']}>
          <View style={s.headerRow}>
            <Pressable onPress={() => setSwitcherOpen(true)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={s.headerTitle}>{t('analytics_title')}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 2 }}>⌄</Text>
              </View>
              <Text style={s.headerSub}>{activeStore.name} · {t('analytics_store_perf')}</Text>
            </Pressable>
            <Pressable style={s.exportBtn}>
              <Text style={s.exportTxt}>📤 {t('analytics_export')}</Text>
            </Pressable>
          </View>

          {/* Period Selector */}
          <View style={s.periodRow}>
            {PERIODS.map((p) => (
              <Pressable
                key={p.value}
                style={[s.periodBtn, period === p.value && s.periodBtnActive]}
                onPress={() => setPeriod(p.value)}>
                <Text style={[s.periodTxt, period === p.value && s.periodTxtActive]}>{p.label}</Text>
              </Pressable>
            ))}
          </View>
        </SafeAreaView>
      </View>

      {loading ? (
        <View style={{ alignItems: 'center', paddingTop: 60 }}>
          <ActivityIndicator color="#2d7a47" size="large" />
          <Text style={{ marginTop: 12, color: c.textMuted, fontSize: 13 }}>{t('analytics_loading')}</Text>
        </View>
      ) : (
        <>
          {/* Revenue Card */}
          <View style={s.section}>
            <View style={s.revenueCard}>
              <View style={{ flex: 1 }}>
                <Text style={s.revLabel}>{t('analytics_total_revenue')}</Text>
                <Text style={s.revValue}>{stats.revenue}</Text>
                <Text style={s.revTrend}>📈 {stats.revTrend}</Text>
              </View>
              <View style={s.revRight}>
                <View style={s.revStat}>
                  <Text style={s.revStatVal}>{stats.orderCount}</Text>
                  <Text style={s.revStatLbl}>{t('analytics_orders')}</Text>
                  <Text style={s.revStatTrend}>{stats.orderTrend}</Text>
                </View>
                <View style={s.revStat}>
                  <Text style={s.revStatVal}>{stats.avgOrder}</Text>
                  <Text style={s.revStatLbl}>{t('analytics_avg_order')}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Revenue Chart */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('analytics_revenue_breakdown')}</Text>
            <View style={s.chartCard}>
              {stats.barData.every(b => b.value === 0) ? (
                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <Text style={{ fontSize: 13, color: c.textFaint }}>{t('analytics_no_delivered')}</Text>
                </View>
              ) : (
                <View style={s.bars}>
                  {stats.barData.map((bar) => {
                    const pct = (bar.value / barMax) * 100;
                    return (
                      <View key={bar.label} style={s.barCol}>
                        <Text style={s.barValTxt}>
                          {bar.value >= 1000
                            ? `₹${(bar.value / 1000).toFixed(1)}k`
                            : bar.value > 0 ? `₹${bar.value}` : ''}
                        </Text>
                        <View style={s.barTrack}>
                          <View style={[s.barFill, { height: `${pct}%` as any }]} />
                        </View>
                        <Text style={s.barLabel}>{bar.label}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>

          {/* Buyer Insights */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('analytics_buyer_insights')}</Text>
            {totalBuyers === 0 ? (
              <View style={{ backgroundColor: c.bg, borderRadius: 12, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: c.border }}>
                <Text style={{ fontSize: 13, color: c.textFaint }}>{t('analytics_no_buyers')}</Text>
              </View>
            ) : (
              <View style={s.insightRow}>
                <View style={s.insightCard}>
                  <Text style={s.insightVal}>{stats.newBuyers}</Text>
                  <Text style={s.insightLbl}>{t('analytics_new_buyers')}</Text>
                  <View style={s.insightBar}>
                    <View
                      style={[
                        s.insightFill,
                        {
                          width: `${(stats.newBuyers / totalBuyers) * 100}%` as any,
                          backgroundColor: '#c97b1a',
                        },
                      ]}
                    />
                  </View>
                </View>
                <View style={s.insightCard}>
                  <Text style={s.insightVal}>{stats.returningBuyers}</Text>
                  <Text style={s.insightLbl}>{t('analytics_returning')}</Text>
                  <View style={s.insightBar}>
                    <View
                      style={[
                        s.insightFill,
                        {
                          width: `${(stats.returningBuyers / totalBuyers) * 100}%` as any,
                          backgroundColor: '#2d7a47',
                        },
                      ]}
                    />
                  </View>
                </View>
                <View style={s.insightCard}>
                  <Text style={s.insightVal}>
                    {Math.round((stats.returningBuyers / totalBuyers) * 100)}%
                  </Text>
                  <Text style={s.insightLbl}>{t('analytics_repeat_rate')}</Text>
                  <View style={s.insightBar}>
                    <View
                      style={[
                        s.insightFill,
                        {
                          width: `${(stats.returningBuyers / totalBuyers) * 100}%` as any,
                          backgroundColor: '#2d7a47',
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Top Products */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('analytics_top_products')}</Text>
            {stats.topProducts.length === 0 ? (
              <View style={{ backgroundColor: c.bg, borderRadius: 12, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: c.border }}>
                <Text style={{ fontSize: 13, color: c.textFaint }}>{t('analytics_no_sales')}</Text>
              </View>
            ) : (
              <View style={s.topProductsCard}>
                {stats.topProducts.map((p, i) => (
                  <View key={p.name} style={[s.topRow, i > 0 && s.topRowBorder]}>
                    <Text style={s.topRank}>{i + 1}</Text>
                    <View style={s.topIcon}>
                      <Text style={{ fontSize: 22 }}>📦</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.topName}>{p.name}</Text>
                      <Text style={s.topUnits}>{p.units} {t('analytics_units_sold')}</Text>
                    </View>
                    <Text style={s.topRevenue}>₹{p.revenue.toLocaleString('en-IN')}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Payout History — gated to owner/manager */}
          {perms.canManagePayouts || perms.canViewAnalytics ? (
            <View style={[s.section, { paddingBottom: 32 }]}>
              <View style={s.sectionHead}>
                <Text style={s.sectionTitle}>{t('analytics_payout_history')}</Text>
                <Pressable><Text style={s.seeAll}>{t('analytics_view_all')}</Text></Pressable>
              </View>
              {payouts.length === 0 ? (
                <View style={s.payoutEmpty}>
                  <Text style={s.payoutEmptyIcon}>📊</Text>
                  <Text style={s.payoutEmptyTxt}>{t('analytics_no_payouts')}</Text>
                </View>
              ) : (
                <View style={s.payoutCard}>
                  {payouts.slice(0, 4).map((p, i) => (
                    <View key={p.sortKey} style={[s.payoutRow, i > 0 && s.payoutRowBorder]}>
                      <View style={s.payoutIcon}>
                        <Text style={{ fontSize: 18 }}>💳</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.payoutDate}>{p.dateLabel}</Text>
                        <Text style={s.payoutOrders}>{p.orders} {t('analytics_orders_settled')}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text style={s.payoutAmt}>{p.amount}</Text>
                        <PayoutBadge status={p.status} />
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {pendingPayout ? (
                <View style={s.nextPayoutCard}>
                  <Text style={s.nextPayoutIcon}>⏰</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.nextPayoutTitle}>{t('analytics_next_payout')}</Text>
                    <Text style={s.nextPayoutSub}>
                      {pendingPayout.amount} {t('analytics_payout_transfer')}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={[s.section, { paddingBottom: 32 }]}>
              <View style={{ backgroundColor: c.bgSubtle, borderRadius: 12, padding: 20, alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 28 }}>🔒</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: c.textSub }}>{t('analytics_payout_restricted')}</Text>
                <Text style={{ fontSize: 12, color: c.textMuted, textAlign: 'center' }}>
                  {t('analytics_payout_restricted_sub')}
                </Text>
              </View>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bgScreen },

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
    sectionTitle: { fontSize: 15, fontWeight: '700', color: c.text, marginBottom: 12 },
    seeAll: { fontSize: 12, color: c.primary, fontWeight: '600' },

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
      backgroundColor: c.bg,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 120 },
    barCol: { flex: 1, alignItems: 'center', gap: 4 },
    barValTxt: { fontSize: 8, color: c.textMuted, textAlign: 'center' },
    barTrack: {
      flex: 1,
      width: '100%',
      backgroundColor: c.bgSubtle,
      borderRadius: 4,
      overflow: 'hidden',
      justifyContent: 'flex-end',
    },
    barFill: { backgroundColor: '#2d7a47', borderRadius: 4, width: '100%' },
    barLabel: { fontSize: 9, color: c.textMuted },

    insightRow: { flexDirection: 'row', gap: 10 },
    insightCard: {
      flex: 1,
      backgroundColor: c.bg,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: c.border,
      gap: 4,
    },
    insightVal: { fontSize: 20, fontWeight: '700', color: c.text },
    insightLbl: { fontSize: 10, color: c.textMuted },
    insightBar: { height: 4, backgroundColor: c.bgSubtle, borderRadius: 2, overflow: 'hidden' },
    insightFill: { height: '100%', borderRadius: 2 },

    topProductsCard: {
      backgroundColor: c.bg,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    topRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
    topRowBorder: { borderTopWidth: 1, borderTopColor: c.borderLight },
    topRank: { fontSize: 14, fontWeight: '700', color: c.textFaint, width: 20 },
    topIcon: {
      width: 40,
      height: 40,
      backgroundColor: c.bgSubtle,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topName: { fontSize: 13, fontWeight: '600', color: c.text },
    topUnits: { fontSize: 11, color: c.textMuted, marginTop: 2 },
    topRevenue: { fontSize: 14, fontWeight: '700', color: c.primary },

    payoutEmpty: {
      backgroundColor: c.bgScreen, borderRadius: 14, borderWidth: 1,
      borderColor: c.border, padding: 24,
      alignItems: 'center', gap: 8,
    },
    payoutEmptyIcon: { fontSize: 28 },
    payoutEmptyTxt:  { fontSize: 12, color: c.textMuted, textAlign: 'center' },

    payoutCard: {
      backgroundColor: c.bg,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
      marginBottom: 12,
    },
    payoutRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
    payoutRowBorder: { borderTopWidth: 1, borderTopColor: c.borderLight },
    payoutIcon: {
      width: 38,
      height: 38,
      backgroundColor: c.primaryBg,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    payoutDate: { fontSize: 13, fontWeight: '600', color: c.text },
    payoutOrders: { fontSize: 11, color: c.textMuted, marginTop: 1 },
    payoutAmt: { fontSize: 14, fontWeight: '700', color: c.text },

    nextPayoutCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.warningBg,
      borderRadius: 12,
      padding: 14,
      gap: 10,
      borderWidth: 1,
      borderColor: c.warningBorder,
    },
    nextPayoutIcon: { fontSize: 24 },
    nextPayoutTitle: { fontSize: 13, fontWeight: '700', color: c.warningText },
    nextPayoutSub: { fontSize: 11, color: c.warningTextDark, marginTop: 3, lineHeight: 16 },
  });
}
