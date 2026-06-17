import { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getUser, updateUser } from '@/services/user-api';
import { useAuth } from '@/context/auth-context';
import { ImagePickerSheet } from '@/components/image-picker-sheet';
import { useAppColors, type AppColors } from '@/hooks/use-app-colors';

interface Props {
  visible: boolean;
  onClose: () => void;
  onUpdated: (name: string) => void;
}

export function EditProfileModal({ visible, onClose, onUpdated }: Props) {
  const { session } = useAuth();
  const c = useAppColors();
  const s = makeStyles(c);

  const [name,        setName]        = useState('');
  const [email,       setEmail]       = useState('');
  const [phone,       setPhone]       = useState('');
  const [imageUrl,    setImageUrl]    = useState('');
  const [loading,     setLoading]     = useState(false);
  const [fetching,    setFetching]    = useState(false);
  const [pickerOpen,  setPickerOpen]  = useState(false);
  const [error,       setError]       = useState('');

  useEffect(() => {
    if (!visible || !session?.userId) return;
    setFetching(true);
    setError('');
    getUser(session.userId)
      .then((u) => {
        setName(u.name);
        setEmail(u.email ?? '');
        setPhone(u.phone);
        setImageUrl(u.imageUrl ?? '');
      })
      .catch(() => setError('Could not load profile. Check UserSvc is running.'))
      .finally(() => setFetching(false));
  }, [visible, session?.userId]);

  async function handleIconPick(uri: string) {
    if (!session?.userId) return;
    setImageUrl(uri);
    try {
      await updateUser(session.userId, { imageUrl: uri });
    } catch {
      // Non-fatal — icon shows locally even if save fails
    }
  }

  async function handleSave() {
    if (!session?.userId || !name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const updated = await updateUser(session.userId, {
        name:     name.trim(),
        email:    email.trim() || undefined,
        imageUrl: imageUrl || undefined,
      });
      onUpdated(updated.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save. Try again.');
    } finally {
      setLoading(false);
    }
  }

  const initials = name.trim().split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '??';

  return (
    <>
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.root}>

          <Pressable style={[StyleSheet.absoluteFill, s.backdrop]} onPress={onClose} />

          <View style={s.sheet}>
            <SafeAreaView edges={['bottom']}>

              <View style={s.handle} />

              <View style={s.header}>
                <Text style={s.title}>Personal Info</Text>
                <Pressable style={s.closeBtn} onPress={onClose}>
                  <Text style={s.closeTxt}>✕</Text>
                </Pressable>
              </View>

              {fetching ? (
                <View style={s.center}>
                  <ActivityIndicator color="#2d7a47" />
                  <Text style={s.loadingTxt}>Loading profile…</Text>
                </View>
              ) : (
                <ScrollView
                  contentContainerStyle={s.body}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}>

                  {/* Avatar — tappable to change photo */}
                  <View style={s.avatarWrap}>
                    <Pressable style={s.avatarPressable} onPress={() => setPickerOpen(true)}>
                      {imageUrl
                        ? <Image source={{ uri: imageUrl }} style={s.avatarImg} />
                        : (
                          <View style={s.avatar}>
                            <Text style={s.avatarTxt}>{initials}</Text>
                          </View>
                        )}
                      <View style={s.cameraBadge}>
                        <Text style={s.cameraIcon}>📷</Text>
                      </View>
                    </Pressable>
                    <Text style={s.avatarHint}>Tap to change photo</Text>
                  </View>

                  {/* Phone — read only */}
                  <View style={s.field}>
                    <Text style={s.label}>Phone Number</Text>
                    <View style={s.readOnlyWrap}>
                      <Text style={s.readOnlyFlag}>🇮🇳</Text>
                      <Text style={s.readOnlyTxt}>{phone}</Text>
                      <View style={s.lockedPill}>
                        <Text style={s.lockedTxt}>Cannot change</Text>
                      </View>
                    </View>
                  </View>

                  {/* Name */}
                  <View style={s.field}>
                    <Text style={s.label}>Full Name *</Text>
                    <TextInput
                      style={s.input}
                      value={name}
                      onChangeText={(t) => { setName(t); setError(''); }}
                      placeholder="Your full name"
                      placeholderTextColor={c.textFaint}
                      autoCapitalize="words"
                      returnKeyType="next"
                      editable={!loading}
                    />
                  </View>

                  {/* Email */}
                  <View style={s.field}>
                    <Text style={s.label}>Email <Text style={s.optional}>(optional)</Text></Text>
                    <TextInput
                      style={s.input}
                      value={email}
                      onChangeText={(t) => { setEmail(t); setError(''); }}
                      placeholder="you@example.com"
                      placeholderTextColor={c.textFaint}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      returnKeyType="done"
                      onSubmitEditing={handleSave}
                      editable={!loading}
                    />
                  </View>

                  {error ? (
                    <View style={s.errorBox}>
                      <Text style={s.errorTxt}>{error}</Text>
                    </View>
                  ) : null}

                </ScrollView>
              )}

              {!fetching && (
                <View style={s.footer}>
                  <Pressable style={s.cancelBtn} onPress={onClose} disabled={loading}>
                    <Text style={s.cancelTxt}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[s.saveBtn, (!name.trim() || loading) && s.saveBtnDisabled]}
                    onPress={handleSave}
                    disabled={!name.trim() || loading}>
                    {loading
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={s.saveTxt}>Save Changes</Text>}
                  </Pressable>
                </View>
              )}

            </SafeAreaView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>

    <ImagePickerSheet
      visible={pickerOpen}
      title="Profile Photo"
      sizeHint="400 × 400 px  ·  1:1 square"
      aspect={[1, 1]}
      onPick={handleIconPick}
      onClose={() => setPickerOpen(false)}
    />
    </>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    flex: { flex: 1 },
    root:     { flex: 1, justifyContent: 'flex-end' },
    backdrop: { backgroundColor: 'rgba(0,0,0,0.45)' },

    sheet: {
      backgroundColor: c.bg,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingTop: 10,
      maxHeight: '90%',
    },

    handle: {
      width: 40, height: 4, borderRadius: 2,
      backgroundColor: c.border, alignSelf: 'center', marginBottom: 12,
    },

    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 20, paddingBottom: 16,
      borderBottomWidth: 1, borderBottomColor: c.borderLight,
    },
    title:    { flex: 1, fontSize: 17, fontWeight: '700', color: c.text },
    closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.bgSubtle, alignItems: 'center', justifyContent: 'center' },
    closeTxt: { fontSize: 12, color: c.textMuted, fontWeight: '700' },

    center:     { padding: 40, alignItems: 'center', gap: 10 },
    loadingTxt: { fontSize: 13, color: c.textMuted },

    body: { padding: 20 },

    avatarWrap:     { alignItems: 'center', paddingVertical: 16 },
    avatarPressable: { position: 'relative' },
    avatar: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: '#2d7a47',
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 3, borderColor: c.primaryBorder,
    },
    avatarImg: {
      width: 80, height: 80, borderRadius: 40,
      borderWidth: 3, borderColor: c.primaryBorder,
    },
    avatarTxt:  { fontSize: 28, fontWeight: '800', color: '#fff' },
    cameraBadge: {
      position: 'absolute', bottom: 0, right: 0,
      width: 28, height: 28, borderRadius: 14,
      backgroundColor: c.bg,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 2, borderColor: c.border,
      shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 4, elevation: 3,
    },
    cameraIcon:  { fontSize: 14 },
    avatarHint:  { fontSize: 11, color: c.textFaint, marginTop: 6 },

    field:    { marginBottom: 16 },
    label:    { fontSize: 12, fontWeight: '700', color: c.textSub, marginBottom: 7 },
    optional: { fontWeight: '400', color: c.textFaint },

    readOnlyWrap: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      borderWidth: 1.5, borderColor: c.border, borderRadius: 14,
      paddingHorizontal: 14, paddingVertical: 13,
      backgroundColor: c.bgScreen,
    },
    readOnlyFlag: { fontSize: 18 },
    readOnlyTxt:  { flex: 1, fontSize: 15, color: c.textMuted, fontWeight: '500' },
    lockedPill: {
      backgroundColor: c.bgSubtle, borderRadius: 99,
      paddingHorizontal: 8, paddingVertical: 3,
    },
    lockedTxt: { fontSize: 10, color: c.textFaint, fontWeight: '600' },

    input: {
      borderWidth: 1.5, borderColor: c.border, borderRadius: 14,
      paddingHorizontal: 16, paddingVertical: 14,
      fontSize: 15, color: c.text, backgroundColor: c.bgScreen,
    },

    errorBox: {
      backgroundColor: c.errorBg, borderRadius: 10, padding: 12,
      borderWidth: 1, borderColor: c.errorBorder, marginTop: 4,
    },
    errorTxt: { fontSize: 12, color: c.errorText, lineHeight: 17 },

    footer: {
      flexDirection: 'row', gap: 10,
      paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
      borderTopWidth: 1, borderTopColor: c.borderLight,
    },
    cancelBtn: {
      flex: 1, borderWidth: 1.5, borderColor: c.border,
      borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    },
    cancelTxt: { fontSize: 14, fontWeight: '600', color: c.textSub },
    saveBtn: {
      flex: 2, backgroundColor: '#2d7a47',
      borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    },
    saveBtnDisabled: { opacity: 0.4 },
    saveTxt: { fontSize: 14, fontWeight: '800', color: '#fff' },
  });
}
