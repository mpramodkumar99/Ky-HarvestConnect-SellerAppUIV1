import { useState, useEffect } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { updateSeller } from '@/services/user-api';
import { DELIVERY_ZONE_CONFIG } from '@/context/store-context';
import type { ShipsTo } from '@/services/user-api';

const ZONE_ORDER: ShipsTo[] = ['mandal', 'district', 'state', 'national'];

const ZONE_DESC: Record<ShipsTo, string> = {
  mandal:   'Nearby villages and towns within your mandal',
  district: 'All areas within your district',
  state:    'Anywhere within Telangana & Andhra Pradesh',
  national: 'Pan-India delivery via courier partner',
};

interface Props {
  visible: boolean;
  sellerId: string;
  currentZones: ShipsTo[];
  onClose: () => void;
  onUpdated: () => void;
}

export function DeliveryZonesModal({ visible, sellerId, currentZones, onClose, onUpdated }: Props) {
  const [selected, setSelected] = useState<ShipsTo[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    if (visible) {
      setSelected([...currentZones]);
      setError('');
    }
  }, [visible, currentZones]);

  function toggle(zone: ShipsTo) {
    setSelected(prev =>
      prev.includes(zone) ? prev.filter(z => z !== zone) : [...prev, zone]
    );
  }

  async function handleSave() {
    setLoading(true);
    setError('');
    try {
      await updateSeller(sellerId, { deliveryZones: selected });
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update delivery zones.');
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
            <Text style={s.headTitle}>Delivery Zones</Text>
            <Pressable style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeTxt}>✕</Text>
            </Pressable>
          </View>

          <View style={s.body}>
            <Text style={s.hint}>
              Select all areas you can deliver to. Buyers outside your selected zones won't see your listings.
            </Text>

            {ZONE_ORDER.map((zone) => {
              const zc = DELIVERY_ZONE_CONFIG[zone];
              const active = selected.includes(zone);
              return (
                <Pressable
                  key={zone}
                  style={[s.zoneRow, active && s.zoneRowActive]}
                  onPress={() => toggle(zone)}
                  disabled={loading}>
                  <View style={[s.zoneIcon, { backgroundColor: active ? zc.bg : '#f3f4f6' }]}>
                    <Text style={{ fontSize: 22 }}>{zc.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.zoneName, active && s.zoneNameActive]}>{zc.label}</Text>
                    <Text style={s.zoneSub}>{ZONE_DESC[zone]}</Text>
                  </View>
                  <View style={[s.checkbox, active && s.checkboxActive]}>
                    {active && <Text style={s.checkmark}>✓</Text>}
                  </View>
                </Pressable>
              );
            })}

            {error ? (
              <View style={s.errorBox}>
                <Text style={s.errorTxt}>{error}</Text>
              </View>
            ) : null}
          </View>

          <View style={s.footer}>
            <Pressable style={s.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={s.cancelTxt}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[s.saveBtn, loading && s.saveBtnDisabled]}
              onPress={handleSave}
              disabled={loading}>
              <Text style={s.saveTxt}>
                {loading ? 'Saving…' : `Save · ${selected.length} zone${selected.length !== 1 ? 's' : ''}`}
              </Text>
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

  body: { padding: 20, gap: 10 },

  hint: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 4,
  },

  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  zoneRowActive: { borderColor: '#2d7a47', backgroundColor: '#f0fdf4' },
  zoneIcon: {
    width: 48, height: 48,
    borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  zoneName: { fontSize: 13, fontWeight: '700', color: '#374151' },
  zoneNameActive: { color: '#166534' },
  zoneSub: { fontSize: 11, color: '#9ca3af', marginTop: 2, lineHeight: 15 },

  checkbox: {
    width: 24, height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { borderColor: '#2d7a47', backgroundColor: '#2d7a47' },
  checkmark: { fontSize: 12, color: '#fff', fontWeight: '700' },

  errorBox: {
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#fca5a5',
    marginTop: 4,
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
