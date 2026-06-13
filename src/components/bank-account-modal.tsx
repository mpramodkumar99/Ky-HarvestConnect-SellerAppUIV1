import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import type { BankAccount, CreateBankAccountInput } from '@/services/user-api';

interface Props {
  visible: boolean;
  existing?: BankAccount | null;
  onSave: (input: CreateBankAccountInput) => Promise<void>;
  onClose: () => void;
}

export function BankAccountModal({ visible, existing, onSave, onClose }: Props) {
  const [holderName, setHolderName]     = useState('');
  const [accountNo,  setAccountNo]      = useState('');
  const [ifsc,       setIfsc]           = useState('');
  const [bankName,   setBankName]       = useState('');
  const [upiId,      setUpiId]          = useState('');
  const [saving,     setSaving]         = useState(false);
  const [error,      setError]          = useState('');

  // Pre-fill from existing data when modal opens; always clear account number (security)
  useEffect(() => {
    if (!visible) return;
    if (existing) {
      setHolderName(existing.accountHolderName);
      setAccountNo('');   // force re-entry — we only have the masked version
      setIfsc(existing.ifscCode);
      setBankName(existing.bankName);
      setUpiId(existing.upiId ?? '');
    } else {
      setHolderName('');
      setAccountNo('');
      setIfsc('');
      setBankName('');
      setUpiId('');
    }
    setError('');
  }, [visible, existing]);

  async function handleSave() {
    setError('');
    if (!holderName.trim())                       { setError('Account holder name is required'); return; }
    if (!/^\d{9,18}$/.test(accountNo))            { setError('Account number must be 9–18 digits (numbers only)'); return; }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase())) { setError('Invalid IFSC code  (e.g. HDFC0001234)'); return; }
    if (!bankName.trim())                         { setError('Bank name is required'); return; }

    setSaving(true);
    try {
      await onSave({
        accountHolderName: holderName.trim(),
        accountNumber:     accountNo,
        ifscCode:          ifsc.toUpperCase(),
        bankName:          bankName.trim(),
        ...(upiId.trim() ? { upiId: upiId.trim() } : {}),
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.title}>{existing ? 'Update Bank Account' : 'Add Bank Account'}</Text>
          <Text style={s.subtitle}>Payouts are settled T+1 to this account</Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Field label="Account Holder Name" required>
              <TextInput
                style={s.input}
                placeholder="As per bank records"
                placeholderTextColor="#9ca3af"
                value={holderName}
                onChangeText={setHolderName}
                autoCapitalize="words"
              />
            </Field>

            <Field
              label="Account Number"
              required
              hint={existing ? `Current: ${existing.accountNumber} — re-enter to change` : undefined}>
              <TextInput
                style={s.input}
                placeholder="Enter full account number"
                placeholderTextColor="#9ca3af"
                value={accountNo}
                onChangeText={setAccountNo}
                keyboardType="number-pad"
                secureTextEntry
              />
            </Field>

            <Field label="IFSC Code" required>
              <TextInput
                style={[s.input, s.monoInput]}
                placeholder="e.g. HDFC0001234"
                placeholderTextColor="#9ca3af"
                value={ifsc}
                onChangeText={t => setIfsc(t.toUpperCase())}
                autoCapitalize="characters"
                maxLength={11}
              />
            </Field>

            <Field label="Bank Name" required>
              <TextInput
                style={s.input}
                placeholder="e.g. HDFC Bank"
                placeholderTextColor="#9ca3af"
                value={bankName}
                onChangeText={setBankName}
                autoCapitalize="words"
              />
            </Field>

            <Field label="UPI ID" hint="Optional — for faster settlements">
              <TextInput
                style={s.input}
                placeholder="e.g. name@hdfcbank"
                placeholderTextColor="#9ca3af"
                value={upiId}
                onChangeText={setUpiId}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </Field>

            {error ? (
              <View style={s.errorBox}>
                <Text style={s.errorText}>⚠ {error}</Text>
              </View>
            ) : null}

            <Pressable
              style={[s.saveBtn, saving && s.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.saveBtnTxt}>{existing ? 'Update Account' : 'Save Account'}</Text>
              }
            </Pressable>

            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────

function Field({
  label, required, hint, children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
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
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 20,
  },

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
    marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
