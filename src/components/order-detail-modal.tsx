import {
  Modal, View, Text, Pressable, ScrollView, StyleSheet, Linking,
} from 'react-native';
import type { Order, OrderStatus } from '@/services/order-api';
import { payMethodLabel } from '@/services/order-api';

const STATUS_LEVEL: Partial<Record<OrderStatus, number>> = {
  pending_payment: 0, confirmed: 0,
  processing: 1,
  dispatched: 2, in_transit: 2,
  delivered: 3,
};

const TIMELINE_STEPS = [
  { id: 'placed',     label: 'Order Placed', level: 0 },
  { id: 'accepted',   label: 'Accepted',     level: 1 },
  { id: 'dispatched', label: 'Dispatched',   level: 2 },
  { id: 'delivered',  label: 'Delivered',    level: 3 },
] as const;

interface Props {
  visible: boolean;
  order: Order | null;
  onClose: () => void;
  onAccept: (order: Order) => void;
  onDecline: (order: Order) => void;
  onMarkDispatched: (order: Order) => void;
  onMarkDelivered: (order: Order) => void;
  actionLoading: boolean;
}

export function OrderDetailModal({
  visible, order, onClose,
  onAccept, onDecline, onMarkDispatched, onMarkDelivered,
  actionLoading,
}: Props) {
  if (!order) return null;

  const level = STATUS_LEVEL[order.status] ?? -1;
  const isCancelled = level === -1;

  const addr = order.deliveryAddress;
  const addrFull = [addr.line1, addr.line2, addr.city, addr.district, addr.state, addr.pincode]
    .filter(Boolean).join(', ');

  const placedAt = new Date(order.createdAt).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  const cancelLabel =
    order.status === 'refund_initiated' ? 'Refund Initiated' :
    order.status === 'refunded'         ? 'Refunded' :
    'Cancelled';

  function handleFooterAction() {
    if (order.status === 'confirmed' || order.status === 'pending_payment') {
      onAccept(order); onClose();
    } else if (order.status === 'processing') {
      onMarkDispatched(order); onClose();
    } else if (order.status === 'dispatched' || order.status === 'in_transit') {
      onMarkDelivered(order); onClose();
    }
  }

  const footerAction =
    order.status === 'confirmed' || order.status === 'pending_payment'
      ? { label: 'Accept Order ✓', color: '#fff', bg: '#2d7a47' }
    : order.status === 'processing'
      ? { label: 'Mark Dispatched 🚚', color: '#166534', bg: '#f0fdf4', border: '#d1fae5' }
    : order.status === 'dispatched' || order.status === 'in_transit'
      ? { label: 'Mark Delivered ✓', color: '#1e40af', bg: '#eff6ff', border: '#dbeafe' }
    : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={s.container}>
        <Pressable style={[StyleSheet.absoluteFill, s.backdrop]} onPress={onClose} />
        <View style={s.sheet}>

          {/* Header */}
          <View style={s.head}>
            <View>
              <Text style={s.headTitle}>{order.id}</Text>
              <Text style={s.headSub}>Placed {placedAt}</Text>
            </View>
            <Pressable style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeTxt}>✕</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

            {/* Timeline */}
            <View style={s.timelineWrap}>
              {TIMELINE_STEPS.map((step, i) => {
                const done = !isCancelled && level >= step.level;
                const isLast = i === TIMELINE_STEPS.length - 1;
                return (
                  <View key={step.id} style={s.timelineRow}>
                    <View style={s.timelineLeft}>
                      <View style={[s.timelineDot, done && s.timelineDotDone]}>
                        <Text style={[s.timelineDotTxt, done && s.timelineDotTxtDone]}>
                          {done ? '✓' : String(i + 1)}
                        </Text>
                      </View>
                      {!isLast && (
                        <View style={[s.timelineConnector, done && s.timelineConnectorDone]} />
                      )}
                    </View>
                    <View style={s.timelineContent}>
                      <Text style={[s.timelineLabel, done && s.timelineLabelDone]}>
                        {step.label}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {isCancelled && (
                <View style={[s.timelineRow, { marginTop: 4 }]}>
                  <View style={s.timelineLeft}>
                    <View style={s.timelineDotCancel}>
                      <Text style={[s.timelineDotTxt, { color: '#dc2626' }]}>✕</Text>
                    </View>
                  </View>
                  <View style={s.timelineContent}>
                    <Text style={s.timelineCancelLabel}>{cancelLabel}</Text>
                    {order.cancelReason && (
                      <Text style={s.timelineCancelReason}>"{order.cancelReason}"</Text>
                    )}
                  </View>
                </View>
              )}
            </View>

            {/* Buyer */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>BUYER</Text>
              <View style={s.buyerCard}>
                <View style={s.buyerAvatar}>
                  <Text style={{ fontSize: 20 }}>👤</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.buyerName}>{order.buyerName}</Text>
                  <Text style={s.buyerPhone}>{order.buyerPhone}</Text>
                </View>
                <Pressable
                  style={s.callChip}
                  onPress={() => Linking.openURL(`tel:${order.buyerPhone}`)}>
                  <Text style={{ fontSize: 15 }}>📞</Text>
                  <Text style={s.callChipTxt}>Call</Text>
                </Pressable>
              </View>
              <View style={s.addrBox}>
                <Text style={s.addrLabel}>{addr.label}</Text>
                <Text style={s.addrTxt}>{addrFull}</Text>
              </View>
            </View>

            {/* Items */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>ITEMS ({order.items.length})</Text>
              <View style={s.itemsBox}>
                {order.items.map((item, i) => (
                  <View key={i} style={[s.itemRow, i > 0 && s.itemRowBorder]}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.itemName}>{item.productName}</Text>
                      <Text style={s.itemMeta}>× {item.quantity} {item.unit}</Text>
                    </View>
                    <Text style={s.itemPrice}>₹{Math.round(item.totalPrice / 100)}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Payment */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>PAYMENT SUMMARY</Text>
              <View style={s.summaryBox}>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Subtotal</Text>
                  <Text style={s.summaryVal}>₹{Math.round(order.subtotal / 100)}</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Delivery fee</Text>
                  <Text style={s.summaryVal}>₹{Math.round(order.deliveryFee / 100)}</Text>
                </View>
                {order.discount > 0 && (
                  <View style={s.summaryRow}>
                    <Text style={s.summaryLabel}>Discount</Text>
                    <Text style={[s.summaryVal, { color: '#16a34a' }]}>
                      –₹{Math.round(order.discount / 100)}
                    </Text>
                  </View>
                )}
                <View style={[s.summaryRow, s.summaryTotalRow]}>
                  <Text style={s.summaryTotalLabel}>Total</Text>
                  <Text style={s.summaryTotalAmt}>₹{Math.round(order.total / 100)}</Text>
                </View>
                <View style={[s.summaryRow, { marginTop: 6 }]}>
                  <Text style={s.summaryLabel}>Payment</Text>
                  <Text style={s.summaryVal}>{payMethodLabel(order.paymentMethod)}</Text>
                </View>
              </View>
            </View>

            {order.trackingId && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>TRACKING</Text>
                <View style={s.trackingBox}>
                  <Text style={s.trackingId}>#{order.trackingId}</Text>
                  {order.estimatedDelivery && (
                    <Text style={s.trackingEta}>Est. delivery: {order.estimatedDelivery}</Text>
                  )}
                </View>
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer */}
          {!isCancelled && footerAction && (
            <View style={s.footer}>
              {(order.status === 'confirmed' || order.status === 'pending_payment') && (
                <Pressable
                  style={s.declineFooterBtn}
                  onPress={() => { onDecline(order); onClose(); }}
                  disabled={actionLoading}>
                  <Text style={s.declineFooterTxt}>Decline</Text>
                </Pressable>
              )}
              <Pressable
                style={[
                  s.primaryFooterBtn,
                  { backgroundColor: footerAction.bg },
                  'border' in footerAction
                    ? { borderWidth: 1, borderColor: (footerAction as { border: string }).border }
                    : undefined,
                  actionLoading && s.primaryFooterDisabled,
                ]}
                onPress={handleFooterAction}
                disabled={actionLoading}>
                <Text style={[s.primaryFooterTxt, { color: footerAction.color }]}>
                  {actionLoading ? 'Processing...' : footerAction.label}
                </Text>
              </Pressable>
            </View>
          )}

        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    overflow: 'hidden',
  },

  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  headSub: { fontSize: 11, color: '#9ca3af', marginTop: 3 },
  closeBtn: {
    width: 32, height: 32,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTxt: { fontSize: 13, color: '#374151', fontWeight: '700' },

  // ── Timeline ──────────────────────────────────────────────────────────────
  timelineWrap: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  timelineRow: { flexDirection: 'row', gap: 14 },
  timelineLeft: { alignItems: 'center', width: 24 },
  timelineDot: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#e5e7eb',
    alignItems: 'center', justifyContent: 'center',
  },
  timelineDotDone: { backgroundColor: '#2d7a47' },
  timelineDotCancel: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#fee2e2',
    alignItems: 'center', justifyContent: 'center',
  },
  timelineDotTxt: { fontSize: 10, fontWeight: '700', color: '#9ca3af' },
  timelineDotTxtDone: { color: '#fff' },
  timelineConnector: {
    flex: 1, width: 2,
    backgroundColor: '#e5e7eb',
    marginVertical: 2, minHeight: 18,
  },
  timelineConnectorDone: { backgroundColor: '#2d7a47' },
  timelineContent: { flex: 1, paddingTop: 4, paddingBottom: 16 },
  timelineLabel: { fontSize: 13, fontWeight: '600', color: '#9ca3af' },
  timelineLabelDone: { color: '#166534' },
  timelineCancelLabel: { fontSize: 13, fontWeight: '700', color: '#dc2626', paddingTop: 4 },
  timelineCancelReason: { fontSize: 12, color: '#9ca3af', fontStyle: 'italic', marginTop: 2 },

  // ── Sections ──────────────────────────────────────────────────────────────
  section: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 0,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9ca3af',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },

  // Buyer
  buyerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  buyerAvatar: {
    width: 40, height: 40,
    backgroundColor: '#e5e7eb',
    borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  buyerName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  buyerPhone: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  callChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  callChipTxt: { fontSize: 12, fontWeight: '700', color: '#166534' },
  addrBox: {
    marginTop: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 2,
  },
  addrLabel: { fontSize: 10, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase' },
  addrTxt: { fontSize: 12, color: '#374151', lineHeight: 18 },

  // Items
  itemsBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  itemRowBorder: { borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  itemName: { fontSize: 13, color: '#111827', fontWeight: '600' },
  itemMeta: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  itemPrice: { fontSize: 13, fontWeight: '700', color: '#374151' },

  // Payment
  summaryBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    gap: 6,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: '#6b7280' },
  summaryVal: { fontSize: 12, fontWeight: '600', color: '#374151' },
  summaryTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    marginTop: 2,
  },
  summaryTotalLabel: { fontSize: 14, fontWeight: '700', color: '#111827' },
  summaryTotalAmt: { fontSize: 16, fontWeight: '800', color: '#2d7a47' },

  // Tracking
  trackingBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
    gap: 3,
  },
  trackingId: { fontSize: 13, fontWeight: '700', color: '#1e40af' },
  trackingEta: { fontSize: 12, color: '#3b82f6' },

  // Footer
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  declineFooterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineFooterTxt: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  primaryFooterBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryFooterDisabled: { opacity: 0.6 },
  primaryFooterTxt: { fontSize: 14, fontWeight: '700' },
});
