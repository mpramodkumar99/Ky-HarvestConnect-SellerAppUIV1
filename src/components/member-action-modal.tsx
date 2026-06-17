import { useState } from 'react';
import {
  Modal, View, Text, Pressable, StyleSheet, ActivityIndicator,
} from 'react-native';
import { updateMemberRole, removeMember } from '@/services/user-api';
import type { SellerRole } from '@/services/user-api';
import type { TeamMember } from '@/context/store-context';
import { ROLE_CONFIG } from '@/context/store-context';
import { useAppColors, type AppColors } from '@/hooks/use-app-colors';

const ROLE_OPTIONS: { value: Exclude<SellerRole, 'owner'>; label: string; desc: string }[] = [
  { value: 'manager', label: 'Manager', desc: 'Edit products & view analytics' },
  { value: 'staff',   label: 'Staff',   desc: 'Process orders only' },
];

interface Props {
  visible: boolean;
  member: TeamMember | null;
  sellerId: string;
  onClose: () => void;
  onUpdated: () => void;
}

export function MemberActionModal({ visible, member, sellerId, onClose, onUpdated }: Props) {
  const c = useAppColors();
  const s = makeStyles(c);
  const [role,        setRole]        = useState<Exclude<SellerRole, 'owner'>>('manager');
  const [saving,      setSaving]      = useState(false);
  const [removing,    setRemoving]    = useState(false);
  const [confirmMode, setConfirmMode] = useState(false);
  const [error,       setError]       = useState('');

  // Sync role picker to member when opened
  function onShow() {
    if (member && member.role !== 'owner') {
      setRole(member.role as Exclude<SellerRole, 'owner'>);
    }
    setConfirmMode(false);
    setError('');
  }

  if (!member) return null;

  const isOwner    = member.role === 'owner';
  const roleChanged = !isOwner && role !== member.role;

  async function handleSaveRole() {
    if (!roleChanged || saving) return;
    setSaving(true);
    setError('');
    try {
      await updateMemberRole(sellerId, member.id, { role });
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (removing) return;
    setRemoving(true);
    setError('');
    try {
      await removeMember(sellerId, member.id);
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member.');
    } finally {
      setRemoving(false);
    }
  }

  const rc = ROLE_CONFIG[member.role];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onShow={onShow}
      onRequestClose={onClose}>
      <View style={s.container}>
        <Pressable style={[StyleSheet.absoluteFill, s.backdrop]} onPress={onClose} />
        <View style={s.sheet}>

          {/* Header */}
          <View style={s.head}>
            <View style={s.memberAvatar}>
              <Text style={s.memberAvatarTxt}>{member.avatar}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.memberName}>{member.name}</Text>
              <Text style={s.memberPhone}>{member.phone}</Text>
            </View>
            <View style={[s.rolePill, { backgroundColor: rc.bg }]}>
              <Text style={[s.rolePillTxt, { color: rc.color }]}>{rc.label}</Text>
            </View>
            <Pressable style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeTxt}>✕</Text>
            </Pressable>
          </View>

          {confirmMode ? (
            /* Remove confirm view */
            <View style={s.body}>
              <View style={s.confirmBox}>
                <Text style={s.confirmTitle}>Remove {member.name}?</Text>
                <Text style={s.confirmSub}>
                  They'll lose access to this store immediately. This cannot be undone.
                </Text>
              </View>
              {error ? <View style={s.errorBox}><Text style={s.errorTxt}>{error}</Text></View> : null}
              <View style={s.footer}>
                <Pressable style={s.cancelBtn} onPress={() => setConfirmMode(false)} disabled={removing}>
                  <Text style={s.cancelTxt}>Cancel</Text>
                </Pressable>
                <Pressable style={s.removeConfirmBtn} onPress={handleRemove} disabled={removing}>
                  {removing
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={s.removeConfirmTxt}>Yes, Remove</Text>}
                </Pressable>
              </View>
            </View>
          ) : (
            /* Default: role change view */
            <View style={s.body}>
              {isOwner ? (
                <View style={s.ownerNote}>
                  <Text style={s.ownerNoteTxt}>
                    Store owners cannot have their role changed here. Transfer ownership in Store Settings.
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={s.sectionLabel}>Change Role</Text>
                  <View style={s.roleRow}>
                    {ROLE_OPTIONS.map(opt => (
                      <Pressable
                        key={opt.value}
                        style={[s.roleChip, role === opt.value && s.roleChipActive]}
                        onPress={() => setRole(opt.value)}
                        disabled={saving}>
                        <Text style={[s.roleLabel, role === opt.value && s.roleLabelActive]}>
                          {opt.label}
                        </Text>
                        <Text style={[s.roleDesc, role === opt.value && s.roleDescActive]}>
                          {opt.desc}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              {error ? <View style={s.errorBox}><Text style={s.errorTxt}>{error}</Text></View> : null}

              {/* Remove button — always shown for non-owners */}
              {!isOwner && (
                <Pressable style={s.removeBtn} onPress={() => setConfirmMode(true)} disabled={saving}>
                  <Text style={s.removeTxt}>Remove from store</Text>
                </Pressable>
              )}

              {!isOwner && (
                <View style={s.footer}>
                  <Pressable style={s.cancelBtn} onPress={onClose} disabled={saving}>
                    <Text style={s.cancelTxt}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[s.saveBtn, (!roleChanged || saving) && s.saveBtnDisabled]}
                    onPress={handleSaveRole}
                    disabled={!roleChanged || saving}>
                    {saving
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={s.saveTxt}>Save Role</Text>}
                  </Pressable>
                </View>
              )}
            </View>
          )}

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
    },

    head: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
      borderBottomWidth: 1, borderBottomColor: c.borderLight,
    },
    memberAvatar: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: c.primaryBgStrong, alignItems: 'center', justifyContent: 'center',
    },
    memberAvatarTxt: { fontSize: 16, fontWeight: '700', color: c.primaryText },
    memberName:  { fontSize: 15, fontWeight: '700', color: c.text },
    memberPhone: { fontSize: 12, color: c.textMuted, marginTop: 1 },
    rolePill: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
    rolePillTxt: { fontSize: 11, fontWeight: '700' },
    closeBtn: {
      width: 32, height: 32, backgroundColor: c.bgSubtle,
      borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    },
    closeTxt: { fontSize: 13, color: c.textSub, fontWeight: '700' },

    body: { padding: 20, gap: 14 },

    sectionLabel: { fontSize: 12, fontWeight: '700', color: c.textSub, textTransform: 'uppercase', letterSpacing: 0.4 },

    roleRow: { flexDirection: 'row', gap: 10 },
    roleChip: {
      flex: 1, borderWidth: 1.5, borderColor: c.border,
      borderRadius: 12, padding: 12, backgroundColor: c.bgScreen,
    },
    roleChipActive: { borderColor: '#2d7a47', backgroundColor: c.primaryBg },
    roleLabel: { fontSize: 13, fontWeight: '700', color: c.textMuted },
    roleLabelActive: { color: c.primaryText },
    roleDesc: { fontSize: 10, color: c.textFaint, marginTop: 3, lineHeight: 14 },
    roleDescActive: { color: c.primaryLight },

    ownerNote: { backgroundColor: c.bgScreen, borderRadius: 12, padding: 16 },
    ownerNoteTxt: { fontSize: 13, color: c.textMuted, lineHeight: 19 },

    removeBtn: {
      borderWidth: 1.5, borderColor: c.errorBorder, borderRadius: 12,
      paddingVertical: 12, alignItems: 'center', backgroundColor: c.errorBg,
    },
    removeTxt: { fontSize: 13, fontWeight: '600', color: c.errorText },

    confirmBox: {
      backgroundColor: c.errorBg, borderRadius: 12, padding: 16, gap: 6,
      borderWidth: 1, borderColor: c.errorBorder,
    },
    confirmTitle: { fontSize: 15, fontWeight: '700', color: c.errorText },
    confirmSub:   { fontSize: 13, color: c.textMuted, lineHeight: 18 },

    errorBox: { backgroundColor: c.errorBg, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: c.errorBorder },
    errorTxt:  { fontSize: 12, color: c.errorText },

    footer: { flexDirection: 'row', gap: 10, paddingBottom: 8 },
    cancelBtn: {
      flex: 1, paddingVertical: 13, borderRadius: 12,
      borderWidth: 1.5, borderColor: c.borderMid, alignItems: 'center',
    },
    cancelTxt: { fontSize: 14, fontWeight: '600', color: c.textSub },
    saveBtn: {
      flex: 1, paddingVertical: 13, borderRadius: 12,
      backgroundColor: '#2d7a47', alignItems: 'center',
    },
    saveBtnDisabled: { opacity: 0.45 },
    saveTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
    removeConfirmBtn: {
      flex: 1, paddingVertical: 13, borderRadius: 12,
      backgroundColor: '#dc2626', alignItems: 'center',
    },
    removeConfirmTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  });
}
