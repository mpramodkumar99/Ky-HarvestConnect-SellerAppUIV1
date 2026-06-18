import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Linking, RefreshControl, ScrollView,
  StyleSheet, Text, View, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OrderStatusBadge } from '@/components/seller-ui';
import { StoreSwitcher } from '@/components/store-switcher';
import { DeclineReasonModal } from '@/components/decline-reason-modal';
import { OrderDetailModal } from '@/components/order-detail-modal';
import { OrderFilterModal, type OrderFilters } from '@/components/order-filter-modal';
import { useStore } from '@/context/store-context';
import { useOrderAlert } from '@/context/order-alert-context';
import { useLanguage } from '@/context/language-context';
import { useAppColors, type AppColors } from '@/hooks/use-app-colors';
import {
  listOrders, updateOrderStatus, cancelOrder,
  toSellerTab, payMethodLabel, formatOrderDate,
  type Order, type SellerTab,
} from '@/services/order-api';

export default function OrdersScreen() {
  const { activeStore, setNewOrderCount } = useStore();
  const { testAlert, stopAlert } = useOrderAlert();
  const { t } = useLanguage();
  const c = useAppColors();
  const s = makeStyles(c);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SellerTab>('new');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [declineOrder, setDeclineOrder] = useState<Order | null>(null);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState<OrderFilters>({ paymentMethod: null });

  const TABS: { label: string; value: SellerTab }[] = [
    { label: t('orders_new'),        value: 'new' },
    { label: t('orders_accepted'),   value: 'accepted' },
    { label: t('orders_dispatched'), value: 'dispatched' },
    { label: t('orders_delivered'),  value: 'delivered' },
    { label: t('orders_cancelled'),  value: 'cancelled' },
  ];

  function nextAction(order: Order): { label: string; color: string; bg: string } | null {
    if (order.status === 'confirmed' || order.status === 'pending_payment')
      return { label: t('orders_accept_order'), color: '#fff', bg: '#2d7a47' };
    if (order.status === 'processing')
      return { label: t('orders_mark_dispatched'), color: '#166534', bg: '#f0fdf4' };
    if (order.status === 'dispatched' || order.status === 'in_transit')
      return { label: t('orders_mark_delivered'), color: '#1e40af', bg: '#eff6ff' };
    return null;
  }

  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await listOrders({ sellerId: activeStore.id });
      setOrders(data);
    } catch {
      if (!isRefresh) setOrders([]);
    } finally {
      if (isRefresh) setRefreshing(false); else setLoading(false);
    }
  }, [activeStore.id]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  function tabCount(tab: SellerTab) {
    return orders.filter((o) => toSellerTab(o.status) === tab).length;
  }

  useEffect(() => {
    setNewOrderCount(tabCount('new'));
  }, [orders, setNewOrderCount]);

  const filtered = orders
    .filter((o) => toSellerTab(o.status) === activeTab)
    .filter((o) => !filters.paymentMethod || o.paymentMethod === filters.paymentMethod);

  function updateOrderInState(updated: Order) {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
  }

  async function handleAccept(order: Order) {
    stopAlert();
    setActionLoading(order.id);
    try {
      const updated = await updateOrderStatus(order.id, 'processing');
      updateOrderInState(updated);
      setActiveTab('accepted');
    } catch {
      Alert.alert('Error', 'Failed to accept order. Please try again.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleMarkDispatched(order: Order) {
    setActionLoading(order.id);
    try {
      const updated = await updateOrderStatus(order.id, 'dispatched');
      updateOrderInState(updated);
      setActiveTab('dispatched');
    } catch {
      Alert.alert('Error', 'Failed to update order. Please try again.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleMarkDelivered(order: Order) {
    setActionLoading(order.id);
    try {
      const updated = await updateOrderStatus(order.id, 'delivered');
      updateOrderInState(updated);
      setActiveTab('delivered');
    } catch {
      Alert.alert('Error', 'Failed to update order. Please try again.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeclineConfirm(reason: string) {
    if (!declineOrder) return;
    stopAlert();
    const target = declineOrder;
    setActionLoading(target.id);
    try {
      const updated = await cancelOrder(target.id, reason);
      updateOrderInState(updated);
      setDeclineOrder(null);
      setActiveTab('cancelled');
    } catch {
      Alert.alert('Error', 'Failed to decline order. Please try again.');
    } finally {
      setActionLoading(null);
    }
  }

  function handlePrimaryAction(order: Order) {
    if (order.status === 'confirmed' || order.status === 'pending_payment') handleAccept(order);
    else if (order.status === 'processing') handleMarkDispatched(order);
    else if (order.status === 'dispatched' || order.status === 'in_transit') handleMarkDelivered(order);
  }

  function handleCallBuyer(order: Order) {
    Linking.openURL(`tel:${order.buyerPhone}`);
  }

  const hasActiveFilter = filters.paymentMethod !== null;

  return (
    <View style={s.screen}>
      <StoreSwitcher visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />

      <OrderDetailModal
        visible={detailOrder !== null}
        order={detailOrder}
        onClose={() => setDetailOrder(null)}
        onAccept={handleAccept}
        onDecline={(o) => { setDetailOrder(null); setDeclineOrder(o); }}
        onMarkDispatched={handleMarkDispatched}
        onMarkDelivered={handleMarkDelivered}
        actionLoading={detailOrder ? actionLoading === detailOrder.id : false}
      />

      <DeclineReasonModal
        visible={declineOrder !== null}
        orderId={declineOrder?.id ?? ''}
        onClose={() => setDeclineOrder(null)}
        onConfirm={handleDeclineConfirm}
        loading={declineOrder ? actionLoading === declineOrder.id : false}
      />

      <OrderFilterModal
        visible={filterVisible}
        filters={filters}
        onClose={() => setFilterVisible(false)}
        onApply={(f) => { setFilters(f); setFilterVisible(false); }}
      />

      {/* Header */}
      <View style={s.header}>
        <SafeAreaView edges={['top']}>
          <View style={s.headerRow}>
            <Pressable onPress={() => setSwitcherOpen(true)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={s.headerTitle}>{t('orders_header_title')}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 2 }}>⌄</Text>
              </View>
              <Text style={s.headerSub}>
                {activeStore.name} · {tabCount('new')} {t('orders_new')} · {tabCount('accepted')} {t('orders_accepted')}
              </Text>
            </Pressable>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable onPress={testAlert} style={s.filterBtn}>
                <Text style={{ fontSize: 16 }}>🔔</Text>
              </Pressable>
              <Pressable style={s.filterBtn} onPress={() => setFilterVisible(true)}>
                <Text style={{ fontSize: 16 }}>⚙️</Text>
                {hasActiveFilter && <View style={s.filterDot} />}
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Tabs */}
      <View style={s.tabsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
          {TABS.map((tab) => {
            const count = tabCount(tab.value);
            return (
              <Pressable
                key={tab.value}
                style={[s.tab, activeTab === tab.value && s.tabActive]}
                onPress={() => setActiveTab(tab.value)}>
                <Text style={[s.tabTxt, activeTab === tab.value && s.tabTxtActive]}>
                  {tab.label}
                </Text>
                {count > 0 && (
                  <View style={[s.tabBadge, activeTab === tab.value && s.tabBadgeActive]}>
                    <Text style={[s.tabBadgeTxt, activeTab === tab.value && s.tabBadgeTxtActive]}>
                      {count}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Filter active hint */}
      {hasActiveFilter && (
        <View style={s.filterHint}>
          <Text style={s.filterHintTxt}>
            {t('orders_filter_hint')} {payMethodLabel(filters.paymentMethod!).replace(/^\S+ /, '')}
          </Text>
          <Pressable onPress={() => setFilters({ paymentMethod: null })}>
            <Text style={s.filterHintClear}>{t('orders_filter_clear')}</Text>
          </Pressable>
        </View>
      )}

      {/* Order List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchOrders(true)}
            colors={['#2d7a47']}
            tintColor="#2d7a47"
          />
        }>
        {loading ? (
          <View style={s.emptyState}>
            <Text style={{ fontSize: 32 }}>⏳</Text>
            <Text style={s.emptyTitle}>{t('orders_loading')}</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={{ fontSize: 40 }}>📭</Text>
            <Text style={s.emptyTitle}>{t('orders_no_orders')}</Text>
            <Text style={s.emptySub}>{t('orders_empty_sub')}</Text>
          </View>
        ) : (
          filtered.map((order) => {
            const action = nextAction(order);
            const isActionLoading = actionLoading === order.id;
            const addrLine = [order.deliveryAddress.line1, order.deliveryAddress.city]
              .filter(Boolean).join(', ');

            return (
              <Pressable
                key={order.id}
                style={s.orderCard}
                onPress={() => setDetailOrder(order)}>

                {/* Order Header */}
                <View style={s.orderHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.orderId}>{order.id}</Text>
                    <Text style={s.orderTime}>{t('orders_placed')} {formatOrderDate(order.createdAt)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <OrderStatusBadge status={toSellerTab(order.status)} />
                    <View style={s.payMode}>
                      <Text style={s.payModeTxt}>{payMethodLabel(order.paymentMethod)}</Text>
                    </View>
                  </View>
                </View>

                {/* Buyer Info */}
                <View style={s.buyerRow}>
                  <View style={s.buyerAvatar}>
                    <Text style={{ fontSize: 16 }}>👤</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.buyerName}>{order.buyerName}</Text>
                    <Text style={s.buyerAddr} numberOfLines={1}>{addrLine}</Text>
                  </View>
                  <Pressable
                    style={s.callBtn}
                    onPress={() => handleCallBuyer(order)}>
                    <Text style={{ fontSize: 16 }}>📞</Text>
                  </Pressable>
                </View>

                {/* Items */}
                <View style={s.itemsBox}>
                  {order.items.map((item, i) => (
                    <View key={i} style={s.itemRow}>
                      <Text style={s.itemName}>{item.productName}</Text>
                      <Text style={s.itemQty}>× {item.quantity}</Text>
                      <Text style={s.itemPrice}>₹{Math.round(item.totalPrice / 100)}</Text>
                    </View>
                  ))}
                  <View style={s.totalRow}>
                    <Text style={s.totalLabel}>{t('orders_total')}</Text>
                    <Text style={s.totalAmt}>₹{Math.round(order.total / 100)}</Text>
                  </View>
                </View>

                {/* Actions */}
                {action && (
                  <View style={s.actionRow}>
                    {(order.status === 'confirmed' || order.status === 'pending_payment') && (
                      <Pressable
                        style={s.declineBtn}
                        onPress={() => setDeclineOrder(order)}
                        disabled={isActionLoading}>
                        <Text style={s.declineTxt}>{t('orders_decline')}</Text>
                      </Pressable>
                    )}
                    <Pressable
                      style={[s.actionBtn, { backgroundColor: action.bg, flex: 1 }, isActionLoading && s.actionBtnLoading]}
                      onPress={() => handlePrimaryAction(order)}
                      disabled={isActionLoading}>
                      <Text style={[s.actionBtnTxt, { color: action.color }]}>
                        {isActionLoading ? t('orders_processing') : action.label}
                      </Text>
                    </Pressable>
                  </View>
                )}

                {order.status === 'delivered' && (
                  <View style={s.completedRow}>
                    <Text style={s.completedTxt}>
                      ✓ {t('orders_completed_txt')} · ₹{Math.round(order.total * 0.93 / 100)} {t('orders_after_commission')}
                    </Text>
                  </View>
                )}

                {(order.status === 'cancelled' || order.status === 'refund_initiated' || order.status === 'refunded') && order.cancelReason && (
                  <View style={s.cancelRow}>
                    <Text style={s.cancelTxt}>{t('orders_cancel_reason')} {order.cancelReason}</Text>
                  </View>
                )}

              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
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
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
    headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 3 },
    filterBtn: {
      width: 36, height: 36,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterDot: {
      position: 'absolute',
      top: 4, right: 4,
      width: 8, height: 8,
      borderRadius: 4,
      backgroundColor: '#f59e0b',
    },

    tabsWrap: { backgroundColor: c.bg, borderBottomWidth: 1, borderBottomColor: c.border },
    tabs: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 99,
      backgroundColor: c.bgSubtle,
      gap: 5,
    },
    tabActive: { backgroundColor: '#2d7a47' },
    tabTxt: { fontSize: 12, fontWeight: '600', color: c.textMuted },
    tabTxtActive: { color: '#fff' },
    tabBadge: {
      backgroundColor: c.border,
      borderRadius: 99,
      minWidth: 18, height: 18,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
    tabBadgeTxt: { fontSize: 10, fontWeight: '700', color: c.textSub },
    tabBadgeTxtActive: { color: '#fff' },

    filterHint: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: c.warningBg,
      borderBottomWidth: 1,
      borderBottomColor: c.warningBorder,
    },
    filterHintTxt: { fontSize: 12, color: c.warningText, fontWeight: '600' },
    filterHintClear: { fontSize: 12, color: c.primary, fontWeight: '700' },

    listContent: { padding: 16, gap: 12, paddingBottom: 32 },

    emptyState: { alignItems: 'center', paddingVertical: 60, gap: 10 },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: c.text },
    emptySub: { fontSize: 13, color: c.textMuted, textAlign: 'center', maxWidth: 240 },

    orderCard: {
      backgroundColor: c.bg,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    orderHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 14,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.borderLight,
    },
    orderId: { fontSize: 13, fontWeight: '700', color: c.text },
    orderTime: { fontSize: 11, color: c.textFaint, marginTop: 2 },
    payMode: {
      backgroundColor: c.bgSubtle,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    payModeTxt: { fontSize: 10, color: c.textSub, fontWeight: '600' },

    buyerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      paddingTop: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.borderLight,
    },
    buyerAvatar: {
      width: 36, height: 36,
      backgroundColor: c.bgSubtle,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buyerName: { fontSize: 13, fontWeight: '600', color: c.text },
    buyerAddr: { fontSize: 11, color: c.textMuted, marginTop: 1 },
    callBtn: {
      width: 34, height: 34,
      backgroundColor: c.primaryBg,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },

    itemsBox: { padding: 12, gap: 6 },
    itemRow: { flexDirection: 'row', alignItems: 'center' },
    itemName: { flex: 1, fontSize: 12, color: c.textSub },
    itemQty: { fontSize: 12, color: c.textMuted, marginRight: 8 },
    itemPrice: { fontSize: 12, fontWeight: '600', color: c.text },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: c.borderLight,
      paddingTop: 8,
      marginTop: 4,
    },
    totalLabel: { fontSize: 13, fontWeight: '700', color: c.text },
    totalAmt: { fontSize: 15, fontWeight: '700', color: c.primary },

    actionRow: {
      flexDirection: 'row',
      gap: 8,
      padding: 12,
      paddingTop: 0,
    },
    declineBtn: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    declineTxt: { fontSize: 13, color: c.textMuted, fontWeight: '600' },
    actionBtn: {
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.primaryBorder,
    },
    actionBtnLoading: { opacity: 0.7 },
    actionBtnTxt: { fontSize: 13, fontWeight: '700' },

    completedRow: { padding: 12, paddingTop: 0 },
    completedTxt: { fontSize: 11, color: c.textMuted, textAlign: 'center' },

    cancelRow: {
      padding: 12,
      paddingTop: 0,
      backgroundColor: c.errorBg,
    },
    cancelTxt: { fontSize: 11, color: c.errorText, fontStyle: 'italic' },
  });
}
