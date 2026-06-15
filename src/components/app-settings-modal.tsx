import { useState } from 'react';
import {
  Modal, View, Text, Pressable, StyleSheet, ScrollView, Switch, Linking,
} from 'react-native';

interface ToggleSetting {
  key: string;
  label: string;
  desc: string;
}

const NOTIFICATION_SETTINGS: ToggleSetting[] = [
  { key: 'new_orders',    label: 'New Orders',             desc: 'Alert when a buyer places a new order' },
  { key: 'order_updates', label: 'Order Status Updates',   desc: 'Updates when orders are dispatched or delivered' },
  { key: 'payment',       label: 'Payment Received',       desc: 'Alert when a payout is transferred to your bank' },
  { key: 'performance',   label: 'Weekly Report',          desc: 'Summary of your store performance every Monday' },
  { key: 'promos',        label: 'HarvestConnect Updates', desc: 'New features, seller programs, and tips' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function AppSettingsModal({ visible, onClose }: Props) {
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
            <Text style={s.headTitle}>App Settings</Text>
            <Pressable style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeTxt}>✕</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={s.body}>

            {/* Notifications */}
            <Text style={s.sectionTitle}>Notifications</Text>
            <View style={s.card}>
              {NOTIFICATION_SETTINGS.map((setting, i) => (
                <View key={setting.key} style={[s.row, i > 0 && s.rowBorder]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowLabel}>{setting.label}</Text>
                    <Text style={s.rowDesc}>{setting.desc}</Text>
                  </View>
                  <Switch
                    value={notifs[setting.key]}
                    onValueChange={() => toggle(setting.key)}
                    trackColor={{ false: '#e5e7eb', true: '#86efac' }}
                    thumbColor={notifs[setting.key] ? '#2d7a47' : '#9ca3af'}
                  />
                </View>
              ))}
            </View>

            {/* Display */}
            <Text style={s.sectionTitle}>Display</Text>
            <View style={s.card}>
              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowLabel}>Language</Text>
                  <Text style={s.rowDesc}>English (India)</Text>
                </View>
                <View style={s.comingSoonPill}>
                  <Text style={s.comingSoonTxt}>More soon</Text>
                </View>
              </View>
              <View style={[s.row, s.rowBorder]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowLabel}>Dark Mode</Text>
                  <Text style={s.rowDesc}>System default</Text>
                </View>
                <View style={s.comingSoonPill}>
                  <Text style={s.comingSoonTxt}>Coming soon</Text>
                </View>
              </View>
            </View>

            {/* Privacy & Legal */}
            <Text style={s.sectionTitle}>Privacy & Legal</Text>
            <View style={s.card}>
              {[
                { label: 'Privacy Policy',    url: 'https://harvestconnect.in/privacy' },
                { label: 'Terms of Service',  url: 'https://harvestconnect.in/terms' },
                { label: 'Data & Permissions', url: 'https://harvestconnect.in/data' },
              ].map((item, i) => (
                <Pressable
                  key={item.label}
                  style={[s.row, i > 0 && s.rowBorder]}
                  onPress={() => Linking.openURL(item.url)}>
                  <Text style={[s.rowLabel, { flex: 1 }]}>{item.label}</Text>
                  <Text style={s.rowChevron}>›</Text>
                </Pressable>
              ))}
            </View>

            {/* About */}
            <Text style={s.sectionTitle}>About</Text>
            <View style={s.card}>
              <View style={s.row}>
                <Text style={[s.rowLabel, { flex: 1 }]}>App Version</Text>
                <Text style={s.rowMeta}>1.0.0 (build 42)</Text>
              </View>
              <View style={[s.row, s.rowBorder]}>
                <Text style={[s.rowLabel, { flex: 1 }]}>Platform</Text>
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

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: '#fff',
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

  body: { padding: 16 },

  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8, marginTop: 4 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
  rowBorder: { borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  rowLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  rowDesc: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  rowMeta: { fontSize: 12, color: '#9ca3af' },
  rowChevron: { fontSize: 20, color: '#d1d5db' },

  comingSoonPill: {
    backgroundColor: '#f3f4f6',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  comingSoonTxt: { fontSize: 10, color: '#9ca3af', fontWeight: '600' },
});
