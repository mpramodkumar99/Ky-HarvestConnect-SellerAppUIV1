import { useState } from 'react';
import {
  Modal, View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PendingInvite } from '@/services/user-api';
import { useStore } from '@/context/store-context';
import { ROLE_CONFIG } from '@/context/store-context';

interface Props {
  visible: boolean;
  onDone: () => void;
}

export function PendingInviteModal({ visible, onDone }: Props) {
  const { pendingInvites, acceptInvite, declineInvite } = useStore();
  const [busy, setBusy] = useState<string | null>(null); // invite id being acted on
  const [error, setError] = useState('');

  async function handleAccept(invite: PendingInvite) {
    setBusy(invite.id);
    setError('');
    try {
      await acceptInvite(invite.sellerId, invite.id);
      if (pendingInvites.length <= 1) onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invite.');
    } finally {
      setBusy(null);
    }
  }

  async function handleDecline(invite: PendingInvite) {
    setBusy(invite.id);
    setError('');
    try {
      await declineInvite(invite.sellerId, invite.id);
      if (pendingInvites.length <= 1) onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline invite.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onDone}>
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>

        <View style={s.header}>
          <View style={s.logoRing}>
            <Text style={s.logoIcon}>🌾</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Store Invites</Text>
            <Text style={s.sub}>You've been invited to join a store</Text>
          </View>
        </View>

        <ScrollView style={s.list} contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
          {pendingInvites.map(invite => {
            const rc    = ROLE_CONFIG[invite.role];
            const isBusy = busy === invite.id;
            return (
              <View key={invite.id} style={s.card}>
                <View style={s.cardTop}>
                  <View style={s.storeIcon}>
                    <Text style={s.storeIconTxt}>🏪</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.storeName}>{invite.sellerName}</Text>
                    <Text style={s.invitedAt}>
                      Invited {new Date(invite.invitedAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <View style={[s.rolePill, { backgroundColor: rc.bg }]}>
                    <Text style={[s.rolePillTxt, { color: rc.color }]}>{rc.label}</Text>
                  </View>
                </View>

                <View style={s.roleDesc}>
                  <Text style={s.roleDescTxt}>
                    {invite.role === 'manager'
                      ? 'You can edit products and view analytics for this store.'
                      : 'You can process and manage orders for this store.'}
                  </Text>
                </View>

                <View style={s.cardActions}>
                  <Pressable
                    style={[s.declineBtn, isBusy && s.btnDisabled]}
                    onPress={() => handleDecline(invite)}
                    disabled={!!busy}>
                    <Text style={s.declineTxt}>Decline</Text>
                  </Pressable>
                  <Pressable
                    style={[s.acceptBtn, isBusy && s.btnDisabled]}
                    onPress={() => handleAccept(invite)}
                    disabled={!!busy}>
                    {isBusy
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={s.acceptTxt}>Accept & Join</Text>}
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {error ? (
          <View style={s.errorBox}>
            <Text style={s.errorTxt}>{error}</Text>
          </View>
        ) : null}

        <View style={s.footer}>
          <Pressable style={s.skipBtn} onPress={onDone} disabled={!!busy}>
            <Text style={s.skipTxt}>Skip for now</Text>
          </Pressable>
          <Text style={s.skipNote}>You can accept these later from your profile</Text>
        </View>

      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  logoRing: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#2d7a47', alignItems: 'center', justifyContent: 'center',
  },
  logoIcon: { fontSize: 22 },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
  sub:   { fontSize: 12, color: '#6b7280', marginTop: 1 },

  list: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1, borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  storeIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  storeIconTxt: { fontSize: 20 },
  storeName:    { fontSize: 15, fontWeight: '700', color: '#111827' },
  invitedAt:    { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  rolePill:     { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  rolePillTxt:  { fontSize: 11, fontWeight: '700' },

  roleDesc: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#f9fafb' },
  roleDescTxt: { fontSize: 12, color: '#6b7280', lineHeight: 17 },

  cardActions: {
    flexDirection: 'row', gap: 10,
    padding: 14, borderTopWidth: 1, borderTopColor: '#f3f4f6',
  },
  declineBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#d1d5db', alignItems: 'center',
  },
  declineTxt: { fontSize: 13, fontWeight: '600', color: '#374151' },
  acceptBtn: {
    flex: 2, paddingVertical: 12, borderRadius: 12,
    backgroundColor: '#2d7a47', alignItems: 'center',
  },
  acceptTxt:   { fontSize: 13, fontWeight: '700', color: '#fff' },
  btnDisabled: { opacity: 0.5 },

  errorBox: {
    marginHorizontal: 20, marginBottom: 8,
    backgroundColor: '#fff5f5', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#fca5a5',
  },
  errorTxt: { fontSize: 12, color: '#dc2626' },

  footer: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8, gap: 8, alignItems: 'center' },
  skipBtn: {
    width: '100%', paddingVertical: 13, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#d1d5db', alignItems: 'center',
    backgroundColor: '#fff',
  },
  skipTxt:  { fontSize: 14, fontWeight: '600', color: '#374151' },
  skipNote: { fontSize: 11, color: '#9ca3af' },
});
