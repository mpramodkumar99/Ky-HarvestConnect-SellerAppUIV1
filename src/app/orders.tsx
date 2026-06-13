import { useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OrderStatusBadge } from '@/components/seller-ui';
import { StoreSwitcher } from '@/components/store-switcher';
import { useStore } from '@/context/store-context';

type OrderStatus = 'new' | 'accepted' | 'dispatched' | 'delivered' | 'cancelled';

interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

interface Order {
  id: string;
  buyer: string;
  phone: string;
  address: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  placedAt: string;
  deliverySlot?: string;
  paymentMode: 'UPI' | 'COD' | 'Card';
}

const allOrders: Order[] = [
  {
    id: 'HC-2406-0091',
    buyer: 'Priya Sharma',
    phone: '+91 98765 43210',
    address: 'Flat 4B, Vasavi Apts, Kukatpally, Hyderabad',
    items: [
      { name: 'Organic Turmeric 500g', qty: 2, price: 249 },
      { name: 'Red Chilli Powder 200g', qty: 1, price: 180 },
    ],
    total: 678,
    status: 'new',
    placedAt: '10:42 AM',
    deliverySlot: 'Today, 4–6 PM',
    paymentMode: 'UPI',
  },
  {
    id: 'HC-2406-0090',
    buyer: 'Ravi Kumar',
    phone: '+91 91234 56789',
    address: '12, Mig Colony, Miyapur, Hyderabad',
    items: [
      { name: 'Fresh Tomatoes 1 kg', qty: 3, price: 60 },
    ],
    total: 180,
    status: 'new',
    placedAt: '10:18 AM',
    deliverySlot: 'Tomorrow, 7–9 AM',
    paymentMode: 'COD',
  },
  {
    id: 'HC-2406-0089',
    buyer: 'Sunita Devi',
    phone: '+91 87654 32109',
    address: '303, Sai Nagar, KPHB, Hyderabad',
    items: [
      { name: 'Handwoven Cotton Towel', qty: 2, price: 350 },
      { name: 'Neem Soap', qty: 4, price: 40 },
    ],
    total: 860,
    status: 'accepted',
    placedAt: '9:31 AM',
    deliverySlot: 'Today, 2–4 PM',
    paymentMode: 'UPI',
  },
  {
    id: 'HC-2406-0085',
    buyer: 'Mahesh Babu',
    phone: '+91 99887 76655',
    address: '7, Gokul Nagar, Kompally, Secunderabad',
    items: [
      { name: 'Coconut Oil 500ml', qty: 2, price: 320 },
      { name: 'Coriander Seeds 250g', qty: 2, price: 90 },
    ],
    total: 820,
    status: 'dispatched',
    placedAt: 'Yesterday',
    paymentMode: 'Card',
  },
  {
    id: 'HC-2406-0080',
    buyer: 'Anitha Reddy',
    phone: '+91 97531 24680',
    address: '22B, Prakash Nagar, Begumpet, Hyderabad',
    items: [
      { name: 'Organic Turmeric 500g', qty: 1, price: 249 },
    ],
    total: 249,
    status: 'delivered',
    placedAt: 'Jun 11',
    paymentMode: 'UPI',
  },
  {
    id: 'HC-2406-0078',
    buyer: 'Venkat Rao',
    phone: '+91 88990 11223',
    address: 'Plot 9, Manikonda, Hyderabad',
    items: [
      { name: 'Brinjal 500g', qty: 2, price: 40 },
    ],
    total: 80,
    status: 'cancelled',
    placedAt: 'Jun 11',
    paymentMode: 'COD',
  },
];

const tabs: { label: string; value: OrderStatus | 'all' }[] = [
  { label: 'New', value: 'new' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Dispatched', value: 'dispatched' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
];

function countByStatus(status: OrderStatus) {
  return allOrders.filter((o) => o.status === status).length;
}

function nextAction(status: OrderStatus): { label: string; color: string; bg: string } | null {
  if (status === 'new') return { label: 'Accept Order ✓', color: '#fff', bg: '#2d7a47' };
  if (status === 'accepted') return { label: 'Mark Dispatched 🚚', color: '#166534', bg: '#f0fdf4' };
  if (status === 'dispatched') return { label: 'Mark Delivered ✓', color: '#1e40af', bg: '#eff6ff' };
  return null;
}

export default function OrdersScreen() {
  const { activeStore } = useStore();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<OrderStatus>('new');

  const filtered = allOrders.filter((o) => o.status === activeTab);

  return (
    <View style={s.screen}>
      <StoreSwitcher visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
      {/* Header */}
      <View style={s.header}>
        <SafeAreaView edges={['top']}>
          <View style={s.headerRow}>
            <Pressable onPress={() => setSwitcherOpen(true)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={s.headerTitle}>Order Management</Text>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 2 }}>⌄</Text>
              </View>
              <Text style={s.headerSub}>{activeStore.name} · {countByStatus('new')} new · {countByStatus('accepted')} accepted</Text>
            </Pressable>
            <Pressable style={s.filterBtn}>
              <Text style={{ fontSize: 16 }}>⚙️</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>

      {/* Tabs */}
      <View style={s.tabsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
          {tabs.map((tab) => {
            const count = countByStatus(tab.value as OrderStatus);
            return (
              <Pressable
                key={tab.value}
                style={[s.tab, activeTab === tab.value && s.tabActive]}
                onPress={() => setActiveTab(tab.value as OrderStatus)}>
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

      {/* Order List */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.listContent}>
        {filtered.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={{ fontSize: 40 }}>📭</Text>
            <Text style={s.emptyTitle}>No {activeTab} orders</Text>
            <Text style={s.emptySub}>Orders will appear here when customers place them</Text>
          </View>
        ) : (
          filtered.map((order) => {
            const action = nextAction(order.status);
            return (
              <View key={order.id} style={s.orderCard}>
                {/* Order Header */}
                <View style={s.orderHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.orderId}>{order.id}</Text>
                    <Text style={s.orderTime}>Placed {order.placedAt}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <OrderStatusBadge status={order.status} />
                    <View style={s.payMode}>
                      <Text style={s.payModeTxt}>
                        {order.paymentMode === 'COD' ? '💵' : '📱'} {order.paymentMode}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Buyer Info */}
                <View style={s.buyerRow}>
                  <View style={s.buyerAvatar}>
                    <Text style={{ fontSize: 16 }}>👤</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.buyerName}>{order.buyer}</Text>
                    <Text style={s.buyerAddr} numberOfLines={1}>{order.address}</Text>
                    {order.deliverySlot && (
                      <Text style={s.deliverySlot}>🕐 {order.deliverySlot}</Text>
                    )}
                  </View>
                  <Pressable style={s.callBtn}>
                    <Text style={{ fontSize: 16 }}>📞</Text>
                  </Pressable>
                </View>

                {/* Items */}
                <View style={s.itemsBox}>
                  {order.items.map((item, i) => (
                    <View key={i} style={s.itemRow}>
                      <Text style={s.itemName}>{item.name}</Text>
                      <Text style={s.itemQty}>× {item.qty}</Text>
                      <Text style={s.itemPrice}>₹{item.price * item.qty}</Text>
                    </View>
                  ))}
                  <View style={s.totalRow}>
                    <Text style={s.totalLabel}>Total</Text>
                    <Text style={s.totalAmt}>₹{order.total}</Text>
                  </View>
                </View>

                {/* Action */}
                {action && (
                  <View style={s.actionRow}>
                    {order.status === 'new' && (
                      <Pressable style={s.declineBtn}>
                        <Text style={s.declineTxt}>Decline</Text>
                      </Pressable>
                    )}
                    <Pressable
                      style={[s.actionBtn, { backgroundColor: action.bg, flex: 1 }]}>
                      <Text style={[s.actionBtnTxt, { color: action.color }]}>
                        {action.label}
                      </Text>
                    </Pressable>
                  </View>
                )}

                {order.status === 'delivered' && (
                  <View style={s.completedRow}>
                    <Text style={s.completedTxt}>✓ Order completed · ₹{Math.round(order.total * 0.93)} earned after 7% commission</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
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
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 3 },
  filterBtn: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabsWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tabs: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: '#f3f4f6',
    gap: 5,
  },
  tabActive: { backgroundColor: '#2d7a47' },
  tabTxt: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  tabTxtActive: { color: '#fff' },
  tabBadge: {
    backgroundColor: '#e5e7eb',
    borderRadius: 99,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  tabBadgeTxt: { fontSize: 10, fontWeight: '700', color: '#374151' },
  tabBadgeTxtActive: { color: '#fff' },

  listContent: { padding: 16, gap: 12, paddingBottom: 32 },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  emptySub: { fontSize: 13, color: '#6b7280', textAlign: 'center', maxWidth: 240 },

  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  orderHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  orderId: { fontSize: 13, fontWeight: '700', color: '#111827' },
  orderTime: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  payMode: {
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  payModeTxt: { fontSize: 10, color: '#374151', fontWeight: '600' },

  buyerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  buyerAvatar: {
    width: 36,
    height: 36,
    backgroundColor: '#f3f4f6',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyerName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  buyerAddr: { fontSize: 11, color: '#6b7280', marginTop: 1 },
  deliverySlot: { fontSize: 11, color: '#2d7a47', fontWeight: '600', marginTop: 2 },
  callBtn: {
    width: 34,
    height: 34,
    backgroundColor: '#f0fdf4',
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  itemsBox: { padding: 12, gap: 6 },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemName: { flex: 1, fontSize: 12, color: '#374151' },
  itemQty: { fontSize: 12, color: '#6b7280', marginRight: 8 },
  itemPrice: { fontSize: 12, fontWeight: '600', color: '#111827' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 8,
    marginTop: 4,
  },
  totalLabel: { fontSize: 13, fontWeight: '700', color: '#111827' },
  totalAmt: { fontSize: 15, fontWeight: '700', color: '#2d7a47' },

  actionRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    paddingTop: 0,
  },
  declineBtn: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  declineTxt: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  actionBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  actionBtnTxt: { fontSize: 13, fontWeight: '700' },

  completedRow: {
    padding: 12,
    paddingTop: 0,
  },
  completedTxt: { fontSize: 11, color: '#6b7280', textAlign: 'center' },
});
