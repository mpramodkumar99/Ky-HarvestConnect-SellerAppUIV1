import {
  Modal, View, Text, Pressable, ScrollView, StyleSheet, Linking,
} from 'react-native';
import type { Order, OrderStatus } from '@/services/order-api';
import { payMethodLabel } from '@/services/order-api';
import { useLanguage } from '@/context/language-context';
import { useAppColors, type AppColors } from '@/hooks/use-app-colors';

const STATUS_LEVEL: Partial<Record<OrderStatus, number>> = {
  pending_payment: 0, confirmed: 0,
  processing: 1,
  dispatched: 2, in_transit: 2,
  delivered: 3,
};

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
  const { t } = useLanguage();
  const c = useAppColors();
  const s = makeStyles(c);

  const TIMELINE_STEPS = [
    { id: 'placed',     label: t('order_detail_timeline_placed'),     level: 0 },
    { id: 'accepted',   label: t('order_detail_timeline_accepted'),   level: 1 },
    { id: 'dispatched', label: t('order_detail_timeline_dispatched'), level: 2 },
    { id: 'delivered',  label: t('order_detail_timeline_delivered'),  level: 3 },
  ] as const;

  if (!order) return null;
  const o = order;

  const level = STATUS_LEVEL[o.status] ?? -1;
  const isCancelled = level === -1;

  const addr = order.deliveryAddress;
  const addrFull = [addr.line1, addr.line2, addr.city, addr.district, addr.state, addr.pincode]
    .filter(Boolean).join(', ');

  const placedAt = new Date(order.createdAt).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  const cancelLabel =
    order.status === 'refund_initiated' ? t('order_detail_refund_init') :
    order.status === 'refunded'         ? t('order_detail_refunded') :
    t('order_detail_cancelled');

  function handleFooterAction() {
    if (o.status === 'confirmed' || o.status === 'pending_payment') {
      onAccept(o); onClose();
    } else if (o.status === 'processing') {
      onMarkDispatched(o); onClose();
    } else if (o.status === 'dispatched' || o.status === 'in_transit') {
      onMarkDelivered(o); onClose();
    }
  }

  const footerAction =
    order.status === 'confirmed' || order.status === 'pending_payment'
      ? { label: t('orders_accept_order'), color: '#fff', bg: '#2d7a47' }
    : order.status === 'processing'
      ? { label: t('orders_mark_dispatched'), color: c.primaryText, bg: c.primaryBg, border: c.primaryBorder }
    : order.status === 'dispatched' || order.status === 'in_transit'
      ? { label: t('orders_mark_delivered'), color: '#1e40af', bg: '#eff6ff', border: '#dbeafe' }
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
              <Text style={s.headSub}>{t('order_detail_placed')} {placedAt}</Text>
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
                      <Text style={[s.timelineDotTxt, { color: c.errorText }]}>✕</Text>
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
              <Text style={s.sectionTitle}>{t('order_detail_buyer')}</Text>
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
                  <Text style={s.callChipTxt}>{t('order_detail_call')}</Text>
                </Pressable>
              </View>
              <View style={s.addrBox}>
                <Text style={s.addrLabel}>{addr.label}</Text>
                <Text style={s.addrTxt}>{addrFull}</Text>
              </View>
            </View>

            {/* Items */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>{t('order_detail_items')} ({order.items.length})</Text>
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
              <Text style={s.sectionTitle}>{t('order_detail_payment')}</Text>
              <View style={s.summaryBox}>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>{t('order_detail_subtotal')}</Text>
                  <Text style={s.summaryVal}>₹{Math.round(order.subtotal / 100)}</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>{t('order_detail_delivery_fee')}</Text>
                  <Text style={s.summaryVal}>₹{Math.round(order.deliveryFee / 100)}</Text>
                </View>
                {order.discount > 0 && (
                  <View style={s.summaryRow}>
                    <Text style={s.summaryLabel}>{t('order_detail_discount')}</Text>
                    <Text style={[s.summaryVal, { color: c.primaryText }]}>
                      –₹{Math.round(order.discount / 100)}
                    </Text>
                  </View>
                )}
                <View style={[s.summaryRow, s.summaryTotalRow]}>
                  <Text style={s.summaryTotalLabel}>{t('order_detail_total')}</Text>
                  <Text style={s.summaryTotalAmt}>₹{Math.round(order.total / 100)}</Text>
                </View>
                <View style={[s.summaryRow, { marginTop: 6 }]}>
                  <Text style={s.summaryLabel}>{t('order_detail_pay_method')}</Text>
                  <Text style={s.summaryVal}>{payMethodLabel(order.paymentMethod)}</Text>
                </View>
              </View>
            </View>

            {order.trackingId && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>{t('order_detail_tracking')}</Text>
                <View style={s.trackingBox}>
                  <Text style={s.trackingId}>#{order.trackingId}</Text>
                  {order.estimatedDelivery && (
                    <Text style={s.trackingEta}>{t('order_detail_est_delivery')} {order.estimatedDelivery}</Text>
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
                  <Text style={s.declineFooterTxt}>{t('order_detail_decline')}</Text>
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
                  {actionLoading ? t('order_detail_processing') : footerAction.label}
                </Text>
              </Pressable>
            </View>
          )}

        </View>
      </View>
    </Modal>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { backgroundColor: 'rgba(0,0,0,0.55)' },
    sheet: {
      backgroundColor: c.bg,
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
      borderBottomColor: c.borderLight,
    },
    headTitle: { fontSize: 16, fontWeight: '800', color: c.text },
    headSub: { fontSize: 11, color: c.textFaint, marginTop: 3 },
    closeBtn: {
      width: 32, height: 32,
      backgroundColor: c.bgSubtle,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeTxt: { fontSize: 13, color: c.textSub, fontWeight: '700' },

    // ── Timeline ──────────────────────────────────────────────────────────────
    timelineWrap: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
      backgroundColor: c.bgScreen,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    timelineRow: { flexDirection: 'row', gap: 14 },
    timelineLeft: { alignItems: 'center', width: 24 },
    timelineDot: {
      width: 24, height: 24, borderRadius: 12,
      backgroundColor: c.bgSubtle,
      alignItems: 'center', justifyContent: 'center',
    },
    timelineDotDone: { backgroundColor: '#2d7a47' },
    timelineDotCancel: {
      width: 24, height: 24, borderRadius: 12,
      backgroundColor: c.errorBg,
      alignItems: 'center', justifyContent: 'center',
    },
    timelineDotTxt: { fontSize: 10, fontWeight: '700', color: c.textFaint },
    timelineDotTxtDone: { color: '#fff' },
    timelineConnector: {
      flex: 1, width: 2,
      backgroundColor: c.bgSubtle,
      marginVertical: 2, minHeight: 18,
    },
    timelineConnectorDone: { backgroundColor: '#2d7a47' },
    timelineContent: { flex: 1, paddingTop: 4, paddingBottom: 16 },
    timelineLabel: { fontSize: 13, fontWeight: '600', color: c.textFaint },
    timelineLabelDone: { color: c.primaryText },
    timelineCancelLabel: { fontSize: 13, fontWeight: '700', color: c.errorText, paddingTop: 4 },
    timelineCancelReason: { fontSize: 12, color: c.textFaint, fontStyle: 'italic', marginTop: 2 },

    // ── Sections ──────────────────────────────────────────────────────────────
    section: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 0,
    },
    sectionTitle: {
      fontSize: 10,
      fontWeight: '700',
      color: c.textFaint,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: 8,
    },

    // Buyer
    buyerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: c.bgScreen,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    buyerAvatar: {
      width: 40, height: 40,
      backgroundColor: c.bgSubtle,
      borderRadius: 20,
      alignItems: 'center', justifyContent: 'center',
    },
    buyerName: { fontSize: 14, fontWeight: '700', color: c.text },
    buyerPhone: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    callChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.primaryBg,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderWidth: 1,
      borderColor: c.primaryBorder,
    },
    callChipTxt: { fontSize: 12, fontWeight: '700', color: c.primaryText },
    addrBox: {
      marginTop: 8,
      backgroundColor: c.bgScreen,
      borderRadius: 10,
      padding: 10,
      borderWidth: 1,
      borderColor: c.border,
      gap: 2,
    },
    addrLabel: { fontSize: 10, fontWeight: '700', color: c.textFaint, textTransform: 'uppercase' },
    addrTxt: { fontSize: 12, color: c.textSub, lineHeight: 18 },

    // Items
    itemsBox: {
      backgroundColor: c.bgScreen,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    itemRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
    itemRowBorder: { borderTopWidth: 1, borderTopColor: c.borderLight },
    itemName: { fontSize: 13, color: c.text, fontWeight: '600' },
    itemMeta: { fontSize: 11, color: c.textFaint, marginTop: 1 },
    itemPrice: { fontSize: 13, fontWeight: '700', color: c.textSub },

    // Payment
    summaryBox: {
      backgroundColor: c.bgScreen,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      padding: 12,
      gap: 6,
    },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryLabel: { fontSize: 12, color: c.textMuted },
    summaryVal: { fontSize: 12, fontWeight: '600', color: c.textSub },
    summaryTotalRow: {
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: 8,
      marginTop: 2,
    },
    summaryTotalLabel: { fontSize: 14, fontWeight: '700', color: c.text },
    summaryTotalAmt: { fontSize: 16, fontWeight: '800', color: c.primary },

    // Tracking (fixed blue — represents a shipping status)
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
      borderTopColor: c.borderLight,
    },
    declineFooterBtn: {
      paddingHorizontal: 16,
      paddingVertical: 13,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: c.borderMid,
      alignItems: 'center',
      justifyContent: 'center',
    },
    declineFooterTxt: { fontSize: 13, fontWeight: '600', color: c.textMuted },
    primaryFooterBtn: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 12,
      alignItems: 'center',
    },
    primaryFooterDisabled: { opacity: 0.6 },
    primaryFooterTxt: { fontSize: 14, fontWeight: '700' },
  });
}
