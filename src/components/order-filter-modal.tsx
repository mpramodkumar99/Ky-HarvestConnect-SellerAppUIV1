import {
  Modal, View, Text, Pressable, StyleSheet,
} from 'react-native';
import type { PaymentMethod } from '@/services/order-api';
import { useLanguage } from '@/context/language-context';
import { useAppColors, type AppColors } from '@/hooks/use-app-colors';

export type DateRange = 'today' | 'week' | 'month' | null;

export interface OrderFilters {
  paymentMethod: PaymentMethod | null;
  dateRange:     DateRange;
}

interface Props {
  visible: boolean;
  filters: OrderFilters;
  onClose: () => void;
  onApply: (filters: OrderFilters) => void;
}

export function OrderFilterModal({ visible, filters, onClose, onApply }: Props) {
  const { t } = useLanguage();
  const c = useAppColors();
  const s = makeStyles(c);

  const PAYMENT_OPTIONS: { value: PaymentMethod | null; label: string; icon: string }[] = [
    { value: null,     label: t('filter_all'),    icon: '🗂️' },
    { value: 'upi',    label: t('filter_upi'),    icon: '📱' },
    { value: 'cod',    label: t('filter_cod'),    icon: '💵' },
    { value: 'card',   label: t('filter_card'),   icon: '💳' },
    { value: 'wallet', label: t('filter_wallet'), icon: '👛' },
  ];

  const DATE_OPTIONS: { value: DateRange; label: string; icon: string }[] = [
    { value: null,    label: 'All time',    icon: '🗂️' },
    { value: 'today', label: 'Today',       icon: '📅' },
    { value: 'week',  label: 'This week',   icon: '🗓️' },
    { value: 'month', label: 'This month',  icon: '📆' },
  ];

  function handleSelect(method: PaymentMethod | null) {
    onApply({ ...filters, paymentMethod: method });
  }

  function handleDateSelect(range: DateRange) {
    onApply({ ...filters, dateRange: range });
  }

  function handleClear() {
    onApply({ paymentMethod: null, dateRange: null });
  }

  const hasActive = filters.paymentMethod !== null || filters.dateRange !== null;

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={s.container}>
        <Pressable style={[StyleSheet.absoluteFill, s.backdrop]} onPress={onClose} />
        <View style={s.sheet}>

          <View style={s.head}>
            <Text style={s.headTitle}>{t('filter_orders_title')}</Text>
            <Pressable style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeTxt}>✕</Text>
            </Pressable>
          </View>

          <View style={s.body}>
            <Text style={s.groupLabel}>DATE RANGE</Text>
            <View style={s.optionGrid}>
              {DATE_OPTIONS.map((opt) => {
                const active = filters.dateRange === opt.value;
                return (
                  <Pressable
                    key={String(opt.value)}
                    style={[s.optionChip, active && s.optionChipActive]}
                    onPress={() => handleDateSelect(opt.value)}>
                    <Text style={{ fontSize: 18 }}>{opt.icon}</Text>
                    <Text style={[s.optionLabel, active && s.optionLabelActive]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[s.groupLabel, { marginTop: 16 }]}>{t('filter_payment_label')}</Text>
            <View style={s.optionGrid}>
              {PAYMENT_OPTIONS.map((opt) => {
                const active = filters.paymentMethod === opt.value;
                return (
                  <Pressable
                    key={String(opt.value)}
                    style={[s.optionChip, active && s.optionChipActive]}
                    onPress={() => handleSelect(opt.value)}>
                    <Text style={{ fontSize: 18 }}>{opt.icon}</Text>
                    <Text style={[s.optionLabel, active && s.optionLabelActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={s.footer}>
            <Pressable
              style={[s.clearBtn, !hasActive && s.clearBtnDisabled]}
              onPress={handleClear}
              disabled={!hasActive}>
              <Text style={[s.clearTxt, !hasActive && s.clearTxtDisabled]}>{t('filter_clear')}</Text>
            </Pressable>
            <Pressable style={s.doneBtn} onPress={onClose}>
              <Text style={s.doneTxt}>{t('filter_done')}</Text>
            </Pressable>
          </View>

        </View>
      </View>
    </Modal>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { backgroundColor: 'rgba(0,0,0,0.55)' },
    sheet: { backgroundColor: c.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },

    head: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14,
      borderBottomWidth: 1, borderBottomColor: c.borderLight,
    },
    headTitle: { fontSize: 17, fontWeight: '700', color: c.text },
    closeBtn: {
      width: 32, height: 32, backgroundColor: c.bgSubtle,
      borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    },
    closeTxt: { fontSize: 13, color: c.textSub, fontWeight: '700' },

    body: { padding: 20, gap: 12 },
    groupLabel: { fontSize: 10, fontWeight: '700', color: c.textFaint, letterSpacing: 0.6, textTransform: 'uppercase' },
    optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    optionChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 14, paddingVertical: 10,
      borderRadius: 10, borderWidth: 1.5,
      borderColor: c.border, backgroundColor: c.bgScreen,
    },
    optionChipActive: { borderColor: c.primary, backgroundColor: c.primaryBg },
    optionLabel: { fontSize: 13, fontWeight: '600', color: c.textMuted },
    optionLabelActive: { color: c.primaryText },

    footer: {
      flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 28,
      borderTopWidth: 1, borderTopColor: c.borderLight,
    },
    clearBtn: {
      paddingHorizontal: 16, paddingVertical: 13,
      borderRadius: 12, borderWidth: 1.5, borderColor: c.borderMid,
      alignItems: 'center', justifyContent: 'center',
    },
    clearBtnDisabled: { borderColor: c.border },
    clearTxt: { fontSize: 13, fontWeight: '600', color: c.textSub },
    clearTxtDisabled: { color: c.borderMid },
    doneBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#2d7a47', alignItems: 'center' },
    doneTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  });
}
