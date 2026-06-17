import { useState } from 'react';
import {
  Modal, View, Text, Pressable, StyleSheet, ScrollView, Switch, Linking,
} from 'react-native';
import { useLanguage, type Language } from '@/context/language-context';
import { useThemePreference, type ThemePreference } from '@/context/theme-context';
import { useAppColors, type AppColors } from '@/hooks/use-app-colors';

const NOTIFICATION_KEYS = [
  { key: 'new_orders',    labelKey: 'notif_new_orders',    descKey: 'notif_new_orders_desc' },
  { key: 'order_updates', labelKey: 'notif_order_updates', descKey: 'notif_order_updates_desc' },
  { key: 'payment',       labelKey: 'notif_payment',       descKey: 'notif_payment_desc' },
  { key: 'performance',   labelKey: 'notif_performance',   descKey: 'notif_performance_desc' },
  { key: 'promos',        labelKey: 'notif_promos',        descKey: 'notif_promos_desc' },
] as const;

const LANGUAGES: { value: Language; label: string; native: string }[] = [
  { value: 'en', label: 'English', native: 'English (India)' },
  { value: 'te', label: 'Telugu',  native: 'తెలుగు' },
  { value: 'hi', label: 'Hindi',   native: 'हिन्दी' },
];

const THEME_OPTIONS: { value: ThemePreference; icon: string; labelKey: 'theme_light' | 'theme_dark' | 'theme_system' }[] = [
  { value: 'light',  icon: '☀️', labelKey: 'theme_light' },
  { value: 'dark',   icon: '🌙', labelKey: 'theme_dark' },
  { value: 'system', icon: '⚙️', labelKey: 'theme_system' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function AppSettingsModal({ visible, onClose }: Props) {
  const { t, language, setLanguage } = useLanguage();
  const { preference, setPreference } = useThemePreference();
  const c = useAppColors();
  const s = makeStyles(c);

  const [notifs, setNotifs] = useState<Record<string, boolean>>({
    new_orders:    true,
    order_updates: true,
    payment:       true,
    performance:   false,
    promos:        false,
  });

  function toggle(key: string) {
    setNotifs(prev => ({ ...prev, [key]: !prev[key] }));
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
            <Text style={s.headTitle}>{t('settings_title')}</Text>
            <Pressable style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeTxt}>✕</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={s.body}>

            {/* Notifications */}
            <Text style={s.sectionTitle}>{t('settings_notifications')}</Text>
            <View style={s.card}>
              {NOTIFICATION_KEYS.map((item, i) => (
                <View key={item.key} style={[s.row, i > 0 && s.rowBorder]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowLabel}>{t(item.labelKey)}</Text>
                    <Text style={s.rowDesc}>{t(item.descKey)}</Text>
                  </View>
                  <Switch
                    value={notifs[item.key]}
                    onValueChange={() => toggle(item.key)}
                    trackColor={{ false: c.border, true: c.primaryBorder }}
                    thumbColor={notifs[item.key] ? c.primary : c.textFaint}
                  />
                </View>
              ))}
            </View>

            {/* Display */}
            <Text style={s.sectionTitle}>{t('settings_display')}</Text>
            <View style={s.card}>

              {/* Language picker */}
              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowLabel}>{t('display_language')}</Text>
                  <View style={s.chips}>
                    {LANGUAGES.map(lang => {
                      const active = language === lang.value;
                      return (
                        <Pressable
                          key={lang.value}
                          style={[s.chip, active && s.chipActive]}
                          onPress={() => setLanguage(lang.value)}>
                          <Text style={[s.chipTxt, active && s.chipTxtActive]}>
                            {lang.native}
                          </Text>
                          {active && <Text style={s.chipCheck}>✓</Text>}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* Theme picker */}
              <View style={[s.row, s.rowBorder]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowLabel}>{t('display_dark_mode')}</Text>
                  <Text style={s.rowDesc}>{t('display_dark_mode_desc')}</Text>
                  <View style={s.chips}>
                    {THEME_OPTIONS.map(opt => {
                      const active = preference === opt.value;
                      return (
                        <Pressable
                          key={opt.value}
                          style={[s.chip, active && s.chipActive]}
                          onPress={() => setPreference(opt.value)}>
                          <Text style={{ fontSize: 13 }}>{opt.icon}</Text>
                          <Text style={[s.chipTxt, active && s.chipTxtActive]}>
                            {t(opt.labelKey)}
                          </Text>
                          {active && <Text style={s.chipCheck}>✓</Text>}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            </View>

            {/* Privacy & Legal */}
            <Text style={s.sectionTitle}>{t('settings_privacy')}</Text>
            <View style={s.card}>
              {[
                { labelKey: 'privacy_policy',   url: 'https://harvestconnect.in/privacy' },
                { labelKey: 'terms_of_service', url: 'https://harvestconnect.in/terms' },
                { labelKey: 'data_permissions', url: 'https://harvestconnect.in/data' },
              ].map((item, i) => (
                <Pressable
                  key={item.labelKey}
                  style={[s.row, i > 0 && s.rowBorder]}
                  onPress={() => Linking.openURL(item.url)}>
                  <Text style={[s.rowLabel, { flex: 1 }]}>{t(item.labelKey as any)}</Text>
                  <Text style={s.rowChevron}>›</Text>
                </Pressable>
              ))}
            </View>

            {/* About */}
            <Text style={s.sectionTitle}>{t('settings_about')}</Text>
            <View style={s.card}>
              <View style={s.row}>
                <Text style={[s.rowLabel, { flex: 1 }]}>{t('about_version')}</Text>
                <Text style={s.rowMeta}>1.0.0 (build 42)</Text>
              </View>
              <View style={[s.row, s.rowBorder]}>
                <Text style={[s.rowLabel, { flex: 1 }]}>{t('about_platform')}</Text>
                <Text style={s.rowMeta}>HarvestConnect Seller</Text>
              </View>
            </View>

            <View style={{ height: 32 }} />

          </ScrollView>
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
      maxHeight: '92%',
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

    body: { padding: 16 },

    sectionTitle: {
      fontSize: 12, fontWeight: '700', color: c.textFaint,
      letterSpacing: 0.5, textTransform: 'uppercase',
      marginBottom: 8, marginTop: 4,
    },

    card: {
      backgroundColor: c.bg,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
      marginBottom: 20,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    rowBorder: { borderTopWidth: 1, borderTopColor: c.borderLight },
    rowLabel:  { fontSize: 14, fontWeight: '600', color: c.text },
    rowDesc:   { fontSize: 11, color: c.textMuted, marginTop: 2 },
    rowMeta:   { fontSize: 12, color: c.textFaint },
    rowChevron:{ fontSize: 20, color: c.borderMid },

    chips: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 14, paddingVertical: 7,
      borderRadius: 99, borderWidth: 1.5, borderColor: c.border,
      backgroundColor: c.bgMuted,
    },
    chipActive: {
      borderColor: c.primary,
      backgroundColor: c.primaryBg,
    },
    chipTxt:       { fontSize: 13, fontWeight: '600', color: c.textMuted },
    chipTxtActive: { color: c.primaryText },
    chipCheck:     { fontSize: 11, fontWeight: '800', color: c.primary },
  });
}
