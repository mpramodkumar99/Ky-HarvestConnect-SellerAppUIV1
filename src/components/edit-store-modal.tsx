import { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, StyleSheet, ScrollView,
} from 'react-native';
import { updateSeller } from '@/services/user-api';
import { SELLER_TYPE_CONFIG } from '@/context/store-context';
import type { Store } from '@/context/store-context';
import type { SellerType } from '@/services/user-api';

const TYPE_OPTIONS: SellerType[] = ['farmer', 'artisan', 'dairy', 'homefood', 'trades'];

interface Props {
  visible: boolean;
  store: Store;
  onClose: () => void;
  onUpdated: () => void;
}

export function EditStoreModal({ visible, store, onClose, onUpdated }: Props) {
  const [name,        setName]        = useState('');
  const [description, setDescription] = useState('');
  const [type,        setType]        = useState<SellerType>('farmer');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  useEffect(() => {
    if (visible) {
      setName(store.name);
      setDescription(store.description ?? '');
      setType(store.type);
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
        type,
      });
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
            <Text style={s.headTitle}>Edit Store</Text>
            <Pressable style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeTxt}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            <View style={s.field}>
              <Text style={s.label}>Store Name *</Text>
              <TextInput
                style={s.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Desi Dairy Armoor"
                placeholderTextColor="#9ca3af"
                editable={!loading}
                autoCapitalize="words"
              />
            </View>

            <View style={s.field}>
              <Text style={s.label}>Description</Text>
              <TextInput
                style={[s.input, s.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Tell buyers about your store, your produce, your story…"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                editable={!loading}
                textAlignVertical="top"
              />
            </View>

            <View style={[s.field, { marginBottom: 8 }]}>
              <Text style={s.label}>Store Type</Text>
              <View style={s.typeGrid}>
                {TYPE_OPTIONS.map((t) => {
                  const tc = SELLER_TYPE_CONFIG[t];
                  const active = type === t;
                  return (
                    <Pressable
                      key={t}
                      style={[s.typeChip, active && s.typeChipActive]}
                      onPress={() => setType(t)}
                      disabled={loading}>
                      <Text style={{ fontSize: 20 }}>{tc.icon}</Text>
                      <Text style={[s.typeLabel, active && s.typeLabelActive]}>{tc.label}</Text>
                    </Pressable>
                  );
                })}
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
              <Text style={s.cancelTxt}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[s.saveBtn, !canSave && s.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!canSave}>
              <Text style={s.saveTxt}>{loading ? 'Saving…' : 'Save Changes'}</Text>
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
    borderBottomColor: '#f3f4f6',
  },
  headTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  closeBtn: {
    width: 32, height: 32,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  closeTxt: { fontSize: 13, color: '#374151', fontWeight: '700' },

  body: { padding: 20 },

  field: { marginBottom: 18 },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#f9fafb',
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
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  typeChipActive: { borderColor: '#2d7a47', backgroundColor: '#f0fdf4' },
  typeLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  typeLabelActive: { color: '#166534' },

  errorBox: {
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#fca5a5',
    marginBottom: 8,
  },
  errorTxt: { fontSize: 12, color: '#dc2626' },

  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cancelTxt: { fontSize: 14, fontWeight: '600', color: '#374151' },
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
