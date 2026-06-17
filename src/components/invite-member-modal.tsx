import { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, StyleSheet,
} from 'react-native';
import { inviteMember } from '@/services/user-api';
import type { SellerRole } from '@/services/user-api';
import { useLanguage } from '@/context/language-context';
import { useAppColors, type AppColors } from '@/hooks/use-app-colors';

interface Props {
  visible: boolean;
  sellerId: string;
  onClose: () => void;
  onInvited: () => void;
}

export function InviteMemberModal({ visible, sellerId, onClose, onInvited }: Props) {
  const { t } = useLanguage();
  const c = useAppColors();
  const s = makeStyles(c);
  const [name,    setName]    = useState('');
  const [phone,   setPhone]   = useState('');
  const [role,    setRole]    = useState<Exclude<SellerRole, 'owner'>>('manager');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const ROLE_OPTIONS: { value: Exclude<SellerRole, 'owner'>; label: string; desc: string }[] = [
    { value: 'manager', label: t('invite_role_manager'), desc: t('invite_role_manager_desc') },
    { value: 'staff',   label: t('invite_role_staff'),   desc: t('invite_role_staff_desc') },
  ];

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
            <Text style={s.headTitle}>{t('invite_title')}</Text>
            <Pressable style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeTxt}>✕</Text>
            </Pressable>
          </View>

          <View style={s.body}>
            <View style={s.field}>
              <Text style={s.fieldLabel}>{t('invite_name')} *</Text>
              <TextInput
                style={s.input}
                placeholder={t('invite_name_ph')}
                placeholderTextColor={c.textFaint}
                value={name}
                onChangeText={setName}
                editable={!loading}
                autoCapitalize="words"
              />
            </View>

            <View style={s.field}>
              <Text style={s.fieldLabel}>{t('invite_phone')} *</Text>
              <TextInput
                style={s.input}
                placeholder={t('invite_phone_ph')}
                placeholderTextColor={c.textFaint}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                editable={!loading}
              />
            </View>

            <View style={s.field}>
              <Text style={s.fieldLabel}>{t('invite_role')}</Text>
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
              <Text style={s.hintTxt}>{t('invite_hint')}</Text>
            </View>
          </View>

          <View style={s.footer}>
            <Pressable style={s.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={s.cancelTxt}>{t('decline_cancel')}</Text>
            </Pressable>
            <Pressable
              style={[s.inviteBtn, !canSubmit && s.inviteBtnDisabled]}
              onPress={handleInvite}
              disabled={!canSubmit}>
              <Text style={s.inviteTxt}>
                {loading ? t('invite_sending') : t('invite_send')}
              </Text>
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

    body: { padding: 20, gap: 16 },

    field: { gap: 6 },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: c.textSub },
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

    roleRow: { flexDirection: 'row', gap: 10 },
    roleChip: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: c.border,
      borderRadius: 12,
      padding: 12,
      backgroundColor: c.bgScreen,
    },
    roleChipActive: { borderColor: '#2d7a47', backgroundColor: c.primaryBg },
    roleLabel: { fontSize: 13, fontWeight: '700', color: c.textMuted },
    roleLabelActive: { color: c.primaryText },
    roleDesc: { fontSize: 10, color: c.textFaint, marginTop: 3, lineHeight: 14 },
    roleDescActive: { color: c.primaryLight },

    errorBox: {
      backgroundColor: c.errorBg,
      borderRadius: 8,
      padding: 10,
      borderWidth: 1,
      borderColor: c.errorBorder,
    },
    errorTxt: { fontSize: 12, color: c.errorText },

    hint: { backgroundColor: c.bgScreen, borderRadius: 10, padding: 10 },
    hintTxt: { fontSize: 11, color: c.textMuted, lineHeight: 16 },

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
}
