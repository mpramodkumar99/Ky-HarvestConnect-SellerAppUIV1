import { useState } from 'react';
import {
  Modal, View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PendingInvite } from '@/services/user-api';
import { useStore } from '@/context/store-context';
import { ROLE_CONFIG } from '@/context/store-context';
import { useAppColors, type AppColors } from '@/hooks/use-app-colors';

interface Props {
  visible: boolean;
  onDone: () => void;
}

export function PendingInviteModal({ visible, onDone }: Props) {
  const { pendingInvites, acceptInvite, declineInvite } = useStore();
  const c = useAppColors();
  const s = makeStyles(c);
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

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bgScreen },

    header: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20,
      backgroundColor: c.bg,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    logoRing: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: '#2d7a47', alignItems: 'center', justifyContent: 'center',
    },
    logoIcon: { fontSize: 22 },
    title: { fontSize: 18, fontWeight: '800', color: c.text },
    sub:   { fontSize: 12, color: c.textMuted, marginTop: 1 },

    list: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },

    card: {
      backgroundColor: c.bg,
      borderRadius: 16,
      borderWidth: 1, borderColor: c.border,
      overflow: 'hidden',
    },
    cardTop: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      padding: 16, borderBottomWidth: 1, borderBottomColor: c.borderLight,
    },
    storeIcon: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: c.primaryBg, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: c.primaryBorder,
    },
    storeIconTxt: { fontSize: 20 },
    storeName:    { fontSize: 15, fontWeight: '700', color: c.text },
    invitedAt:    { fontSize: 11, color: c.textFaint, marginTop: 2 },
    rolePill:     { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
    rolePillTxt:  { fontSize: 11, fontWeight: '700' },

    roleDesc: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: c.bgScreen },
    roleDescTxt: { fontSize: 12, color: c.textMuted, lineHeight: 17 },

    cardActions: {
      flexDirection: 'row', gap: 10,
      padding: 14, borderTopWidth: 1, borderTopColor: c.borderLight,
    },
    declineBtn: {
      flex: 1, paddingVertical: 12, borderRadius: 12,
      borderWidth: 1.5, borderColor: c.borderMid, alignItems: 'center',
    },
    declineTxt: { fontSize: 13, fontWeight: '600', color: c.textSub },
    acceptBtn: {
      flex: 2, paddingVertical: 12, borderRadius: 12,
      backgroundColor: '#2d7a47', alignItems: 'center',
    },
    acceptTxt:   { fontSize: 13, fontWeight: '700', color: '#fff' },
    btnDisabled: { opacity: 0.5 },

    errorBox: {
      marginHorizontal: 20, marginBottom: 8,
      backgroundColor: c.errorBg, borderRadius: 10, padding: 12,
      borderWidth: 1, borderColor: c.errorBorder,
    },
    errorTxt: { fontSize: 12, color: c.errorText },

    footer: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8, gap: 8, alignItems: 'center' },
    skipBtn: {
      width: '100%', paddingVertical: 13, borderRadius: 14,
      borderWidth: 1.5, borderColor: c.borderMid, alignItems: 'center',
      backgroundColor: c.bg,
    },
    skipTxt:  { fontSize: 14, fontWeight: '600', color: c.textSub },
    skipNote: { fontSize: 11, color: c.textFaint },
  });
}
