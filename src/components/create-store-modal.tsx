import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import type { SellerType, BusinessType, ShipsTo } from '@/services/user-api';
import { createSeller } from '@/services/user-api';
import { sellerToStore, SELLER_TYPE_CONFIG, DELIVERY_ZONE_CONFIG, type Store } from '@/context/store-context';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { useAppColors, type AppColors } from '@/hooks/use-app-colors';
import { lookupPincode, type PincodeInfo } from '@/utils/pincode';

interface Props {
  visible: boolean;
  onCreated: (store: Store) => void;
  onClose: () => void;
  existingTypes?: SellerType[];
}

const SELLER_TYPES: SellerType[] = ['farmer', 'dairy', 'homefood', 'artisan', 'trades', 'kirana'];
const DELIVERY_ZONES: ShipsTo[]  = ['mandal', 'district', 'state', 'national'];

function zoneLabel(zone: ShipsTo, info?: PincodeInfo | null): string {
  if (info) {
    if (zone === 'mandal')   return `${info.name} Area Wide`;
    if (zone === 'district') return `${info.district} District Wide`;
    if (zone === 'state')    return `${info.state} State Wide`;
  }
  return DELIVERY_ZONE_CONFIG[zone].label;
}

export function CreateStoreModal({ visible, onCreated, onClose, existingTypes = [] }: Props) {
  const { session } = useAuth();
  const { t } = useLanguage();
  const c = useAppColors();
  const s = makeStyles(c);
  const [name,         setName]         = useState('');
  const [type,         setType]         = useState<SellerType>('farmer');
  const [businessType, setBusinessType] = useState<BusinessType>('retail');
  const [phone,        setPhone]        = useState('');
  const [location,     setLocation]     = useState('');
  const [pincode,      setPincode]      = useState('');
  const [description,  setDescription]  = useState('');
  const [fssaiNumber,  setFssaiNumber]  = useState('');
  const [zones,        setZones]        = useState<ShipsTo[]>([]);
  const [customAreaMode, setCustomAreaMode] = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');
  const [pincodeInfo,  setPincodeInfo]  = useState<PincodeInfo | null>(null);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(''); setType('farmer'); setBusinessType('retail'); setPhone(''); setLocation('');
    setPincode(''); setDescription(''); setFssaiNumber(''); setZones([]);
    setCustomAreaMode(false); setError(''); setPincodeInfo(null); setDuplicateWarning(false);
  }, [visible]);

  useEffect(() => {
    setPincodeInfo(null);
    if (!/^\d{6}$/.test(pincode)) return;
    let cancelled = false;
    setPincodeLoading(true);
    lookupPincode(pincode).then(info => {
      if (!cancelled) { setPincodeInfo(info); setPincodeLoading(false); }
    });
    return () => { cancelled = true; };
  }, [pincode]);

  function toggleZone(zone: ShipsTo) {
    const idx = DELIVERY_ZONES.indexOf(zone);
    setZones(prev =>
      prev.includes(zone)
        ? DELIVERY_ZONES.slice(0, idx)          // deselect this + all broader zones above
        : DELIVERY_ZONES.slice(0, idx + 1)      // select this + all more granular zones below
    );
  }

  function normalizePhone(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
    return raw;
  }

  async function handleSave(bypassDuplicateCheck = false) {
    setError('');
    const normalizedPhone = normalizePhone(phone.trim());

    if (!name.trim())                              { setError(t('create_store_err_name')); return; }
    if (!/^\+91[6-9]\d{9}$/.test(normalizedPhone)){ setError(t('create_store_err_phone')); return; }
    if (!location.trim())                          { setError(t('create_store_err_location')); return; }
    if (!/^\d{6}$/.test(pincode))                  { setError(t('create_store_err_pincode')); return; }
    if (!customAreaMode && zones.length === 0)      { setError(t('create_store_err_zones')); return; }

    if (!bypassDuplicateCheck && existingTypes.includes(type)) {
      setDuplicateWarning(true);
      return;
    }

    setSaving(true);
    try {
      const seller = await createSeller({
        userId:        session?.userId,
        name:          name.trim(),
        type,
        phone:         normalizedPhone,
        location:      location.trim(),
        pincode,
        deliveryZones: zones,
        description:   description.trim() || undefined,
        fssaiNumber:   fssaiNumber.trim() || undefined,
        ...(type === 'kirana' ? { businessType } : {}),
      });
      onCreated(sellerToStore(seller, 'owner'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create store. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={s.sheet}>
          {/* Header */}
          <View style={s.sheetHeader}>
            <View style={s.handle} />
            <View style={s.titleRow}>
              <Text style={s.title}>{t('create_store_title')}</Text>
              <Pressable style={s.closeBtn} onPress={onClose}>
                <Text style={s.closeTxt}>✕</Text>
              </Pressable>
            </View>
            <Text style={s.subtitle}>{t('create_store_subtitle')}</Text>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.scrollContent}>

            {/* Store Type */}
            <Text style={s.fieldLabel}>{t('create_store_type')} <Text style={s.required}>*</Text></Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 18 }}
              contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
              {SELLER_TYPES.map(sType => {
                const tc = SELLER_TYPE_CONFIG[sType];
                const active = type === sType;
                return (
                  <Pressable
                    key={sType}
                    style={[s.typeChip, active && s.typeChipActive]}
                    onPress={() => setType(sType)}>
                    <Text style={s.typeChipIcon}>{tc.icon}</Text>
                    <Text style={[s.typeChipLabel, active && s.typeChipLabelActive]}>
                      {tc.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Wholesale / Retail toggle — kirana only */}
            {type === 'kirana' && (
              <View style={{ marginBottom: 18 }}>
                <Text style={s.fieldLabel}>{t('create_store_business_model')} <Text style={s.required}>*</Text></Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                  {(['retail', 'wholesale'] as BusinessType[]).map(bt => (
                    <Pressable
                      key={bt}
                      style={[s.typeChip, businessType === bt && s.typeChipActive, { flex: 1, justifyContent: 'center' }]}
                      onPress={() => setBusinessType(bt)}>
                      <Text style={s.typeChipIcon}>{bt === 'retail' ? '🛍️' : '📦'}</Text>
                      <Text style={[s.typeChipLabel, businessType === bt && s.typeChipLabelActive]}>
                        {bt === 'retail' ? t('create_store_retail') : t('create_store_wholesale')}
                      </Text>
                      <Text style={{ fontSize: 10, color: businessType === bt ? '#fff' : c.textFaint, textAlign: 'center', marginTop: 2 }}>
                        {bt === 'retail' ? t('create_store_retail_sub') : t('create_store_wholesale_sub')}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Store Name */}
            <Field label={t('create_store_name')} required c={c}>
              <TextInput
                style={s.input}
                placeholder={t('create_store_name_ph')}
                placeholderTextColor={c.textFaint}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </Field>

            {/* Phone */}
            <Field label={t('create_store_phone')} required hint={t('create_store_phone_hint')} c={c}>
              <TextInput
                style={s.input}
                placeholder={t('create_store_phone_ph')}
                placeholderTextColor={c.textFaint}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={13}
              />
            </Field>

            {/* Location */}
            <Field label={t('create_store_location')} required hint={t('create_store_location_hint')} c={c}>
              <TextInput
                style={s.input}
                placeholder={t('create_store_location_ph')}
                placeholderTextColor={c.textFaint}
                value={location}
                onChangeText={setLocation}
                autoCapitalize="words"
              />
            </Field>

            {/* Pincode */}
            <Field label={t('create_store_pincode')} required hint={t('create_store_pincode_hint')} c={c}>
              <TextInput
                style={s.input}
                placeholder={t('create_store_pincode_ph')}
                placeholderTextColor={c.textFaint}
                value={pincode}
                onChangeText={setPincode}
                keyboardType="number-pad"
                maxLength={6}
              />
            </Field>
            {pincodeLoading && (
              <View style={s.pinInfoRow}>
                <ActivityIndicator size="small" color={c.primary} />
                <Text style={s.pinInfoText}>Looking up pin code…</Text>
              </View>
            )}
            {!pincodeLoading && pincodeInfo && (
              <View style={s.pinInfoRow}>
                <Text style={s.pinInfoDot}>✓</Text>
                <Text style={s.pinInfoText} numberOfLines={1}>
                  {pincodeInfo.name}, {pincodeInfo.district}, {pincodeInfo.state}
                </Text>
              </View>
            )}
            {!pincodeLoading && pincode.length === 6 && !pincodeInfo && (
              <View style={s.pinInfoRow}>
                <Text style={[s.pinInfoDot, { color: c.errorTextDark }]}>✕</Text>
                <Text style={[s.pinInfoText, { color: c.errorTextDark }]}>Invalid pin code</Text>
              </View>
            )}

            {/* Delivery Zones */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={s.fieldLabel}>{t('create_store_zones')} <Text style={s.required}>*</Text></Text>
              <Pressable
                onPress={() => { setCustomAreaMode(m => !m); setZones([]); }}
                style={[s.customAreaBtn, customAreaMode && s.customAreaBtnActive]}>
                <Text style={[s.customAreaBtnTxt, customAreaMode && s.customAreaBtnTxtActive]}>
                  {customAreaMode ? t('create_store_custom_area_on') : t('create_store_custom_area_off')}
                </Text>
              </Pressable>
            </View>

            {customAreaMode ? (
              <View style={s.customAreaNote}>
                <Text style={{ fontSize: 22, marginBottom: 6 }}>📍</Text>
                <Text style={[s.customAreaNoteTitle]}>{t('create_store_custom_area_title')}</Text>
                <Text style={s.customAreaNoteDesc}>{t('create_store_custom_area_desc')}</Text>
              </View>
            ) : (
              <View style={s.zoneGrid}>
                {DELIVERY_ZONES.map(zone => {
                  const zc      = DELIVERY_ZONE_CONFIG[zone];
                  const checked = zones.includes(zone);
                  const label   = zoneLabel(zone, pincodeInfo);
                  return (
                    <Pressable
                      key={zone}
                      style={[s.zoneChip, checked && { backgroundColor: zc.bg, borderColor: zc.text + '60' }]}
                      onPress={() => toggleZone(zone)}>
                      <Text style={s.zoneChipIcon}>{zc.icon}</Text>
                      <Text style={[s.zoneChipLabel, checked && { color: zc.text, fontWeight: '700' }]}>
                        {label}
                      </Text>
                      {checked && <Text style={[s.zoneCheck, { color: zc.text }]}>✓</Text>}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Description */}
            <Field label={t('create_store_desc')} hint={t('create_store_desc_hint')} c={c}>
              <TextInput
                style={[s.input, s.textArea]}
                placeholder={t('create_store_desc_ph')}
                placeholderTextColor={c.textFaint}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </Field>

            {/* FSSAI */}
            <Field label={t('create_store_fssai')} hint={t('create_store_fssai_hint')} c={c}>
              <TextInput
                style={[s.input, s.monoInput]}
                placeholder={t('create_store_fssai_ph')}
                placeholderTextColor={c.textFaint}
                value={fssaiNumber}
                onChangeText={setFssaiNumber}
                keyboardType="number-pad"
                maxLength={14}
              />
            </Field>

            {/* Error */}
            {error ? (
              <View style={s.errorBox}>
                <Text style={s.errorText}>⚠ {error}</Text>
              </View>
            ) : null}

            {/* Duplicate type warning */}
            {duplicateWarning && (
              <View style={s.dupWarningBox}>
                <Text style={s.dupWarningTitle}>
                  {t('create_store_dup_title_prefix')} {SELLER_TYPE_CONFIG[type].icon} {SELLER_TYPE_CONFIG[type].label} {t('create_store_dup_title_suffix')}
                </Text>
                <Text style={s.dupWarningDesc}>{t('create_store_dup_desc')}</Text>
                <View style={s.dupWarningActions}>
                  <Pressable style={s.dupCancelBtn} onPress={() => setDuplicateWarning(false)}>
                    <Text style={s.dupCancelTxt}>{t('payout_cancel')}</Text>
                  </Pressable>
                  <Pressable style={s.dupConfirmBtn} onPress={() => { setDuplicateWarning(false); handleSave(true); }}>
                    <Text style={s.dupConfirmTxt}>{t('create_store_dup_confirm')}</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Submit */}
            <Pressable
              style={[s.saveBtn, (saving || duplicateWarning) && s.saveBtnDisabled]}
              onPress={() => handleSave()}
              disabled={saving || duplicateWarning}>
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.saveBtnTxt}>{t('create_store_btn')}</Text>
              }
            </Pressable>

            <Text style={s.verificationNote}>{t('create_store_note')}</Text>

            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────

function Field({ label, required, hint, children, c }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode; c: AppColors;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', gap: 4, marginBottom: 6 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: c.textSub }}>{label}</Text>
        {required && <Text style={{ fontSize: 13, color: '#ef4444', fontWeight: '700' }}>*</Text>}
      </View>
      {children}
      {hint ? <Text style={{ fontSize: 11, color: c.textFaint, marginTop: 4 }}>{hint}</Text> : null}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, justifyContent: 'flex-end' },

    sheet: {
      backgroundColor: c.bg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '92%',
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 24,
      elevation: 12,
    },
    sheetHeader: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: c.borderLight,
    },
    handle: {
      width: 40, height: 4,
      backgroundColor: c.borderMid,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 16,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    title: { fontSize: 18, fontWeight: '700', color: c.text },
    subtitle: { fontSize: 12, color: c.textMuted },
    closeBtn: {
      width: 30, height: 30,
      backgroundColor: c.bgSubtle,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeTxt: { fontSize: 12, color: c.textMuted, fontWeight: '700' },

    scrollContent: { paddingHorizontal: 20, paddingTop: 20 },

    // Type selector
    typeChip: {
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.bgScreen,
      minWidth: 80,
      gap: 4,
    },
    typeChipActive: { borderColor: '#2d7a47', backgroundColor: c.primaryBg },
    typeChipIcon: { fontSize: 22 },
    typeChipLabel: { fontSize: 11, fontWeight: '600', color: c.textMuted },
    typeChipLabelActive: { color: c.primaryText },

    // Delivery zones
    customAreaBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: c.primary },
    customAreaBtnActive: { backgroundColor: c.primary },
    customAreaBtnTxt: { fontSize: 11, fontWeight: '700', color: c.primary },
    customAreaBtnTxtActive: { color: '#fff' },
    customAreaNote: { alignItems: 'center', padding: 20, marginBottom: 18, borderRadius: 12, borderWidth: 1.5, borderColor: c.primary, borderStyle: 'dashed', backgroundColor: c.primaryBg },
    customAreaNoteTitle: { fontSize: 13, fontWeight: '700', color: c.primaryText, marginBottom: 4 },
    customAreaNoteDesc: { fontSize: 12, color: c.textMuted, textAlign: 'center', lineHeight: 17 },
    zoneGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
    zoneChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.bgScreen,
      width: '47%',
    },
    zoneChipIcon: { fontSize: 16 },
    zoneChipLabel: { fontSize: 12, color: c.textMuted, flex: 1 },
    zoneCheck: { fontSize: 12, fontWeight: '700' },

    // Fields (used for direct-JSX labels outside Field component)
    fieldLabel: { fontSize: 13, fontWeight: '600', color: c.textSub },
    required: { fontSize: 13, color: '#ef4444', fontWeight: '700' },

    input: {
      height: 46,
      borderWidth: 1,
      borderColor: c.borderMid,
      borderRadius: 10,
      paddingHorizontal: 14,
      fontSize: 14,
      color: c.text,
      backgroundColor: c.bgScreen,
    },
    textArea: { height: 80, paddingTop: 12 },
    monoInput: {
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      letterSpacing: 1,
    },

    errorBox: {
      backgroundColor: c.errorBg,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.errorBorder,
      padding: 10,
      marginBottom: 12,
    },
    errorText: { fontSize: 13, color: c.errorTextDark },

    dupWarningBox: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#f59e0b',
      backgroundColor: '#fffbeb',
      padding: 14,
      marginBottom: 12,
    },
    dupWarningTitle: { fontSize: 13, fontWeight: '700', color: '#92400e', marginBottom: 4 },
    dupWarningDesc:  { fontSize: 12, color: '#b45309', marginBottom: 12, lineHeight: 17 },
    dupWarningActions: { flexDirection: 'row', gap: 8 },
    dupCancelBtn: {
      flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8,
      borderWidth: 1, borderColor: '#d97706', backgroundColor: '#fff',
    },
    dupCancelTxt: { fontSize: 13, color: '#92400e', fontWeight: '600' },
    dupConfirmBtn: {
      flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8,
      backgroundColor: '#d97706',
    },
    dupConfirmTxt: { fontSize: 13, color: '#fff', fontWeight: '700' },

    saveBtn: {
      backgroundColor: '#2d7a47',
      borderRadius: 12,
      height: 50,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },

    verificationNote: {
      fontSize: 11,
      color: c.textFaint,
      textAlign: 'center',
      marginTop: 12,
    },

    pinInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: -10,
      marginBottom: 14,
      paddingHorizontal: 4,
    },
    pinInfoDot: { fontSize: 12, color: '#16a34a', fontWeight: '700' },
    pinInfoText: { fontSize: 12, color: c.textSub, flex: 1 },
  });
}
