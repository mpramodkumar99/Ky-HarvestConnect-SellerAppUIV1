import { useState, useEffect } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateSeller } from '@/services/user-api';
import type { CustomDeliveryZone, ResolvedPin } from '@/services/user-api';
import { DELIVERY_ZONE_CONFIG } from '@/context/store-context';
import { useLanguage } from '@/context/language-context';
import { useAppColors, type AppColors } from '@/hooks/use-app-colors';
import type { ShipsTo } from '@/services/user-api';
import { INDIA_STATES, DISTRICTS_BY_STATE, MANDALS_BY_DISTRICT } from '@/data/india-geo';
import { lookupPincode, parseRawPincodes, type PincodeInfo } from '@/utils/pincode';

const ZONE_ORDER: ShipsTo[] = ['mandal', 'district', 'state', 'national'];

// Backward-compat alias — profile.tsx imports CustomZoneData from here
export type { ResolvedPin };
export type CustomZoneData = CustomDeliveryZone;

// Local cache key — used until the backend persists customDeliveryZone
export function getCustomZoneKey(sellerId: string) {
  return `@hc_custom_zones_${sellerId}`;
}

interface Props {
  visible: boolean;
  sellerId: string;
  currentZones: ShipsTo[];
  currentCustomZone?: CustomDeliveryZone;
  storePincodeInfo?: PincodeInfo;
  onClose: () => void;
  onUpdated: () => void;
}

function zoneLabel(zone: ShipsTo, info?: PincodeInfo): string {
  if (info) {
    if (zone === 'mandal')   return `${info.name} Area Wide`;
    if (zone === 'district') return `${info.district} District Wide`;
    if (zone === 'state')    return `${info.state} State Wide`;
  }
  return DELIVERY_ZONE_CONFIG[zone].label;
}

export function DeliveryZonesModal({ visible, sellerId, currentZones, currentCustomZone, storePincodeInfo, onClose, onUpdated }: Props) {
  const { t } = useLanguage();
  const c = useAppColors();
  const s = makeStyles(c);
  const [selected,        setSelected]        = useState<ShipsTo[]>([]);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState('');
  const [customMode,      setCustomMode]      = useState(false);
  const [customStates,    setCustomStates]    = useState<string[]>([]);
  const [customDistricts, setCustomDistricts] = useState<string[]>([]);
  const [customMandals,   setCustomMandals]   = useState<string[]>([]);
  const [pinCodes,        setPinCodes]        = useState('');
  const [resolvedPins,    setResolvedPins]    = useState<ResolvedPin[]>([]);
  const [resolvingPins,   setResolvingPins]   = useState(false);

  const ZONE_DESC: Record<ShipsTo, string> = {
    mandal:   t('zones_desc_mandal'),
    district: t('zones_desc_district'),
    state:    t('zones_desc_state'),
    national: t('zones_desc_national'),
  };

  // On open: prefer API-sourced custom zone; fall back to AsyncStorage while backend isn't ready
  useEffect(() => {
    if (!visible) return;
    setError('');
    const source = currentCustomZone ?? null;
    if (source) {
      setCustomMode(true);
      setSelected([]);
      setCustomStates(source.states);
      setCustomDistricts(source.districts);
      setCustomMandals(source.mandals);
      setPinCodes(source.pinCodes);
      setResolvedPins(source.resolvedPins ?? []);
    } else {
      AsyncStorage.getItem(getCustomZoneKey(sellerId)).then(stored => {
        if (stored) {
          const data: CustomZoneData = JSON.parse(stored);
          setCustomMode(true);
          setSelected([]);
          setCustomStates(data.states);
          setCustomDistricts(data.districts);
          setCustomMandals(data.mandals);
          setPinCodes(data.pinCodes);
          setResolvedPins(data.resolvedPins ?? []);
        } else {
          setCustomMode(false);
          setSelected([...currentZones]);
          setCustomStates([]);
          setCustomDistricts([]);
          setCustomMandals([]);
          setPinCodes('');
          setResolvedPins([]);
        }
      });
    }
  }, [visible, currentZones, currentCustomZone, sellerId]);

  // Debounced pin code resolution — fires 700ms after the user stops typing
  useEffect(() => {
    const pins = parseRawPincodes(pinCodes);
    if (pins.length === 0) { setResolvedPins([]); return; }
    const timer = setTimeout(async () => {
      setResolvingPins(true);
      const results = await Promise.all(
        pins.map(async pin => {
          const info = await lookupPincode(pin);
          return info ? { pin, name: info.name, district: info.district } : null;
        })
      );
      setResolvedPins(results.filter((r): r is ResolvedPin => r !== null));
      setResolvingPins(false);
    }, 700);
    return () => clearTimeout(timer);
  }, [pinCodes]);

  function toggle(zone: ShipsTo) {
    setSelected(prev => {
      if (prev.includes(zone)) return prev.filter(z => z !== zone);
      switch (zone) {
        case 'national': return (['mandal', 'district', 'state', 'national'] as ShipsTo[]);
        case 'state':    return [...new Set([...prev, ...(['state', 'district', 'mandal'] as ShipsTo[])])];
        case 'district': return [...new Set([...prev, ...(['district', 'mandal'] as ShipsTo[])])];
        default:         return [...prev, zone];
      }
    });
  }

  function enterCustomMode() {
    setCustomMode(true);
    setSelected([]);
  }

  function exitCustomMode() {
    setCustomMode(false);
    setSelected([...currentZones]);
    setCustomStates([]);
    setCustomDistricts([]);
    setCustomMandals([]);
    setPinCodes('');
    setResolvedPins([]);
  }

  function toggleCustomState(state: string) {
    setCustomStates(prev => {
      const next = prev.includes(state) ? prev.filter(s => s !== state) : [...prev, state];
      setCustomDistricts([]);
      setCustomMandals([]);
      return next;
    });
  }

  function toggleCustomDistrict(district: string) {
    setCustomDistricts(prev => {
      const next = prev.includes(district) ? prev.filter(d => d !== district) : [...prev, district];
      setCustomMandals([]);
      return next;
    });
  }

  function toggleCustomMandal(mandal: string) {
    setCustomMandals(prev =>
      prev.includes(mandal) ? prev.filter(m => m !== mandal) : [...prev, mandal]
    );
  }

  const availableDistricts = customStates.length === 1
    ? (DISTRICTS_BY_STATE[customStates[0]] ?? [])
    : [];

  const availableMandals = customDistricts.length === 1
    ? (MANDALS_BY_DISTRICT[customDistricts[0]] ?? [])
    : [];

  async function handleSave() {
    if (!customMode && selected.length === 0) {
      setError('Please select at least one delivery zone.');
      return;
    }
    if (customMode && customStates.length === 0 && !pinCodes.trim()) {
      setError('Please select at least one state or enter pin codes for custom delivery.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (customMode) {
        const zone: CustomDeliveryZone = {
          states:       customStates,
          districts:    customDistricts,
          mandals:      customMandals,
          pinCodes:     pinCodes.trim(),
          resolvedPins,
        };
        await AsyncStorage.setItem(getCustomZoneKey(sellerId), JSON.stringify(zone));
        await updateSeller(sellerId, { customDeliveryZone: zone });
      } else {
        await AsyncStorage.removeItem(getCustomZoneKey(sellerId));
        await updateSeller(sellerId, { deliveryZones: selected });
      }
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update delivery zones.');
    } finally {
      setLoading(false);
    }
  }

  const saveLabel = loading
    ? t('zones_saving')
    : customMode
      ? 'Save Custom Area'
      : `${t('zones_save_pre')} ${selected.length} ${selected.length !== 1 ? t('zones_zones') : t('zones_zone')}`;

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
            <Text style={s.headTitle}>{t('zones_title')}</Text>
            <Pressable style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeTxt}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            style={s.scrollArea}
            contentContainerStyle={s.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">

            <Text style={s.hint}>{t('zones_hint')}</Text>

            {/* Standard zone tiles — hidden when custom mode is active */}
            {!customMode && ZONE_ORDER.map((zone) => {
              const zc     = DELIVERY_ZONE_CONFIG[zone];
              const label  = zoneLabel(zone, storePincodeInfo);
              const active = selected.includes(zone);
              return (
                <Pressable
                  key={zone}
                  style={[s.zoneRow, active && s.zoneRowActive]}
                  onPress={() => toggle(zone)}
                  disabled={loading}>
                  <View style={[s.zoneIcon, { backgroundColor: active ? zc.bg : c.bgSubtle }]}>
                    <Text style={{ fontSize: 22 }}>{zc.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.zoneName, active && s.zoneNameActive]}>{label}</Text>
                    <Text style={s.zoneSub}>{ZONE_DESC[zone]}</Text>
                  </View>
                  <View style={[s.checkbox, active && s.checkboxActive]}>
                    {active && <Text style={s.checkmark}>✓</Text>}
                  </View>
                </Pressable>
              );
            })}

            {/* Custom zone tile */}
            <Pressable
              style={[s.zoneRow, customMode && s.zoneRowCustomActive]}
              onPress={() => { if (customMode) { exitCustomMode(); } else { enterCustomMode(); } }}
              disabled={loading}>
              <View style={[s.zoneIcon, { backgroundColor: customMode ? '#dbeafe' : c.bgSubtle }]}>
                <Text style={{ fontSize: 22 }}>📍</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.zoneName, customMode && s.zoneNameCustomActive]}>Custom Area</Text>
                <Text style={s.zoneSub}>Specify states, districts, mandals or pin codes</Text>
              </View>
              <View style={[s.checkbox, customMode && s.checkboxCustomActive]}>
                {customMode && <Text style={s.checkmark}>✓</Text>}
              </View>
            </Pressable>

            {/* Custom delivery area section */}
            {customMode && (
              <View style={s.customSection}>
                <Text style={s.customSectionTitle}>Custom Delivery Area</Text>

                <MultiSelectPicker
                  label="States"
                  options={INDIA_STATES}
                  selected={customStates}
                  onToggle={toggleCustomState}
                  c={c}
                />

                {customStates.length === 1 && availableDistricts.length > 0 && (
                  <MultiSelectPicker
                    label={`Districts in ${customStates[0]}`}
                    options={availableDistricts}
                    selected={customDistricts}
                    onToggle={toggleCustomDistrict}
                    c={c}
                  />
                )}

                {customDistricts.length === 1 && availableMandals.length > 0 && (
                  <MultiSelectPicker
                    label={`Mandals in ${customDistricts[0]}`}
                    options={availableMandals}
                    selected={customMandals}
                    onToggle={toggleCustomMandal}
                    c={c}
                  />
                )}

                <View>
                  <Text style={s.customFieldLabel}>Pin Codes</Text>
                  <TextInput
                    style={s.pinInput}
                    placeholder="E.g. 500001, 500032, 500045"
                    placeholderTextColor={c.textFaint}
                    value={pinCodes}
                    onChangeText={setPinCodes}
                    keyboardType="default"
                    multiline
                    textAlignVertical="top"
                  />
                  <Text style={s.pinHint}>Comma-separated 6-digit pin codes</Text>

                  {/* Read-mode: resolved pin rows */}
                  {resolvingPins && (
                    <View style={s.pinResolveRow}>
                      <ActivityIndicator size="small" color={c.primary} />
                      <Text style={s.pinResolveText}>Resolving pin codes…</Text>
                    </View>
                  )}
                  {!resolvingPins && resolvedPins.length > 0 && (
                    <View style={s.pinResolvedList}>
                      {resolvedPins.map(rp => (
                        <View key={rp.pin} style={s.pinResolvedRow}>
                          <Text style={s.pinResolvedPin}>{rp.pin}</Text>
                          <Text style={s.pinResolvedSep}>–</Text>
                          <Text style={s.pinResolvedName} numberOfLines={1}>{rp.name}, {rp.district}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            )}

            {error ? (
              <View style={s.errorBox}>
                <Text style={s.errorTxt}>{error}</Text>
              </View>
            ) : null}

            <View style={{ height: 8 }} />
          </ScrollView>

          <View style={s.footer}>
            <Pressable style={s.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={s.cancelTxt}>{t('decline_cancel')}</Text>
            </Pressable>
            <Pressable
              style={[s.saveBtn, loading && s.saveBtnDisabled]}
              onPress={handleSave}
              disabled={loading}>
              <Text style={s.saveTxt}>{saveLabel}</Text>
            </Pressable>
          </View>

        </View>
      </View>
    </Modal>
  );
}

// ── Multi-select picker ───────────────────────────────────────────────────────

function MultiSelectPicker({
  label, options, selected, onToggle, c,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (val: string) => void;
  c: AppColors;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: c.textSub, marginBottom: 6 }}>{label}</Text>

      {selected.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {selected.map(item => (
            <Pressable
              key={item}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#2d7a47', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}
              onPress={() => onToggle(item)}>
              <Text style={{ fontSize: 11, color: '#fff' }}>{item}</Text>
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)' }}>✕</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Pressable
        style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: c.borderMid, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: c.bgScreen }}
        onPress={() => setExpanded(e => !e)}>
        <Text style={{ flex: 1, fontSize: 13, color: selected.length ? c.text : c.textFaint }}>
          {selected.length === 0
            ? `Select ${label.toLowerCase()}…`
            : `${selected.length} selected — tap to add/remove`}
        </Text>
        <Text style={{ fontSize: 11, color: c.textMuted }}>{expanded ? '▲' : '▼'}</Text>
      </Pressable>

      {expanded && (
        <View style={{ borderWidth: 1, borderColor: c.border, borderRadius: 8, marginTop: 4, maxHeight: 200, backgroundColor: c.bg, overflow: 'hidden' }}>
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
            {options.map((opt, idx) => {
              const checked = selected.includes(opt);
              return (
                <Pressable
                  key={opt}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: idx < options.length - 1 ? 1 : 0, borderBottomColor: c.borderLight }}
                  onPress={() => onToggle(opt)}>
                  <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: checked ? '#2d7a47' : c.borderMid, backgroundColor: checked ? '#2d7a47' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    {checked && <Text style={{ fontSize: 11, color: '#fff', fontWeight: '700' }}>✓</Text>}
                  </View>
                  <Text style={{ flex: 1, fontSize: 13, color: c.text }}>{opt}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

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

    scrollArea: { flexShrink: 1 },
    body: { padding: 20, gap: 10 },

    hint: {
      fontSize: 12,
      color: c.textMuted,
      lineHeight: 18,
      backgroundColor: c.bgScreen,
      borderRadius: 10,
      padding: 12,
      marginBottom: 4,
    },

    zoneRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.bg,
    },
    zoneRowActive:       { borderColor: '#2d7a47', backgroundColor: c.primaryBg },
    zoneRowCustomActive: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
    zoneIcon: {
      width: 48, height: 48,
      borderRadius: 12,
      alignItems: 'center', justifyContent: 'center',
    },
    zoneName:             { fontSize: 13, fontWeight: '700', color: c.textSub },
    zoneNameActive:       { color: c.primaryText },
    zoneNameCustomActive: { color: '#1d4ed8' },
    zoneSub: { fontSize: 11, color: c.textFaint, marginTop: 2, lineHeight: 15 },

    checkbox: {
      width: 24, height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: c.borderMid,
      alignItems: 'center', justifyContent: 'center',
    },
    checkboxActive:       { borderColor: '#2d7a47', backgroundColor: '#2d7a47' },
    checkboxCustomActive: { borderColor: '#3b82f6', backgroundColor: '#3b82f6' },
    checkmark: { fontSize: 12, color: '#fff', fontWeight: '700' },

    customSection: {
      backgroundColor: c.bgScreen,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: '#bfdbfe',
      marginTop: 4,
    },
    customSectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: '#1d4ed8',
      marginBottom: 14,
    },
    customFieldLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: c.textSub,
      marginBottom: 6,
    },
    pinInput: {
      borderWidth: 1,
      borderColor: c.borderMid,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
      color: c.text,
      backgroundColor: c.bg,
      minHeight: 70,
    },
    pinHint: { fontSize: 11, color: c.textFaint, marginTop: 4 },

    pinResolveRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 10,
    },
    pinResolveText: { fontSize: 12, color: c.textFaint },

    pinResolvedList: {
      marginTop: 10,
      borderWidth: 1,
      borderColor: c.borderLight,
      borderRadius: 8,
      overflow: 'hidden',
    },
    pinResolvedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: c.borderLight,
      backgroundColor: c.bg,
    },
    pinResolvedPin:  { fontSize: 12, fontWeight: '700', color: c.text, minWidth: 52 },
    pinResolvedSep:  { fontSize: 12, color: c.textFaint },
    pinResolvedName: { fontSize: 12, color: c.textSub, flex: 1 },

    errorBox: {
      backgroundColor: c.errorBg,
      borderRadius: 8,
      padding: 10,
      borderWidth: 1,
      borderColor: c.errorBorder,
      marginTop: 4,
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
