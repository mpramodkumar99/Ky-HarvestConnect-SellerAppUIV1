import { useState, useEffect, useCallback } from 'react';
import {
  Modal, View, Text, Pressable, StyleSheet,
  ScrollView, TextInput, ActivityIndicator,
} from 'react-native';
import { useToast } from '@/components/toast-provider';
import { useLanguage } from '@/context/language-context';
import type { Store } from '@/context/store-context';
import { useAppColors, type AppColors } from '@/hooks/use-app-colors';
import {
  listPromotions, createPromotion, togglePromotion, deletePromotion,
  type Promotion, type PromoType,
} from '@/services/catalog-api';

interface Props {
  visible: boolean;
  store: Store;
  onClose: () => void;
}

export function PromotionsModal({ visible, store, onClose }: Props) {
  const { showToast } = useToast();
  const { t } = useLanguage();
  const c = useAppColors();
  const s = makeStyles(c);

  const [promos,    setPromos]    = useState<Promotion[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [creating,  setCreating]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [promoType, setPromoType] = useState<PromoType>('percent');
  const [value,     setValue]     = useState('');
  const [minOrder,  setMinOrder]  = useState('');
  const [validDays, setValidDays] = useState(7);

  const TYPE_OPTIONS: { value: PromoType; icon: string; label: string }[] = [
    { value: 'percent',       icon: '🏷️', label: t('promo_type_percent') },
    { value: 'flat',          icon: '💸', label: t('promo_type_flat') },
    { value: 'free_delivery', icon: '🚚', label: t('promo_type_free_del') },
  ];

  const VALIDITY: { days: number; label: string }[] = [
    { days: 7,  label: `7 ${t('promo_days')}` },
    { days: 14, label: `14 ${t('promo_days')}` },
    { days: 30, label: t('promo_1_month') },
  ];

  const load = useCallback(async () => {
    if (!store.id) return;
    setLoading(true);
    try {
      const data = await listPromotions(store.id);
      setPromos(data);
    } catch {
      showToast('Failed to load promotions', 'error');
    } finally {
      setLoading(false);
    }
  }, [store.id]);

  useEffect(() => { if (visible) load(); }, [visible, load]);

  function resetForm() {
    setCreating(false);
    setPromoType('percent');
    setValue('');
    setMinOrder('');
    setValidDays(7);
  }

  async function handleCreate() {
    if (promoType !== 'free_delivery' && !value.trim()) return;
    setSaving(true);
    try {
      const numValue   = promoType === 'flat'
        ? Math.round(parseFloat(value || '0') * 100)  // rupees → paise
        : parseInt(value || '0', 10);                  // percent stays as-is
      const numMinOrder = minOrder.trim()
        ? Math.round(parseFloat(minOrder) * 100)        // rupees → paise
        : 0;
      const promo = await createPromotion({
        sellerId: store.id, type: promoType,
        value: numValue, minOrder: numMinOrder, validDays,
      });
      setPromos(prev => [promo, ...prev]);
      showToast(t('promo_created_toast'), 'success');
      resetForm();
    } catch {
      showToast('Failed to create promotion', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id: string, currentlyActive: boolean) {
    try {
      const updated = await togglePromotion(id, !currentlyActive);
      setPromos(prev => prev.map(p => p.id === id ? updated : p));
    } catch {
      showToast('Failed to update promotion', 'error');
    }
  }

  async function handleDelete(id: string) {
    try {
      await deletePromotion(id);
      setPromos(prev => prev.filter(p => p.id !== id));
      showToast(t('promo_removed_toast'), 'info');
    } catch {
      showToast('Failed to delete promotion', 'error');
    }
  }

  function promoLabel(p: Promotion): string {
    if (p.type === 'percent') return `${p.value}% ${t('promo_off')}`;
    if (p.type === 'flat')    return `₹${(p.value / 100).toLocaleString('en-IN')} ${t('promo_off')}`;
    return t('promo_type_free_del');
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
              <Text style={s.headTitle}>{t('promo_title')}</Text>
              <Text style={s.headSub}>{store.name}</Text>
            </View>
            <Pressable style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeTxt}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {creating ? (
              <View style={s.formCard}>
                <Text style={s.formTitle}>{t('promo_new_form_title')}</Text>

                <Text style={s.label}>{t('promo_type_label')}</Text>
                <View style={s.typeRow}>
                  {TYPE_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.value}
                      style={[s.typeChip, promoType === opt.value && s.typeChipActive]}
                      onPress={() => { setPromoType(opt.value); setValue(''); }}>
                      <Text style={{ fontSize: 18 }}>{opt.icon}</Text>
                      <Text style={[s.typeLabel, promoType === opt.value && s.typeLabelActive]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {promoType !== 'free_delivery' && (
                  <View style={s.field}>
                    <Text style={s.label}>
                      {promoType === 'percent' ? t('promo_disc_pct') : t('promo_disc_flat')}
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
                        placeholderTextColor={c.textFaint}
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>
                )}

                <View style={s.field}>
                  <Text style={s.label}>{t('promo_min_order')}</Text>
                  <View style={s.inputRow}>
                    <View style={s.inputPrefix}>
                      <Text style={s.inputPrefixTxt}>₹</Text>
                    </View>
                    <TextInput
                      style={[s.input, { flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeftWidth: 0 }]}
                      value={minOrder}
                      onChangeText={setMinOrder}
                      placeholder="e.g. 200"
                      placeholderTextColor={c.textFaint}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                <View style={s.field}>
                  <Text style={s.label}>{t('promo_valid_for')}</Text>
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
                    <Text style={s.cancelTxt}>{t('decline_cancel')}</Text>
                  </Pressable>
                  <Pressable
                    style={[s.createBtn, (!canCreate || saving) && s.createBtnDisabled]}
                    onPress={handleCreate}
                    disabled={!canCreate || saving}>
                    {saving
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={s.createBtnTxt}>{t('promo_create')}</Text>
                    }
                  </Pressable>
                </View>
              </View>
            ) : (
              <>
                <Pressable style={s.newPromoBtn} onPress={() => setCreating(true)}>
                  <Text style={s.newPromoIcon}>＋</Text>
                  <View>
                    <Text style={s.newPromoTxt}>{t('promo_new_btn')}</Text>
                    <Text style={s.newPromoSub}>{t('promo_new_sub')}</Text>
                  </View>
                </Pressable>

                {loading ? (
                  <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                    <ActivityIndicator size="large" color="#2d7a47" />
                  </View>
                ) : promos.length === 0 ? (
                  <View style={s.emptyState}>
                    <Text style={{ fontSize: 48, marginBottom: 12 }}>🎁</Text>
                    <Text style={s.emptyTitle}>{t('promo_empty_title')}</Text>
                    <Text style={s.emptySub}>{t('promo_empty_sub')}</Text>
                  </View>
                ) : (
                  <View style={s.promoList}>
                    {promos.map((promo) => (
                      <View key={promo.id} style={[s.promoCard, !promo.active && s.promoCardPaused]}>
                        <View style={s.promoLeft}>
                          <Text style={s.promoValue}>{promoLabel(promo)}</Text>
                          {promo.minOrder > 0 ? (
                            <Text style={s.promoDet}>
                              {t('promo_min_order_label')}₹{(promo.minOrder / 100).toLocaleString('en-IN')}
                            </Text>
                          ) : null}
                          <Text style={s.promoDet}>
                            {t('promo_valid_pre')} {promo.validDays} {t('promo_days')} ·{' '}
                            <Text style={{ color: promo.active ? '#2d7a47' : c.textFaint }}>
                              {promo.active ? t('promo_active') : t('promo_paused')}
                            </Text>
                          </Text>
                        </View>
                        <View style={s.promoActions}>
                          <Pressable style={s.promoBtn} onPress={() => handleToggle(promo.id, promo.active)}>
                            <Text style={s.promoBtnTxt}>{promo.active ? t('promo_pause') : t('promo_resume')}</Text>
                          </Pressable>
                          <Pressable style={[s.promoBtn, s.promoDeleteBtn]} onPress={() => handleDelete(promo.id)}>
                            <Text style={[s.promoBtnTxt, { color: '#dc2626' }]}>{t('promo_delete')}</Text>
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}

          </ScrollView>
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
      borderBottomColor: c.borderLight,
    },
    headTitle: { fontSize: 17, fontWeight: '700', color: c.text },
    headSub: { fontSize: 11, color: c.textMuted, marginTop: 2 },
    closeBtn: {
      width: 32, height: 32,
      backgroundColor: c.bgSubtle,
      borderRadius: 16,
      alignItems: 'center', justifyContent: 'center',
    },
    closeTxt: { fontSize: 13, color: c.textSub, fontWeight: '700' },

    body: { padding: 16 },

    formCard: {
      backgroundColor: c.bgScreen,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 16,
    },
    formTitle: { fontSize: 15, fontWeight: '700', color: c.text, marginBottom: 16 },
    label: { fontSize: 12, fontWeight: '600', color: c.textSub, marginBottom: 6 },
    field: { marginBottom: 16 },

    typeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    typeChip: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.bg,
    },
    typeChipActive: { borderColor: '#2d7a47', backgroundColor: c.primaryBg },
    typeLabel: { fontSize: 11, fontWeight: '600', color: c.textMuted },
    typeLabelActive: { color: c.primaryText },

    inputRow: { flexDirection: 'row' },
    inputPrefix: {
      borderWidth: 1.5,
      borderColor: c.border,
      borderRightWidth: 0,
      borderTopLeftRadius: 10,
      borderBottomLeftRadius: 10,
      backgroundColor: c.bgSubtle,
      paddingHorizontal: 12,
      justifyContent: 'center',
    },
    inputPrefixTxt: { fontSize: 14, fontWeight: '700', color: c.textSub },
    input: {
      borderWidth: 1.5,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: 14,
      color: c.text,
      backgroundColor: c.bg,
    },

    validRow: { flexDirection: 'row', gap: 8 },
    validChip: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: c.border,
      alignItems: 'center',
      backgroundColor: c.bg,
    },
    validChipActive: { borderColor: '#2d7a47', backgroundColor: c.primaryBg },
    validLabel: { fontSize: 12, fontWeight: '600', color: c.textMuted },
    validLabelActive: { color: c.primaryText },

    formFooter: { flexDirection: 'row', gap: 10, marginTop: 4 },
    cancelBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: c.borderMid,
      alignItems: 'center',
    },
    cancelTxt: { fontSize: 13, fontWeight: '600', color: c.textSub },
    createBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: '#2d7a47',
      alignItems: 'center',
    },
    createBtnDisabled: { opacity: 0.4 },
    createBtnTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },

    newPromoBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: c.primaryBg,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1.5,
      borderColor: c.primaryBorder,
      borderStyle: 'dashed',
      marginBottom: 16,
    },
    newPromoIcon: { fontSize: 26, color: '#2d7a47' },
    newPromoTxt: { fontSize: 14, fontWeight: '700', color: '#2d7a47' },
    newPromoSub: { fontSize: 11, color: c.primaryLight, marginTop: 1 },

    emptyState: { alignItems: 'center', paddingVertical: 32 },
    emptyTitle: { fontSize: 15, fontWeight: '700', color: c.textSub, marginBottom: 8 },
    emptySub: { fontSize: 12, color: c.textFaint, textAlign: 'center', lineHeight: 18, paddingHorizontal: 24 },

    promoList: { gap: 10, marginBottom: 16 },
    promoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.bg,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
    },
    promoCardPaused: { opacity: 0.55 },
    promoLeft: { flex: 1, gap: 3 },
    promoValue: { fontSize: 16, fontWeight: '700', color: c.text },
    promoDet: { fontSize: 11, color: c.textMuted },
    promoActions: { gap: 6 },
    promoBtn: {
      borderRadius: 7,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
    },
    promoDeleteBtn: { borderColor: '#fca5a5' },
    promoBtnTxt: { fontSize: 11, fontWeight: '600', color: c.textSub },
  });
}
