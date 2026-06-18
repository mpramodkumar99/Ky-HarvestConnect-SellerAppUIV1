import { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, StyleSheet, ScrollView,
} from 'react-native';
import { updateSeller } from '@/services/user-api';
import { SELLER_TYPE_CONFIG, useStore } from '@/context/store-context';
import { useLanguage } from '@/context/language-context';
import { useAppColors, type AppColors } from '@/hooks/use-app-colors';
import type { Store } from '@/context/store-context';
import type { SellerType, BusinessType } from '@/services/user-api';

const TYPE_OPTIONS: SellerType[] = ['farmer', 'artisan', 'dairy', 'homefood', 'trades', 'kirana'];

interface Props {
  visible: boolean;
  store: Store;
  onClose: () => void;
  onUpdated: () => void;
}

export function EditStoreModal({ visible, store, onClose, onUpdated }: Props) {
  const { updateStoreStatus } = useStore();
  const { t } = useLanguage();
  const c = useAppColors();
  const s = makeStyles(c);
  const [name,         setName]         = useState('');
  const [description,  setDescription]  = useState('');
  const [location,     setLocation]     = useState('');
  const [address,      setAddress]      = useState('');
  const [type,         setType]         = useState<SellerType>('farmer');
  const [businessType, setBusinessType] = useState<BusinessType>('retail');
  const [status,       setStatus]       = useState<'live' | 'offline'>('live');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');

  useEffect(() => {
    if (visible) {
      setName(store.name);
      setDescription(store.description ?? '');
      setLocation(store.location);
      setAddress(store.address ?? '');
      setType(store.type);
      setBusinessType(store.businessType ?? 'retail');
      setStatus(store.status);
      setError('');
    }
  }, [visible, store]);

  const canSave = name.trim().length > 0 && !loading;

  async function handleSave() {
    if (!canSave) return;
    setLoading(true);
    setError('');
    try {
      await updateSeller(store.id, {
        name:        name.trim(),
        description: description.trim() || undefined,
        location:    location.trim() || undefined,
        address:     address.trim() || undefined,
        type,
        ...(type === 'kirana' ? { businessType } : {}),
      });
      updateStoreStatus(store.id, status);
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setLoading(false);
    }
  }

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
            <Text style={s.headTitle}>{t('edit_store_title')}</Text>
            <Pressable style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeTxt}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            <View style={s.field}>
              <Text style={s.label}>{t('edit_store_name')} *</Text>
              <TextInput
                style={s.input}
                value={name}
                onChangeText={setName}
                placeholder={t('edit_store_name_ph')}
                placeholderTextColor={c.textFaint}
                editable={!loading}
                autoCapitalize="words"
              />
            </View>

            <View style={s.field}>
              <Text style={s.label}>{t('edit_store_desc')}</Text>
              <TextInput
                style={[s.input, s.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder={t('edit_store_desc_ph')}
                placeholderTextColor={c.textFaint}
                multiline
                numberOfLines={4}
                editable={!loading}
                textAlignVertical="top"
              />
            </View>

            <View style={s.field}>
              <Text style={s.label}>{t('edit_store_location')}</Text>
              <TextInput
                style={s.input}
                value={location}
                onChangeText={setLocation}
                placeholder={t('edit_store_location_ph')}
                placeholderTextColor={c.textFaint}
                editable={!loading}
              />
            </View>

            <View style={s.field}>
              <Text style={s.label}>{t('edit_store_address')}</Text>
              <TextInput
                style={[s.input, s.textArea]}
                value={address}
                onChangeText={setAddress}
                placeholder={t('edit_store_address_ph')}
                placeholderTextColor={c.textFaint}
                multiline
                numberOfLines={3}
                editable={!loading}
                textAlignVertical="top"
              />
            </View>

            <View style={[s.field, { marginBottom: type === 'kirana' ? 12 : 8 }]}>
              <Text style={s.label}>{t('edit_store_type')}</Text>
              <View style={s.typeGrid}>
                {TYPE_OPTIONS.map((sType) => {
                  const tc = SELLER_TYPE_CONFIG[sType];
                  const active = type === sType;
                  return (
                    <Pressable
                      key={sType}
                      style={[s.typeChip, active && s.typeChipActive]}
                      onPress={() => setType(sType)}
                      disabled={loading}>
                      <Text style={{ fontSize: 20 }}>{tc.icon}</Text>
                      <Text style={[s.typeLabel, active && s.typeLabelActive]}>{tc.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {type === 'kirana' && (
              <View style={s.field}>
                <Text style={s.label}>{t('create_store_business_model')} *</Text>
                <View style={s.bizModelRow}>
                  {(['retail', 'wholesale'] as BusinessType[]).map(bt => {
                    const active = businessType === bt;
                    return (
                      <Pressable
                        key={bt}
                        style={[s.bizBtn, active && s.bizBtnActive]}
                        onPress={() => setBusinessType(bt)}
                        disabled={loading}>
                        <Text style={s.bizIcon}>{bt === 'retail' ? '🛍️' : '📦'}</Text>
                        <Text style={[s.bizLabel, active && s.bizLabelActive]}>
                          {bt === 'retail' ? t('create_store_retail') : t('create_store_wholesale')}
                        </Text>
                        <Text style={[s.bizSub, active && s.bizSubActive]}>
                          {bt === 'retail' ? t('create_store_retail_sub') : t('create_store_wholesale_sub')}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={s.field}>
              <Text style={s.label}>{t('edit_store_status')}</Text>
              <View style={s.statusRow}>
                <Pressable
                  style={[s.statusBtn, status === 'live' && s.statusBtnLive]}
                  onPress={() => setStatus('live')}
                  disabled={loading}>
                  <Text style={{ fontSize: 22 }}>🟢</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.statusLabel, status === 'live' && s.statusLabelLive]}>{t('profile_store_live')}</Text>
                    <Text style={s.statusDesc}>{t('edit_store_live_desc')}</Text>
                  </View>
                  {status === 'live' && <Text style={s.statusCheck}>✓</Text>}
                </Pressable>
                <Pressable
                  style={[s.statusBtn, status === 'offline' && s.statusBtnOffline]}
                  onPress={() => setStatus('offline')}
                  disabled={loading}>
                  <Text style={{ fontSize: 22 }}>⚫</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.statusLabel, status === 'offline' && s.statusLabelOffline]}>{t('profile_store_offline')}</Text>
                    <Text style={s.statusDesc}>{t('edit_store_offline_desc')}</Text>
                  </View>
                  {status === 'offline' && <Text style={[s.statusCheck, { color: c.textMuted }]}>✓</Text>}
                </Pressable>
              </View>
            </View>

            {error ? (
              <View style={s.errorBox}>
                <Text style={s.errorTxt}>{error}</Text>
              </View>
            ) : null}

          </ScrollView>

          <View style={s.footer}>
            <Pressable style={s.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={s.cancelTxt}>{t('decline_cancel')}</Text>
            </Pressable>
            <Pressable
              style={[s.saveBtn, !canSave && s.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!canSave}>
              <Text style={s.saveTxt}>{loading ? t('edit_store_saving') : t('edit_store_save')}</Text>
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
    sheet: {
      backgroundColor: c.bg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      overflow: 'hidden',
      maxHeight: '90%',
    },

    head: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.borderLight,
    },
    headTitle: { fontSize: 17, fontWeight: '700', color: c.text },
    closeBtn: {
      width: 32, height: 32,
      backgroundColor: c.bgSubtle,
      borderRadius: 16,
      alignItems: 'center', justifyContent: 'center',
    },
    closeTxt: { fontSize: 13, color: c.textSub, fontWeight: '700' },

    body: { padding: 20 },

    field: { marginBottom: 18 },
    label: { fontSize: 12, fontWeight: '600', color: c.textSub, marginBottom: 6 },
    input: {
      borderWidth: 1.5,
      borderColor: c.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      color: c.text,
      backgroundColor: c.bgScreen,
    },
    textArea: { height: 100, paddingTop: 12 },

    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    typeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.bgScreen,
    },
    typeChipActive: { borderColor: '#2d7a47', backgroundColor: c.primaryBg },
    typeLabel: { fontSize: 12, fontWeight: '600', color: c.textMuted },
    typeLabelActive: { color: c.primaryText },

    bizModelRow: { flexDirection: 'row', gap: 10 },
    bizBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.bgScreen,
      gap: 3,
    },
    bizBtnActive: { borderColor: '#2d7a47', backgroundColor: '#2d7a47' },
    bizIcon:       { fontSize: 24 },
    bizLabel:      { fontSize: 13, fontWeight: '700', color: c.textSub, textAlign: 'center' },
    bizLabelActive: { color: '#fff' },
    bizSub:        { fontSize: 10, color: c.textFaint, textAlign: 'center' },
    bizSubActive:  { color: 'rgba(255,255,255,0.75)' },

    statusRow: { flexDirection: 'row', gap: 10 },
    statusBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.bgScreen,
    },
    statusBtnLive:    { borderColor: '#2d7a47', backgroundColor: c.primaryBg },
    statusBtnOffline: { borderColor: c.textMuted, backgroundColor: c.bgScreen },
    statusLabel:        { fontSize: 13, fontWeight: '700', color: c.textSub },
    statusLabelLive:    { color: c.primaryText },
    statusLabelOffline: { color: c.textSub },
    statusDesc:  { fontSize: 10, color: c.textFaint, marginTop: 2 },
    statusCheck: { fontSize: 14, fontWeight: '700', color: '#2d7a47' },

    errorBox: {
      backgroundColor: c.errorBg,
      borderRadius: 8,
      padding: 10,
      borderWidth: 1,
      borderColor: c.errorBorder,
      marginBottom: 8,
    },
    errorTxt: { fontSize: 12, color: c.errorText },

    footer: {
      flexDirection: 'row',
      gap: 10,
      padding: 16,
      paddingBottom: 28,
      borderTopWidth: 1,
      borderTopColor: c.borderLight,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: c.borderMid,
      alignItems: 'center',
    },
    cancelTxt: { fontSize: 14, fontWeight: '600', color: c.textSub },
    saveBtn: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 12,
      backgroundColor: '#2d7a47',
      alignItems: 'center',
    },
    saveBtnDisabled: { opacity: 0.45 },
    saveTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  });
}
