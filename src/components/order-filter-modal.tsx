import {
  Modal, View, Text, Pressable, StyleSheet,
} from 'react-native';
import type { PaymentMethod } from '@/services/order-api';

export interface OrderFilters {
  paymentMethod: PaymentMethod | null;
}

const PAYMENT_OPTIONS: { value: PaymentMethod | null; label: string; icon: string }[] = [
  { value: null,     label: 'All',    icon: '🗂️' },
  { value: 'upi',    label: 'UPI',    icon: '📱' },
  { value: 'cod',    label: 'COD',    icon: '💵' },
  { value: 'card',   label: 'Card',   icon: '💳' },
  { value: 'wallet', label: 'Wallet', icon: '👛' },
];

interface Props {
  visible: boolean;
  filters: OrderFilters;
  onClose: () => void;
  onApply: (filters: OrderFilters) => void;
}

export function OrderFilterModal({ visible, filters, onClose, onApply }: Props) {
  function handleSelect(method: PaymentMethod | null) {
    onApply({ ...filters, paymentMethod: method });
  }

  function handleClear() {
    onApply({ paymentMethod: null });
  }

  const hasActive = filters.paymentMethod !== null;

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

          <View style={s.head}>
            <Text style={s.headTitle}>Filter Orders</Text>
            <Pressable style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeTxt}>✕</Text>
            </Pressable>
          </View>

          <View style={s.body}>
            <Text style={s.groupLabel}>PAYMENT METHOD</Text>
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
              <Text style={[s.clearTxt, !hasActive && s.clearTxtDisabled]}>Clear filters</Text>
            </Pressable>
            <Pressable style={s.doneBtn} onPress={onClose}>
              <Text style={s.doneTxt}>Done</Text>
            </Pressable>
          </View>

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
    overflow: 'hidden',
  },

  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  closeBtn: {
    width: 32, height: 32,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTxt: { fontSize: 13, color: '#374151', fontWeight: '700' },

  body: { padding: 20, gap: 12 },
  groupLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9ca3af',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  optionChipActive: {
    borderColor: '#2d7a47',
    backgroundColor: '#f0fdf4',
  },
  optionLabel: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  optionLabelActive: { color: '#166534' },

  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  clearBtn: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnDisabled: { borderColor: '#e5e7eb' },
  clearTxt: { fontSize: 13, fontWeight: '600', color: '#374151' },
  clearTxtDisabled: { color: '#d1d5db' },
  doneBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#2d7a47',
    alignItems: 'center',
  },
  doneTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
