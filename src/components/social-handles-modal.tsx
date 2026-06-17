import { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, StyleSheet, ScrollView,
} from 'react-native';
import { updateSeller } from '@/services/user-api';
import type { SocialHandles } from '@/services/user-api';
import { useLanguage } from '@/context/language-context';
import { useAppColors, type AppColors } from '@/hooks/use-app-colors';
import type { Store } from '@/context/store-context';

interface Props {
  visible:   boolean;
  store:     Store;
  onClose:   () => void;
  onUpdated: () => void;
}

const PLATFORMS: {
  key:         keyof SocialHandles;
  label:       string;
  placeholder: string;
  icon:        string;
  prefix?:     string;
  keyboardType?: 'default' | 'url' | 'phone-pad';
}[] = [
  { key: 'instagram', label: 'Instagram',  placeholder: 'yourusername',        icon: '📸', prefix: '@',  keyboardType: 'default' },
  { key: 'facebook',  label: 'Facebook',   placeholder: 'facebook.com/yourpage', icon: '👍', keyboardType: 'url' },
  { key: 'whatsapp',  label: 'WhatsApp',   placeholder: '+91 98765 43210',      icon: '💬', keyboardType: 'phone-pad' },
  { key: 'website',   label: 'Website',    placeholder: 'https://yoursite.com', icon: '🌐', keyboardType: 'url' },
  { key: 'youtube',   label: 'YouTube',    placeholder: 'youtube.com/@channel', icon: '▶️', keyboardType: 'url' },
];

export function SocialHandlesModal({ visible, store, onClose, onUpdated }: Props) {
  const { t } = useLanguage();
  const c = useAppColors();
  const s = makeStyles(c);

  const [values,  setValues]  = useState<Record<keyof SocialHandles, string>>({
    instagram: '', facebook: '', whatsapp: '', website: '', youtube: '',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (visible) {
      setValues({
        instagram: store.socialHandles?.instagram ?? '',
        facebook:  store.socialHandles?.facebook  ?? '',
        whatsapp:  store.socialHandles?.whatsapp  ?? '',
        website:   store.socialHandles?.website   ?? '',
        youtube:   store.socialHandles?.youtube   ?? '',
      });
      setError('');
    }
  }, [visible, store]);

  function setValue(key: keyof SocialHandles, val: string) {
    setValues(prev => ({ ...prev, [key]: val }));
  }

  async function handleSave() {
    setLoading(true);
    setError('');
    try {
      const socialHandles: SocialHandles = {};
      for (const p of PLATFORMS) {
        const v = values[p.key].trim();
        if (v) socialHandles[p.key] = v;
      }
      await updateSeller(store.id, {
        socialHandles: Object.keys(socialHandles).length > 0 ? socialHandles : undefined,
      });
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save social handles.');
    } finally {
      setLoading(false);
    }
  }

  const hasChanges = PLATFORMS.some(p =>
    (values[p.key].trim() || '') !== (store.socialHandles?.[p.key] ?? '')
  );

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
            <Text style={s.headTitle}>{t('edit_store_social')}</Text>
            <Pressable style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeTxt}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            style={s.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>

            <Text style={s.hint}>
              Add your social links so customers can connect with you directly.
            </Text>

            {PLATFORMS.map(p => (
              <View key={p.key} style={s.field}>
                <View style={s.labelRow}>
                  <Text style={s.platformIcon}>{p.icon}</Text>
                  <Text style={s.label}>{p.label}</Text>
                </View>
                {p.prefix ? (
                  <View style={s.prefixRow}>
                    <Text style={s.prefix}>{p.prefix}</Text>
                    <TextInput
                      style={[s.input, s.prefixInput]}
                      value={values[p.key]}
                      onChangeText={v => setValue(p.key, v)}
                      placeholder={p.placeholder}
                      placeholderTextColor={c.textFaint}
                      autoCapitalize="none"
                      keyboardType={p.keyboardType ?? 'default'}
                      editable={!loading}
                    />
                  </View>
                ) : (
                  <TextInput
                    style={s.input}
                    value={values[p.key]}
                    onChangeText={v => setValue(p.key, v)}
                    placeholder={p.placeholder}
                    placeholderTextColor={c.textFaint}
                    autoCapitalize="none"
                    keyboardType={p.keyboardType ?? 'default'}
                    editable={!loading}
                  />
                )}
              </View>
            ))}

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
              style={[s.saveBtn, (!hasChanges || loading) && s.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!hasChanges || loading}>
              <Text style={s.saveTxt}>{loading ? t('edit_store_saving') : t('edit_store_save')}</Text>
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
    backdrop:  { backgroundColor: 'rgba(0,0,0,0.55)' },
    sheet: {
      backgroundColor: c.bg,
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

    body: { paddingHorizontal: 20, paddingTop: 16 },

    hint: {
      fontSize: 12,
      color: c.textMuted,
      lineHeight: 18,
      backgroundColor: c.bgScreen,
      borderRadius: 10,
      padding: 12,
      marginBottom: 20,
    },

    field: { marginBottom: 18 },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    platformIcon: { fontSize: 15 },
    label: { fontSize: 12, fontWeight: '600', color: c.textSub },

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

    prefixRow:  { flexDirection: 'row', alignItems: 'center' },
    prefix: {
      fontSize: 15,
      fontWeight: '600',
      color: c.textSub,
      paddingLeft: 14,
      paddingRight: 4,
      position: 'absolute',
      zIndex: 1,
    },
    prefixInput: { flex: 1, paddingLeft: 28 },

    errorBox: {
      backgroundColor: c.errorBg,
      borderRadius: 8,
      padding: 10,
      borderWidth: 1,
      borderColor: c.errorBorder,
      marginBottom: 8,
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
    cancelTxt:       { fontSize: 14, fontWeight: '600', color: c.textSub },
    saveBtn:         { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#2d7a47', alignItems: 'center' },
    saveBtnDisabled: { opacity: 0.45 },
    saveTxt:         { fontSize: 14, fontWeight: '700', color: '#fff' },
  });
}
