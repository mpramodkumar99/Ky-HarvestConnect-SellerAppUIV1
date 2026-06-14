import { useState } from 'react';
import {
  Modal, View, Text, Pressable, StyleSheet,
  ScrollView, TextInput,
} from 'react-native';
import { useToast } from '@/components/toast-provider';
import type { Store } from '@/context/store-context';

type PromoType = 'percent' | 'flat' | 'free_delivery';

interface Promo {
  id: string;
  type: PromoType;
  value: string;
  minOrder: string;
  validDays: number;
  active: boolean;
  createdAt: string;
}

const TYPE_OPTIONS: { value: PromoType; icon: string; label: string }[] = [
  { value: 'percent',       icon: '🏷️', label: '% Off' },
  { value: 'flat',          icon: '💸', label: 'Flat ₹ Off' },
  { value: 'free_delivery', icon: '🚚', label: 'Free Delivery' },
];

const VALIDITY: { days: number; label: string }[] = [
  { days: 7,  label: '7 days' },
  { days: 14, label: '14 days' },
  { days: 30, label: '1 month' },
];

interface Props {
  visible: boolean;
  store: Store;
  onClose: () => void;
}

export function PromotionsModal({ visible, store, onClose }: Props) {
  const { showToast } = useToast();
  const [promos,    setPromos]    = useState<Promo[]>([]);
  const [creating,  setCreating]  = useState(false);
  const [promoType, setPromoType] = useState<PromoType>('percent');
  const [value,     setValue]     = useState('');
  const [minOrder,  setMinOrder]  = useState('');
  const [validDays, setValidDays] = useState(7);

  function resetForm() {
    setCreating(false);
    setPromoType('percent');
    setValue('');
    setMinOrder('');
    setValidDays(7);
  }

  function handleCreate() {
    if (promoType !== 'free_delivery' && !value.trim()) return;
    setPromos(prev => [{
      id: Date.now().toString(),
      type: promoType,
      value: value.trim(),
      minOrder: minOrder.trim(),
      validDays,
      active: true,
      createdAt: new Date().toISOString(),
    }, ...prev]);
    showToast('Promotion created!', 'success');
    resetForm();
  }

  function togglePromo(id: string) {
    setPromos(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
  }

  function deletePromo(id: string) {
    setPromos(prev => prev.filter(p => p.id !== id));
    showToast('Promotion removed.', 'info');
  }

  function promoLabel(p: Promo): string {
    if (p.type === 'percent')       return `${p.value}% Off`;
    if (p.type === 'flat')          return `₹${p.value} Off`;
    return 'Free Delivery';
  }

  const canCreate = promoType === 'free_delivery' || value.trim().length > 0;

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
            <View>
              <Text style={s.headTitle}>Promotions & Offers</Text>
              <Text style={s.headSub}>{store.name}</Text>
            </View>
            <Pressable style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeTxt}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {creating ? (
              <View style={s.formCard}>
                <Text style={s.formTitle}>New Promotion</Text>

                <Text style={s.label}>Promotion Type</Text>
                <View style={s.typeRow}>
                  {TYPE_OPTIONS.map((t) => (
                    <Pressable
                      key={t.value}
                      style={[s.typeChip, promoType === t.value && s.typeChipActive]}
                      onPress={() => { setPromoType(t.value); setValue(''); }}>
                      <Text style={{ fontSize: 18 }}>{t.icon}</Text>
                      <Text style={[s.typeLabel, promoType === t.value && s.typeLabelActive]}>
                        {t.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {promoType !== 'free_delivery' && (
                  <View style={s.field}>
                    <Text style={s.label}>
                      {promoType === 'percent' ? 'Discount Percentage *' : 'Discount Amount *'}
                    </Text>
                    <View style={s.inputRow}>
                      <View style={s.inputPrefix}>
                        <Text style={s.inputPrefixTxt}>{promoType === 'percent' ? '%' : '₹'}</Text>
                      </View>
                      <TextInput
                        style={[s.input, { flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeftWidth: 0 }]}
                        value={value}
                        onChangeText={setValue}
                        placeholder={promoType === 'percent' ? 'e.g. 10' : 'e.g. 50'}
                        placeholderTextColor="#9ca3af"
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>
                )}

                <View style={s.field}>
                  <Text style={s.label}>Min. Order Amount (optional)</Text>
                  <View style={s.inputRow}>
                    <View style={s.inputPrefix}>
                      <Text style={s.inputPrefixTxt}>₹</Text>
                    </View>
                    <TextInput
                      style={[s.input, { flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeftWidth: 0 }]}
                      value={minOrder}
                      onChangeText={setMinOrder}
                      placeholder="e.g. 200"
                      placeholderTextColor="#9ca3af"
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                <View style={s.field}>
                  <Text style={s.label}>Valid For</Text>
                  <View style={s.validRow}>
                    {VALIDITY.map((v) => (
                      <Pressable
                        key={v.days}
                        style={[s.validChip, validDays === v.days && s.validChipActive]}
                        onPress={() => setValidDays(v.days)}>
                        <Text style={[s.validLabel, validDays === v.days && s.validLabelActive]}>
                          {v.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={s.formFooter}>
                  <Pressable style={s.cancelBtn} onPress={resetForm}>
                    <Text style={s.cancelTxt}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[s.createBtn, !canCreate && s.createBtnDisabled]}
                    onPress={handleCreate}
                    disabled={!canCreate}>
                    <Text style={s.createBtnTxt}>Create</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <>
                <Pressable style={s.newPromoBtn} onPress={() => setCreating(true)}>
                  <Text style={s.newPromoIcon}>＋</Text>
                  <View>
                    <Text style={s.newPromoTxt}>Create New Promotion</Text>
                    <Text style={s.newPromoSub}>Discounts, free delivery, and more</Text>
                  </View>
                </Pressable>

                {promos.length === 0 ? (
                  <View style={s.emptyState}>
                    <Text style={{ fontSize: 48, marginBottom: 12 }}>🎁</Text>
                    <Text style={s.emptyTitle}>No active promotions</Text>
                    <Text style={s.emptySub}>
                      Create a discount or offer to attract more buyers and boost your sales.
                    </Text>
                  </View>
                ) : (
                  <View style={s.promoList}>
                    {promos.map((promo) => (
                      <View key={promo.id} style={[s.promoCard, !promo.active && s.promoCardPaused]}>
                        <View style={s.promoLeft}>
                          <Text style={s.promoValue}>{promoLabel(promo)}</Text>
                          {promo.minOrder ? (
                            <Text style={s.promoDet}>Min. order ₹{promo.minOrder}</Text>
                          ) : null}
                          <Text style={s.promoDet}>
                            Valid {promo.validDays} days ·{' '}
                            <Text style={{ color: promo.active ? '#2d7a47' : '#9ca3af' }}>
                              {promo.active ? 'Active' : 'Paused'}
                            </Text>
                          </Text>
                        </View>
                        <View style={s.promoActions}>
                          <Pressable style={s.promoBtn} onPress={() => togglePromo(promo.id)}>
                            <Text style={s.promoBtnTxt}>{promo.active ? 'Pause' : 'Resume'}</Text>
                          </Pressable>
                          <Pressable style={[s.promoBtn, s.promoDeleteBtn]} onPress={() => deletePromo(promo.id)}>
                            <Text style={[s.promoBtnTxt, { color: '#dc2626' }]}>Delete</Text>
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                <View style={s.syncNote}>
                  <Text style={{ fontSize: 14 }}>ℹ️</Text>
                  <Text style={s.syncNoteTxt}>
                    Promotions are session-only for now. Persistent management will be available once the promotions service is live.
                  </Text>
                </View>
              </>
            )}

          </ScrollView>
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
    maxHeight: '92%',
  },

  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  headSub: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  closeBtn: {
    width: 32, height: 32,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  closeTxt: { fontSize: 13, color: '#374151', fontWeight: '700' },

  body: { padding: 16 },

  // Create form
  formCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },
  formTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  field: { marginBottom: 16 },

  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  typeChip: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  typeChipActive: { borderColor: '#2d7a47', backgroundColor: '#f0fdf4' },
  typeLabel: { fontSize: 11, fontWeight: '600', color: '#6b7280' },
  typeLabelActive: { color: '#166534' },

  inputRow: { flexDirection: 'row' },
  inputPrefix: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRightWidth: 0,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  inputPrefixTxt: { fontSize: 14, fontWeight: '700', color: '#374151' },
  input: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
  },

  validRow: { flexDirection: 'row', gap: 8 },
  validChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  validChipActive: { borderColor: '#2d7a47', backgroundColor: '#f0fdf4' },
  validLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  validLabelActive: { color: '#166534' },

  formFooter: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cancelTxt: { fontSize: 13, fontWeight: '600', color: '#374151' },
  createBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2d7a47',
    alignItems: 'center',
  },
  createBtnDisabled: { opacity: 0.4 },
  createBtnTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // New promo button
  newPromoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#f0fdf4',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#86efac',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  newPromoIcon: { fontSize: 26, color: '#2d7a47' },
  newPromoTxt: { fontSize: 14, fontWeight: '700', color: '#2d7a47' },
  newPromoSub: { fontSize: 11, color: '#4ade80', marginTop: 1 },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 8 },
  emptySub: { fontSize: 12, color: '#9ca3af', textAlign: 'center', lineHeight: 18, paddingHorizontal: 24 },

  // Promo list
  promoList: { gap: 10, marginBottom: 16 },
  promoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  promoCardPaused: { opacity: 0.55 },
  promoLeft: { flex: 1, gap: 3 },
  promoValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
  promoDet: { fontSize: 11, color: '#6b7280' },
  promoActions: { gap: 6 },
  promoBtn: {
    borderRadius: 7,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  promoDeleteBtn: { borderColor: '#fca5a5' },
  promoBtnTxt: { fontSize: 11, fontWeight: '600', color: '#374151' },

  syncNote: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  syncNoteTxt: { flex: 1, fontSize: 11, color: '#6b7280', lineHeight: 16 },
});
