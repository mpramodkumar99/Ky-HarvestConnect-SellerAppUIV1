import { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, StyleSheet,
} from 'react-native';
import { useLanguage } from '@/context/language-context';
import { useAppColors, type AppColors } from '@/hooks/use-app-colors';

interface Props {
  visible: boolean;
  orderId: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
}

export function DeclineReasonModal({ visible, orderId, onClose, onConfirm, loading = false }: Props) {
  const { t } = useLanguage();
  const c = useAppColors();
  const s = makeStyles(c);
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
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={s.container}>
        <Pressable style={[StyleSheet.absoluteFill, s.backdrop]} onPress={onClose} />
        <View style={s.sheet}>

          <View style={s.head}>
            <View>
              <Text style={s.headTitle}>{t('decline_title')}</Text>
              <Text style={s.headSub}>{orderId}</Text>
            </View>
            <Pressable style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeTxt}>✕</Text>
            </Pressable>
          </View>

          <View style={s.body}>
            <Text style={s.label}>{t('decline_reason_label')}</Text>
            <TextInput
              style={s.input}
              placeholder={t('decline_placeholder')}
              placeholderTextColor={c.textFaint}
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!loading}
            />
            <Text style={s.hint}>{t('decline_hint')}</Text>
          </View>

          <View style={s.footer}>
            <Pressable style={s.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={s.cancelTxt}>{t('decline_cancel')}</Text>
            </Pressable>
            <Pressable
              style={[s.confirmBtn, (!reason.trim() || loading) && s.confirmDisabled]}
              onPress={handleConfirm}
              disabled={!reason.trim() || loading}>
              <Text style={s.confirmTxt}>{loading ? t('decline_loading') : t('decline_confirm')}</Text>
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
    sheet: { backgroundColor: c.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },

    head: {
      flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14,
      borderBottomWidth: 1, borderBottomColor: c.errorBorder,
      backgroundColor: c.errorBg,
    },
    headTitle: { fontSize: 17, fontWeight: '700', color: c.errorTextDark },
    headSub: { fontSize: 12, color: c.textFaint, marginTop: 2 },
    closeBtn: {
      width: 32, height: 32, backgroundColor: c.bgSubtle,
      borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    },
    closeTxt: { fontSize: 13, color: c.textSub, fontWeight: '700' },

    body: { padding: 20, gap: 10 },
    label: { fontSize: 13, fontWeight: '600', color: c.textSub },
    input: {
      borderWidth: 1.5, borderColor: c.border, borderRadius: 12,
      padding: 12, fontSize: 13, color: c.text,
      minHeight: 100, backgroundColor: c.bgScreen,
    },
    hint: { fontSize: 11, color: c.textFaint },

    footer: {
      flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 28,
      borderTopWidth: 1, borderTopColor: c.borderLight,
    },
    cancelBtn: {
      flex: 1, paddingVertical: 13, borderRadius: 12,
      borderWidth: 1.5, borderColor: c.borderMid, alignItems: 'center',
    },
    cancelTxt: { fontSize: 14, fontWeight: '600', color: c.textSub },
    confirmBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#dc2626', alignItems: 'center' },
    confirmDisabled: { opacity: 0.45 },
    confirmTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  });
}
