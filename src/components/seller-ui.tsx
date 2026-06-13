import { View, Text, StyleSheet } from 'react-native';

import { ROLE_CONFIG, type StoreRole } from '@/context/store-context';

export function RoleBadge({ role }: { role: StoreRole }) {
  const { label, bg, color } = ROLE_CONFIG[role];
  return (
    <View style={[s.stockBadge, { backgroundColor: bg }]}>
      <Text style={[s.stockText, { color }]}>{label}</Text>
    </View>
  );
}

export function HarvestDivider() {
  const colors = ['#2d7a47', '#c97b1a', '#1a4a28'];
  return (
    <View style={s.row}>
      {Array.from({ length: 12 }).map((_, i) => (
        <View key={i} style={[s.dot, { backgroundColor: colors[i % 3] }]} />
      ))}
    </View>
  );
}

type OrderStatusType = 'new' | 'accepted' | 'dispatched' | 'delivered' | 'cancelled';

export function OrderStatusBadge({ status }: { status: OrderStatusType }) {
  const config: Record<OrderStatusType, { label: string; bg: string; text: string; icon: string }> = {
    new: { label: 'New Order', bg: '#dbeafe', text: '#1e40af', icon: '🆕' },
    accepted: { label: 'Accepted', bg: '#fef3c7', text: '#92400e', icon: '✅' },
    dispatched: { label: 'Dispatched', bg: '#e0e7ff', text: '#3730a3', icon: '🚚' },
    delivered: { label: 'Delivered', bg: '#dcfce7', text: '#166534', icon: '✓' },
    cancelled: { label: 'Cancelled', bg: '#fee2e2', text: '#991b1b', icon: '✕' },
  };
  const c = config[status];
  return (
    <View style={[s.statusBadge, { backgroundColor: c.bg }]}>
      <Text style={[s.statusText, { color: c.text }]}>{c.icon} {c.label}</Text>
    </View>
  );
}

type StockStatusType = 'in_stock' | 'low_stock' | 'out_of_stock';

export function StockBadge({ status }: { status: StockStatusType }) {
  const config: Record<StockStatusType, { label: string; bg: string; text: string }> = {
    in_stock: { label: 'In Stock', bg: '#dcfce7', text: '#166534' },
    low_stock: { label: 'Low Stock', bg: '#fef3c7', text: '#92400e' },
    out_of_stock: { label: 'Out of Stock', bg: '#fee2e2', text: '#991b1b' },
  };
  const c = config[status];
  return (
    <View style={[s.stockBadge, { backgroundColor: c.bg }]}>
      <Text style={[s.stockText, { color: c.text }]}>{c.label}</Text>
    </View>
  );
}

type PayoutStatusType = 'pending' | 'processing' | 'paid';

export function PayoutBadge({ status }: { status: PayoutStatusType }) {
  const config: Record<PayoutStatusType, { label: string; bg: string; text: string }> = {
    pending: { label: 'Pending', bg: '#fef3c7', text: '#92400e' },
    processing: { label: 'Processing', bg: '#e0e7ff', text: '#3730a3' },
    paid: { label: 'Paid', bg: '#dcfce7', text: '#166534' },
  };
  const c = config[status];
  return (
    <View style={[s.stockBadge, { backgroundColor: c.bg }]}>
      <Text style={[s.stockText, { color: c.text }]}>{c.label}</Text>
    </View>
  );
}

type KycStatusType = 'verified' | 'pending' | 'action_required';

export function KycBadge({ status }: { status: KycStatusType }) {
  const config: Record<KycStatusType, { label: string; bg: string; text: string; icon: string }> = {
    verified: { label: 'KYC Verified', bg: '#dcfce7', text: '#166534', icon: '🛡️' },
    pending: { label: 'KYC Pending', bg: '#fef3c7', text: '#92400e', icon: '⏳' },
    action_required: { label: 'Action Required', bg: '#fee2e2', text: '#991b1b', icon: '⚠️' },
  };
  const c = config[status];
  return (
    <View style={[s.statusBadge, { backgroundColor: c.bg }]}>
      <Text style={[s.statusText, { color: c.text }]}>{c.icon} {c.label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4, justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  statusText: { fontSize: 11, fontWeight: '600' },
  stockBadge: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  stockText: { fontSize: 10, fontWeight: '600' },
});
