import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import type { SellerType, ShipsTo } from '@/services/user-api';
import { createSeller } from '@/services/user-api';
import { sellerToStore, SELLER_TYPE_CONFIG, DELIVERY_ZONE_CONFIG, type Store } from '@/context/store-context';

interface Props {
  visible: boolean;
  onCreated: (store: Store) => void;
  onClose: () => void;
}

const SELLER_TYPES: SellerType[] = ['farmer', 'dairy', 'homefood', 'artisan', 'trades'];
const DELIVERY_ZONES: ShipsTo[]  = ['mandal', 'district', 'state', 'national'];

export function CreateStoreModal({ visible, onCreated, onClose }: Props) {
  const [name,         setName]         = useState('');
  const [type,         setType]         = useState<SellerType>('farmer');
  const [phone,        setPhone]        = useState('');
  const [location,     setLocation]     = useState('');
  const [pincode,      setPincode]      = useState('');
  const [description,  setDescription]  = useState('');
  const [fssaiNumber,  setFssaiNumber]  = useState('');
  const [zones,        setZones]        = useState<ShipsTo[]>([]);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');

  useEffect(() => {
    if (!visible) return;
    setName(''); setType('farmer'); setPhone(''); setLocation('');
    setPincode(''); setDescription(''); setFssaiNumber(''); setZones([]);
    setError('');
  }, [visible]);

  function toggleZone(zone: ShipsTo) {
    setZones(prev => prev.includes(zone) ? prev.filter(z => z !== zone) : [...prev, zone]);
  }

  // Accept 10-digit number, +91XXXXXXXXXX, or 91XXXXXXXXXX
  function normalizePhone(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
    return raw;
  }

  async function handleSave() {
    setError('');
    const normalizedPhone = normalizePhone(phone.trim());

    if (!name.trim())                              { setError('Store name is required'); return; }
    if (!/^\+91[6-9]\d{9}$/.test(normalizedPhone)){ setError('Enter a valid 10-digit Indian mobile number'); return; }
    if (!location.trim())                          { setError('Location is required (e.g. Nizamabad, Telangana)'); return; }
    if (!/^\d{6}$/.test(pincode))                  { setError('Enter a valid 6-digit pincode'); return; }
    if (zones.length === 0)                        { setError('Select at least one delivery zone'); return; }

    setSaving(true);
    try {
      const seller = await createSeller({
        name:          name.trim(),
        type,
        phone:         normalizedPhone,
        location:      location.trim(),
        pincode,
        deliveryZones: zones,
        description:   description.trim() || undefined,
        fssaiNumber:   fssaiNumber.trim() || undefined,
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
              <Text style={s.title}>Create New Store</Text>
              <Pressable style={s.closeBtn} onPress={onClose}>
                <Text style={s.closeTxt}>✕</Text>
              </Pressable>
            </View>
            <Text style={s.subtitle}>Your store will be visible after admin verification</Text>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.scrollContent}>

            {/* Store Type */}
            <Text style={s.fieldLabel}>Store Type <Text style={s.required}>*</Text></Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 18 }}
              contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
              {SELLER_TYPES.map(t => {
                const tc = SELLER_TYPE_CONFIG[t];
                const active = type === t;
                return (
                  <Pressable
                    key={t}
                    style={[s.typeChip, active && s.typeChipActive]}
                    onPress={() => setType(t)}>
                    <Text style={s.typeChipIcon}>{tc.icon}</Text>
                    <Text style={[s.typeChipLabel, active && s.typeChipLabelActive]}>
                      {tc.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Store Name */}
            <Field label="Store Name" required>
              <TextInput
                style={s.input}
                placeholder="e.g. Ravi Organic Farm"
                placeholderTextColor="#9ca3af"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </Field>

            {/* Phone */}
            <Field label="Mobile Number" required hint="10-digit Indian number · used as store contact">
              <TextInput
                style={s.input}
                placeholder="e.g. 9876543210"
                placeholderTextColor="#9ca3af"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={13}
              />
            </Field>

            {/* Location */}
            <Field label="Location" required hint="Display name shown to buyers">
              <TextInput
                style={s.input}
                placeholder="e.g. Nizamabad, Telangana"
                placeholderTextColor="#9ca3af"
                value={location}
                onChangeText={setLocation}
                autoCapitalize="words"
              />
            </Field>

            {/* Pincode */}
            <Field label="Pincode" required hint="Used to set delivery coordinates">
              <TextInput
                style={s.input}
                placeholder="6-digit pincode"
                placeholderTextColor="#9ca3af"
                value={pincode}
                onChangeText={setPincode}
                keyboardType="number-pad"
                maxLength={6}
              />
            </Field>

            {/* Delivery Zones */}
            <Text style={s.fieldLabel}>Delivery Zones <Text style={s.required}>*</Text></Text>
            <View style={s.zoneGrid}>
              {DELIVERY_ZONES.map(zone => {
                const zc = DELIVERY_ZONE_CONFIG[zone];
                const checked = zones.includes(zone);
                return (
                  <Pressable
                    key={zone}
                    style={[s.zoneChip, checked && { backgroundColor: zc.bg, borderColor: zc.text + '60' }]}
                    onPress={() => toggleZone(zone)}>
                    <Text style={s.zoneChipIcon}>{zc.icon}</Text>
                    <Text style={[s.zoneChipLabel, checked && { color: zc.text, fontWeight: '700' }]}>
                      {zc.label}
                    </Text>
                    {checked && <Text style={[s.zoneCheck, { color: zc.text }]}>✓</Text>}
                  </Pressable>
                );
              })}
            </View>

            {/* Description */}
            <Field label="Description" hint="Optional · shown on your store profile">
              <TextInput
                style={[s.input, s.textArea]}
                placeholder="Tell buyers what you sell and what makes your store special…"
                placeholderTextColor="#9ca3af"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </Field>

            {/* FSSAI */}
            <Field label="FSSAI License Number" hint="Optional · required for food sellers">
              <TextInput
                style={[s.input, s.monoInput]}
                placeholder="14-digit FSSAI number"
                placeholderTextColor="#9ca3af"
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

            {/* Submit */}
            <Pressable
              style={[s.saveBtn, saving && s.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.saveBtnTxt}>Create Store</Text>
              }
            </Pressable>

            <Text style={s.verificationNote}>
              New stores start as unverified. Upload KYC documents to get the Verified badge.
            </Text>

            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <View style={s.field}>
      <View style={{ flexDirection: 'row', gap: 4, marginBottom: 6 }}>
        <Text style={s.fieldLabel}>{label}</Text>
        {required && <Text style={s.required}>*</Text>}
      </View>
      {children}
      {hint ? <Text style={s.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },

  sheet: {
    backgroundColor: '#fff',
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
    borderBottomColor: '#f3f4f6',
  },
  handle: {
    width: 40, height: 4,
    backgroundColor: '#d1d5db',
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
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 12, color: '#6b7280' },
  closeBtn: {
    width: 30, height: 30,
    backgroundColor: '#f3f4f6',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTxt: { fontSize: 12, color: '#6b7280', fontWeight: '700' },

  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },

  // Type selector
  typeChip: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    minWidth: 80,
    gap: 4,
  },
  typeChipActive: { borderColor: '#2d7a47', backgroundColor: '#f0fdf4' },
  typeChipIcon: { fontSize: 22 },
  typeChipLabel: { fontSize: 11, fontWeight: '600', color: '#6b7280' },
  typeChipLabelActive: { color: '#166534' },

  // Delivery zones
  zoneGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  zoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    width: '47%',
  },
  zoneChipIcon: { fontSize: 16 },
  zoneChipLabel: { fontSize: 12, color: '#6b7280', flex: 1 },
  zoneCheck: { fontSize: 12, fontWeight: '700' },

  // Fields
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  required: { fontSize: 13, color: '#ef4444', fontWeight: '700' },
  fieldHint: { fontSize: 11, color: '#9ca3af', marginTop: 4 },

  input: {
    height: 46,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  textArea: { height: 80, paddingTop: 12 },
  monoInput: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },

  errorBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fca5a5',
    padding: 10,
    marginBottom: 12,
  },
  errorText: { fontSize: 13, color: '#991b1b' },

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
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 12,
  },
});
