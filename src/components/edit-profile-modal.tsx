import { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getUser, updateUser } from '@/services/user-api';
import { useAuth } from '@/context/auth-context';

interface Props {
  visible: boolean;
  onClose: () => void;
  onUpdated: (name: string) => void;
}

export function EditProfileModal({ visible, onClose, onUpdated }: Props) {
  const { session } = useAuth();

  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [phone,    setPhone]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    if (!visible || !session?.userId) return;
    setFetching(true);
    setError('');
    getUser(session.userId)
      .then((u) => {
        setName(u.name);
        setEmail(u.email ?? '');
        setPhone(u.phone);
      })
      .catch(() => setError('Could not load profile. Check UserSvc is running.'))
      .finally(() => setFetching(false));
  }, [visible, session?.userId]);

  async function handleSave() {
    if (!session?.userId || !name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const updated = await updateUser(session.userId, {
        name:  name.trim(),
        email: email.trim() || undefined,
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
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.root}>

          {/* Backdrop — absoluteFill so it doesn't consume flex height */}
          <Pressable style={[StyleSheet.absoluteFill, s.backdrop]} onPress={onClose} />

          {/* Sheet */}
          <View style={s.sheet}>
            <SafeAreaView edges={['bottom']}>

              {/* Handle */}
              <View style={s.handle} />

              {/* Header */}
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

                  {/* Avatar initials */}
                  <View style={s.avatarWrap}>
                    <View style={s.avatar}>
                      <Text style={s.avatarTxt}>{initials}</Text>
                    </View>
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
                      placeholderTextColor="#9ca3af"
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
                      placeholderTextColor="#9ca3af"
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

              {/* Footer */}
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
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },

  root:    { flex: 1, justifyContent: 'flex-end' },
  backdrop:{ backgroundColor: 'rgba(0,0,0,0.45)' },

  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 10,
    maxHeight: '90%',
  },

  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#e5e7eb', alignSelf: 'center', marginBottom: 12,
  },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  title:    { flex: 1, fontSize: 17, fontWeight: '700', color: '#111827' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  closeTxt: { fontSize: 12, color: '#6b7280', fontWeight: '700' },

  center:     { padding: 40, alignItems: 'center', gap: 10 },
  loadingTxt: { fontSize: 13, color: '#6b7280' },

  body: { padding: 20 },

  avatarWrap: { alignItems: 'center', paddingVertical: 16 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#2d7a47',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#bbf7d0',
  },
  avatarTxt: { fontSize: 26, fontWeight: '800', color: '#fff' },

  field:    { marginBottom: 16 },
  label:    { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 7 },
  optional: { fontWeight: '400', color: '#9ca3af' },

  readOnlyWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 13,
    backgroundColor: '#f9fafb',
  },
  readOnlyFlag: { fontSize: 18 },
  readOnlyTxt:  { flex: 1, fontSize: 15, color: '#6b7280', fontWeight: '500' },
  lockedPill: {
    backgroundColor: '#f3f4f6', borderRadius: 99,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  lockedTxt: { fontSize: 10, color: '#9ca3af', fontWeight: '600' },

  input: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#111827', backgroundColor: '#fff',
  },

  errorBox: {
    backgroundColor: '#fff5f5', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#fca5a5', marginTop: 4,
  },
  errorTxt: { fontSize: 12, color: '#dc2626', lineHeight: 17 },

  footer: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
    borderTopWidth: 1, borderTopColor: '#f3f4f6',
  },
  cancelBtn: {
    flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb',
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
  cancelTxt: { fontSize: 14, fontWeight: '600', color: '#374151' },
  saveBtn: {
    flex: 2, backgroundColor: '#2d7a47',
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveTxt: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
