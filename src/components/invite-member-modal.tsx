import { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, StyleSheet,
} from 'react-native';
import { inviteMember } from '@/services/user-api';
import type { SellerRole } from '@/services/user-api';

const ROLE_OPTIONS: { value: Exclude<SellerRole, 'owner'>; label: string; desc: string }[] = [
  { value: 'manager', label: 'Manager', desc: 'Can edit products & view analytics' },
  { value: 'staff',   label: 'Staff',   desc: 'Can process orders only' },
];

interface Props {
  visible: boolean;
  sellerId: string;
  onClose: () => void;
  onInvited: () => void;
}

export function InviteMemberModal({ visible, sellerId, onClose, onInvited }: Props) {
  const [name,    setName]    = useState('');
  const [phone,   setPhone]   = useState('');
  const [role,    setRole]    = useState<Exclude<SellerRole, 'owner'>>('manager');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!visible) {
      setName(''); setPhone(''); setRole('manager');
      setLoading(false); setError('');
    }
  }, [visible]);

  const canSubmit = name.trim().length > 0 && phone.trim().length >= 10 && !loading;

  async function handleInvite() {
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    try {
      await inviteMember(sellerId, {
        name: name.trim(),
        phone: phone.trim().startsWith('+') ? phone.trim() : `+91${phone.trim()}`,
        role,
      });
      onInvited();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite.');
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
            <Text style={s.headTitle}>Invite Team Member</Text>
            <Pressable style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeTxt}>✕</Text>
            </Pressable>
          </View>

          <View style={s.body}>
            <View style={s.field}>
              <Text style={s.fieldLabel}>Full Name *</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Ramesh Kumar"
                placeholderTextColor="#9ca3af"
                value={name}
                onChangeText={setName}
                editable={!loading}
                autoCapitalize="words"
              />
            </View>

            <View style={s.field}>
              <Text style={s.fieldLabel}>Mobile Number *</Text>
              <TextInput
                style={s.input}
                placeholder="+91 98765 43210"
                placeholderTextColor="#9ca3af"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                editable={!loading}
              />
            </View>

            <View style={s.field}>
              <Text style={s.fieldLabel}>Role</Text>
              <View style={s.roleRow}>
                {ROLE_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    style={[s.roleChip, role === opt.value && s.roleChipActive]}
                    onPress={() => setRole(opt.value)}
                    disabled={loading}>
                    <Text style={[s.roleLabel, role === opt.value && s.roleLabelActive]}>
                      {opt.label}
                    </Text>
                    <Text style={[s.roleDesc, role === opt.value && s.roleDescActive]}>
                      {opt.desc}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {error ? (
              <View style={s.errorBox}>
                <Text style={s.errorTxt}>{error}</Text>
              </View>
            ) : null}

            <View style={s.hint}>
              <Text style={s.hintTxt}>
                They'll receive an SMS invite to join your store on HarvestConnect.
              </Text>
            </View>
          </View>

          <View style={s.footer}>
            <Pressable style={s.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={s.cancelTxt}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[s.inviteBtn, !canSubmit && s.inviteBtnDisabled]}
              onPress={handleInvite}
              disabled={!canSubmit}>
              <Text style={s.inviteTxt}>{loading ? 'Sending...' : 'Send Invite'}</Text>
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
    alignItems: 'center', justifyContent: 'center',
  },
  closeTxt: { fontSize: 13, color: '#374151', fontWeight: '700' },

  body: { padding: 20, gap: 16 },

  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#374151' },
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

  roleRow: { flexDirection: 'row', gap: 10 },
  roleChip: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
  },
  roleChipActive: { borderColor: '#2d7a47', backgroundColor: '#f0fdf4' },
  roleLabel: { fontSize: 13, fontWeight: '700', color: '#6b7280' },
  roleLabelActive: { color: '#166534' },
  roleDesc: { fontSize: 10, color: '#9ca3af', marginTop: 3, lineHeight: 14 },
  roleDescActive: { color: '#4ade80' },

  errorBox: {
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  errorTxt: { fontSize: 12, color: '#dc2626' },

  hint: { backgroundColor: '#f9fafb', borderRadius: 10, padding: 10 },
  hintTxt: { fontSize: 11, color: '#6b7280', lineHeight: 16 },

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
  inviteBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#2d7a47',
    alignItems: 'center',
  },
  inviteBtnDisabled: { opacity: 0.45 },
  inviteTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
