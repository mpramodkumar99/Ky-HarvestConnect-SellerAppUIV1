import { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, StyleSheet,
} from 'react-native';

interface Props {
  visible: boolean;
  orderId: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
}

export function DeclineReasonModal({ visible, orderId, onClose, onConfirm, loading = false }: Props) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!visible) setReason('');
  }, [visible]);

  function handleConfirm() {
    const trimmed = reason.trim();
    if (!trimmed || loading) return;
    onConfirm(trimmed);
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
            <View>
              <Text style={s.headTitle}>Decline Order</Text>
              <Text style={s.headSub}>{orderId}</Text>
            </View>
            <Pressable style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeTxt}>✕</Text>
            </Pressable>
          </View>

          <View style={s.body}>
            <Text style={s.label}>Reason for declining *</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Item out of stock, unable to deliver to this location..."
              placeholderTextColor="#9ca3af"
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!loading}
            />
            <Text style={s.hint}>The buyer will be notified with this reason.</Text>
          </View>

          <View style={s.footer}>
            <Pressable style={s.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={s.cancelTxt}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[s.confirmBtn, (!reason.trim() || loading) && s.confirmDisabled]}
              onPress={handleConfirm}
              disabled={!reason.trim() || loading}>
              <Text style={s.confirmTxt}>{loading ? 'Declining...' : 'Decline Order'}</Text>
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#fee2e2',
    backgroundColor: '#fff5f5',
  },
  headTitle: { fontSize: 17, fontWeight: '700', color: '#991b1b' },
  headSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  closeBtn: {
    width: 32, height: 32,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTxt: { fontSize: 13, color: '#374151', fontWeight: '700' },

  body: { padding: 20, gap: 10 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  input: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#111827',
    minHeight: 100,
    backgroundColor: '#f9fafb',
  },
  hint: { fontSize: 11, color: '#9ca3af' },

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
  confirmBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#dc2626',
    alignItems: 'center',
  },
  confirmDisabled: { opacity: 0.45 },
  confirmTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
