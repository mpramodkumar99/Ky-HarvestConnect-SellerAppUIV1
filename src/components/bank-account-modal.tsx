import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLanguage } from '@/context/language-context';
import { useAppColors, type AppColors } from '@/hooks/use-app-colors';
import type { BankAccount, CreateBankAccountInput } from '@/services/user-api';
import { lookupIFSC, IFSC_REGEX, type IFSCInfo } from '@/utils/ifsc';

interface Props {
  visible: boolean;
  existing?: BankAccount | null;
  onSave: (input: CreateBankAccountInput) => Promise<void>;
  onClose: () => void;
}

export function BankAccountModal({ visible, existing, onSave, onClose }: Props) {
  const { t } = useLanguage();
  const c = useAppColors();
  const s = makeStyles(c);
  const [holderName, setHolderName]     = useState('');
  const [accountNo,  setAccountNo]      = useState('');
  const [ifsc,       setIfsc]           = useState('');
  const [bankName,   setBankName]       = useState('');
  const [upiId,      setUpiId]          = useState('');
  const [saving,     setSaving]         = useState(false);
  const [error,      setError]          = useState('');

  const [ifscInfo,      setIfscInfo]      = useState<IFSCInfo | null>(null);
  const [ifscLookingUp, setIfscLookingUp] = useState(false);
  const [ifscNotFound,  setIfscNotFound]  = useState(false);
  // track whether bankName was auto-filled so we can replace it on IFSC change
  const [bankNameAutoFilled, setBankNameAutoFilled] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (existing) {
      setHolderName(existing.accountHolderName);
      setAccountNo('');
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
    setIfscInfo(null);
    setIfscNotFound(false);
    setBankNameAutoFilled(false);
    setError('');
  }, [visible, existing]);

  // IFSC lookup — fires when 11-char valid-format code is entered
  useEffect(() => {
    const code = ifsc.toUpperCase().trim();
    if (!IFSC_REGEX.test(code)) {
      setIfscInfo(null);
      setIfscNotFound(false);
      return;
    }
    let cancelled = false;
    setIfscLookingUp(true);
    setIfscInfo(null);
    setIfscNotFound(false);
    lookupIFSC(code).then(info => {
      if (cancelled) return;
      setIfscLookingUp(false);
      if (info) {
        setIfscInfo(info);
        setIfscNotFound(false);
        if (!bankName.trim() || bankNameAutoFilled) {
          setBankName(info.bank);
          setBankNameAutoFilled(true);
        }
      } else {
        setIfscInfo(null);
        setIfscNotFound(true);
      }
    });
    return () => { cancelled = true; };
  }, [ifsc]);

  async function handleSave() {
    setError('');
    if (!holderName.trim())                            { setError(t('bank_err_holder')); return; }
    if (!/^\d{9,18}$/.test(accountNo))                { setError(t('bank_err_account')); return; }
    if (!IFSC_REGEX.test(ifsc.toUpperCase()))          { setError(t('bank_err_ifsc')); return; }
    if (!bankName.trim())                              { setError(t('bank_err_bank_name')); return; }

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
      setError(e instanceof Error ? e.message : t('bank_err_save'));
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
          <Text style={s.title}>{existing ? t('bank_title_update') : t('bank_title_add')}</Text>
          <Text style={s.subtitle}>{t('bank_subtitle')}</Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Field label={t('bank_holder_name')} required c={c}>
              <TextInput
                style={s.input}
                placeholder={t('bank_holder_name_ph')}
                placeholderTextColor={c.textFaint}
                value={holderName}
                onChangeText={setHolderName}
                autoCapitalize="words"
              />
            </Field>

            <Field
              label={t('bank_account_no')}
              required
              hint={existing ? `Current: ${existing.accountNumber} — ${t('bank_account_reenter')}` : undefined}
              c={c}>
              <TextInput
                style={s.input}
                placeholder={t('bank_account_no_ph')}
                placeholderTextColor={c.textFaint}
                value={accountNo}
                onChangeText={setAccountNo}
                keyboardType="number-pad"
                secureTextEntry
              />
            </Field>

            <Field label={t('bank_ifsc')} required c={c}>
              <TextInput
                style={[s.input, s.monoInput, ifscNotFound && s.inputError, ifscInfo && s.inputValid]}
                placeholder={t('bank_ifsc_ph')}
                placeholderTextColor={c.textFaint}
                value={ifsc}
                onChangeText={v => {
                  setIfsc(v.toUpperCase());
                  setBankNameAutoFilled(false);
                }}
                autoCapitalize="characters"
                maxLength={11}
              />
              {ifscLookingUp && (
                <View style={s.ifscStatus}>
                  <ActivityIndicator size="small" color={c.primary} />
                  <Text style={[s.ifscStatusTxt, { color: c.textFaint }]}>Looking up branch…</Text>
                </View>
              )}
              {ifscInfo && !ifscLookingUp && (
                <View style={s.ifscStatus}>
                  <Text style={s.ifscStatusIcon}>✓</Text>
                  <Text style={[s.ifscStatusTxt, { color: c.primaryText }]} numberOfLines={2}>
                    {ifscInfo.bank} · {ifscInfo.branch}
                    {ifscInfo.city ? `, ${ifscInfo.city}` : ''}
                  </Text>
                </View>
              )}
              {ifscNotFound && !ifscLookingUp && (
                <View style={s.ifscStatus}>
                  <Text style={s.ifscStatusIcon}>✕</Text>
                  <Text style={[s.ifscStatusTxt, { color: c.errorText }]}>Invalid IFSC code — bank not found</Text>
                </View>
              )}
            </Field>

            <Field label={t('bank_name')} required c={c}>
              <TextInput
                style={s.input}
                placeholder={t('bank_name_ph')}
                placeholderTextColor={c.textFaint}
                value={bankName}
                onChangeText={v => { setBankName(v); setBankNameAutoFilled(false); }}
                autoCapitalize="words"
              />
            </Field>

            <Field label={t('bank_upi')} hint={t('bank_upi_hint')} c={c}>
              <TextInput
                style={s.input}
                placeholder={t('bank_upi_ph')}
                placeholderTextColor={c.textFaint}
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
                : <Text style={s.saveBtnTxt}>{existing ? t('bank_update_btn') : t('bank_save_btn')}</Text>
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
  label, required, hint, children, c,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  c: AppColors;
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
    container: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.bg,
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
      backgroundColor: c.borderMid,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: c.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 12,
      color: c.textMuted,
      marginBottom: 20,
    },

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
    monoInput: {
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      letterSpacing: 1,
    },
    inputError: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
    inputValid: { borderColor: '#2d7a47', backgroundColor: c.primaryBg },

    ifscStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 6,
    },
    ifscStatusIcon: { fontSize: 13, fontWeight: '700' },
    ifscStatusTxt:  { fontSize: 12, flex: 1, lineHeight: 17 },

    errorBox: {
      backgroundColor: c.errorBg,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.errorBorder,
      padding: 10,
      marginBottom: 12,
    },
    errorText: { fontSize: 13, color: c.errorTextDark },

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
}
