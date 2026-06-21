import { useState, useEffect } from 'react';
import {
  Modal, View, Text, Pressable, StyleSheet,
  FlatList, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { listOrders } from '@/services/order-api';
import { useLanguage } from '@/context/language-context';
import { useAppColors, type AppColors } from '@/hooks/use-app-colors';

type TxType = 'credit' | 'debit' | 'commission';
type Filter = 'all' | TxType;

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: TxType;
  reference: string;
}

interface Props {
  visible: boolean;
  sellerId: string;
  storeName: string;
  onClose: () => void;
}

export function TransactionHistoryModal({ visible, sellerId, storeName, onClose }: Props) {
  const { t } = useLanguage();
  const c = useAppColors();
  const s = makeStyles(c);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading]           = useState(false);
  const [filter, setFilter]             = useState<Filter>('all');

  const TYPE_CONFIG: Record<TxType, { label: string; color: string; bg: string; sign: string }> = {
    credit:     { label: t('tx_type_credit'),     color: c.primaryText,    bg: c.primaryBgStrong, sign: '+' },
    debit:      { label: t('tx_type_debit'),      color: c.errorTextDark,  bg: c.errorBg,         sign: '-' },
    commission: { label: t('tx_type_commission'), color: c.warningText,    bg: c.warningBg,       sign: '-' },
  };

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all',        label: t('tx_filter_all') },
    { key: 'credit',     label: t('tx_filter_credits') },
    { key: 'debit',      label: t('tx_filter_debits') },
    { key: 'commission', label: t('tx_filter_commission') },
  ];

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    listOrders({ sellerId })
      .then(orders => {
        const txs: Transaction[] = [];
        orders.forEach(order => {
          const sellerItems = order.items.filter(i => i.sellerId === sellerId);
          const orderTotal  = sellerItems.reduce((s, i) => s + i.totalPrice, 0);
          const commission  = Math.round(orderTotal * 0.07);
          const payout      = orderTotal - commission;

          if (order.status === 'delivered') {
            txs.push({
              id:          `pay-${order.id}`,
              date:        order.updatedAt ?? order.createdAt,
              description: `Payout — Order #${order.id.slice(-6).toUpperCase()}`,
              amount:      payout,
              type:        'credit',
              reference:   `TXN${order.id.slice(-8).toUpperCase()}`,
            });
            txs.push({
              id:          `com-${order.id}`,
              date:        order.updatedAt ?? order.createdAt,
              description: `Commission (7%) — Order #${order.id.slice(-6).toUpperCase()}`,
              amount:      commission,
              type:        'commission',
              reference:   `COM${order.id.slice(-8).toUpperCase()}`,
            });
          } else if (order.status === 'cancelled') {
            txs.push({
              id:          `ref-${order.id}`,
              date:        order.updatedAt ?? order.createdAt,
              description: `Refund — Order #${order.id.slice(-6).toUpperCase()} cancelled`,
              amount:      orderTotal,
              type:        'debit',
              reference:   `REF${order.id.slice(-8).toUpperCase()}`,
            });
          }
        });
        txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(txs);
      })
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false));
  }, [visible, sellerId]);

  const filtered = filter === 'all' ? transactions : transactions.filter(tx => tx.type === filter);

  const totalCredit     = transactions.filter(tx => tx.type === 'credit').reduce((s, tx) => s + tx.amount, 0);
  const totalCommission = transactions.filter(tx => tx.type === 'commission').reduce((s, tx) => s + tx.amount, 0);
  const totalDebit      = transactions.filter(tx => tx.type === 'debit').reduce((s, tx) => s + tx.amount, 0);
  const netBalance      = totalCredit - totalDebit - totalCommission;

  function fmt(n: number) {
    return '₹' + n.toLocaleString('en-IN');
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>

        {/* Header */}
        <View style={s.header}>
          <Pressable style={s.closeBtn} onPress={onClose}>
            <View style={s.backChevron} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>{t('tx_title')}</Text>
            <Text style={s.headerSub}>{storeName}</Text>
          </View>
        </View>

        {/* Balance summary */}
        <View style={s.summaryCard}>
          <View style={s.summaryRow}>
            <View style={s.summaryItem}>
              <Text style={s.summaryValue}>{fmt(totalCredit)}</Text>
              <Text style={s.summaryLabel}>{t('tx_total_credited')}</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryItem}>
              <Text style={[s.summaryValue, { color: c.errorText }]}>{fmt(totalCommission + totalDebit)}</Text>
              <Text style={s.summaryLabel}>{t('tx_total_debited')}</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryItem}>
              <Text style={[s.summaryValue, { color: netBalance >= 0 ? c.primaryText : c.errorText }]}>
                {fmt(Math.abs(netBalance))}
              </Text>
              <Text style={s.summaryLabel}>{t('tx_net_balance')}</Text>
            </View>
          </View>
        </View>

        {/* Filter tabs */}
        <View style={s.filterRow}>
          {FILTERS.map(f => (
            <Pressable
              key={f.key}
              style={[s.filterTab, filter === f.key && s.filterTabActive]}
              onPress={() => setFilter(f.key)}>
              <Text style={[s.filterTabTxt, filter === f.key && s.filterTabTxtActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* List */}
        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color="#2d7a47" />
          </View>
        ) : filtered.length === 0 ? (
          <View style={s.center}>
            <Text style={s.emptyIcon}>📊</Text>
            <Text style={s.emptyTitle}>{t('tx_empty_title')}</Text>
            <Text style={s.emptySub}>
              {filter === 'all' ? t('tx_empty_all') : t('tx_empty_filter')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 }}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            renderItem={({ item }) => {
              const cfg = TYPE_CONFIG[item.type];
              return (
                <View style={s.txRow}>
                  <View style={[s.txIconWrap, { backgroundColor: cfg.bg }]}>
                    <Text style={s.txIcon}>
                      {item.type === 'credit' ? '↓' : '↑'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.txDesc} numberOfLines={1}>{item.description}</Text>
                    <Text style={s.txRef}>{item.reference}</Text>
                    <Text style={s.txDate}>
                      {new Date(item.date).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={[s.txAmount, { color: cfg.color }]}>
                      {cfg.sign}{fmt(item.amount)}
                    </Text>
                    <View style={[s.txBadge, { backgroundColor: cfg.bg }]}>
                      <Text style={[s.txBadgeTxt, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bgScreen },

    header: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 16, paddingVertical: 14,
      backgroundColor: c.bg,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    closeBtn: { padding: 6 },
    backChevron: {
      width: 0, height: 0,
      borderTopWidth: 6, borderBottomWidth: 6, borderRightWidth: 10,
      borderStyle: 'solid',
      borderTopColor: 'transparent', borderBottomColor: 'transparent',
      borderRightColor: '#2d7a47',
    },
    headerTitle: { fontSize: 17, fontWeight: '800', color: c.text },
    headerSub:   { fontSize: 11, color: c.textMuted, marginTop: 1 },

    summaryCard: {
      backgroundColor: c.bg, marginHorizontal: 16, marginTop: 16,
      borderRadius: 16, borderWidth: 1, borderColor: c.border,
      overflow: 'hidden',
    },
    summaryRow:     { flexDirection: 'row' },
    summaryItem:    { flex: 1, paddingVertical: 16, alignItems: 'center' },
    summaryDivider: { width: 1, backgroundColor: c.borderLight, marginVertical: 12 },
    summaryValue:   { fontSize: 15, fontWeight: '800', color: c.text, marginBottom: 3 },
    summaryLabel:   { fontSize: 10, color: c.textMuted, fontWeight: '600', textAlign: 'center' },

    filterRow: {
      flexDirection: 'row', gap: 8,
      paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4,
    },
    filterTab: {
      flex: 1, paddingVertical: 7, borderRadius: 99,
      backgroundColor: c.bgSubtle, alignItems: 'center',
    },
    filterTabActive:    { backgroundColor: '#2d7a47' },
    filterTabTxt:       { fontSize: 11, fontWeight: '600', color: c.textMuted },
    filterTabTxtActive: { color: '#fff' },

    center:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    emptyIcon:  { fontSize: 40, marginBottom: 12 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: c.text, marginBottom: 6 },
    emptySub:   { fontSize: 13, color: c.textMuted, textAlign: 'center', lineHeight: 19 },

    txRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: c.bg, borderRadius: 14, padding: 14,
      borderWidth: 1, borderColor: c.borderLight,
    },
    txIconWrap: {
      width: 40, height: 40, borderRadius: 20,
      alignItems: 'center', justifyContent: 'center',
    },
    txIcon:     { fontSize: 16, fontWeight: '800', color: c.textSub },
    txDesc:     { fontSize: 13, fontWeight: '600', color: c.text },
    txRef:      { fontSize: 10, color: c.textFaint, fontFamily: 'monospace', marginTop: 1 },
    txDate:     { fontSize: 11, color: c.textMuted, marginTop: 2 },
    txAmount:   { fontSize: 14, fontWeight: '800' },
    txBadge:    { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
    txBadgeTxt: { fontSize: 10, fontWeight: '700' },
  });
}
