import { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, StyleSheet,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { getSeller, updateSeller, addDocument, removeDocument } from '@/services/user-api';

interface Props {
  visible: boolean;
  sellerId: string;
  currentFssai?: string;
  verified: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export function KycUploadModal({
  visible, sellerId, currentFssai, verified, onClose, onUpdated,
}: Props) {
  const [fssai,       setFssai]       = useState('');
  const [docs,        setDocs]        = useState<string[]>([]);
  const [newDocUrl,   setNewDocUrl]   = useState('');
  const [fetchingDocs, setFetchingDocs] = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [docLoading,  setDocLoading]  = useState(false);
  const [error,       setError]       = useState('');

  useEffect(() => {
    if (!visible) return;
    setFssai(currentFssai ?? '');
    setNewDocUrl('');
    setError('');
    setFetchingDocs(true);
    getSeller(sellerId)
      .then(s => setDocs(s.documentUrls ?? []))
      .catch(() => setDocs([]))
      .finally(() => setFetchingDocs(false));
  }, [visible, sellerId, currentFssai]);

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await updateSeller(sellerId, {
        fssaiNumber: fssai.trim() || undefined,
      });
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddDoc() {
    const url = newDocUrl.trim();
    if (!url) return;
    setDocLoading(true);
    setError('');
    try {
      const updated = await addDocument(sellerId, url);
      setDocs(updated.documentUrls ?? []);
      setNewDocUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add document.');
    } finally {
      setDocLoading(false);
    }
  }

  async function handleRemoveDoc(url: string) {
    setDocLoading(true);
    setError('');
    try {
      const updated = await removeDocument(sellerId, url);
      setDocs(updated.documentUrls ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove document.');
    } finally {
      setDocLoading(false);
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
            <Text style={s.headTitle}>KYC & Documents</Text>
            <Pressable style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeTxt}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* Verification status banner */}
            <View style={[s.statusBanner, { backgroundColor: verified ? '#f0fdf4' : '#fffbeb' }]}>
              <Text style={{ fontSize: 24 }}>{verified ? '✅' : '⏳'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.statusTitle, { color: verified ? '#166534' : '#92400e' }]}>
                  {verified ? 'KYC Verified' : 'Verification Pending'}
                </Text>
                <Text style={[s.statusSub, { color: verified ? '#15803d' : '#78350f' }]}>
                  {verified
                    ? 'Your account is verified and fully eligible for payouts.'
                    : 'Submit your FSSAI number and supporting documents. Admin reviews within 48 hours.'}
                </Text>
              </View>
            </View>

            {/* FSSAI */}
            <View style={s.field}>
              <Text style={s.label}>FSSAI License Number</Text>
              <TextInput
                style={s.input}
                value={fssai}
                onChangeText={setFssai}
                placeholder="e.g. 10019042000112"
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
                maxLength={14}
                editable={!saving}
              />
              <Text style={s.fieldHint}>14-digit number from your FSSAI food license certificate</Text>
            </View>

            {/* Documents */}
            <View style={s.field}>
              <Text style={s.label}>Supporting Documents</Text>

              {fetchingDocs ? (
                <ActivityIndicator size="small" color="#2d7a47" style={{ marginTop: 8, marginBottom: 8 }} />
              ) : docs.length > 0 ? (
                <View style={s.docList}>
                  {docs.map((url, i) => (
                    <View key={i} style={s.docRow}>
                      <Text style={s.docIcon}>📄</Text>
                      <Text style={s.docUrl} numberOfLines={1}>{url}</Text>
                      <Pressable
                        style={s.removeBtn}
                        onPress={() => handleRemoveDoc(url)}
                        disabled={docLoading}>
                        <Text style={s.removeTxt}>✕</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={s.emptyDocs}>No documents uploaded yet</Text>
              )}

              {/* Add doc URL row */}
              <View style={s.addDocRow}>
                <TextInput
                  style={s.addDocInput}
                  value={newDocUrl}
                  onChangeText={setNewDocUrl}
                  placeholder="Paste document URL (Google Drive, Dropbox…)"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!docLoading}
                />
                <Pressable
                  style={[s.addBtn, (!newDocUrl.trim() || docLoading) && s.addBtnDisabled]}
                  onPress={handleAddDoc}
                  disabled={!newDocUrl.trim() || docLoading}>
                  <Text style={s.addBtnTxt}>{docLoading ? '…' : 'Add'}</Text>
                </Pressable>
              </View>

              <View style={s.uploadHint}>
                <Text style={s.uploadHintIcon}>📸</Text>
                <Text style={s.uploadHintTxt}>
                  Camera & gallery upload coming soon. For now, host your document on Google Drive or Dropbox and paste the shareable link above.
                </Text>
              </View>
            </View>

            {/* Accepted docs list */}
            <View style={s.acceptedCard}>
              <Text style={s.acceptedTitle}>Accepted Documents</Text>
              {[
                'Aadhaar Card (both sides)',
                'PAN Card',
                'FSSAI License Certificate',
                'Bank account statement / passbook',
                'GST Certificate (if applicable)',
              ].map((doc) => (
                <View key={doc} style={s.acceptedRow}>
                  <Text style={s.acceptedDot}>•</Text>
                  <Text style={s.acceptedTxt}>{doc}</Text>
                </View>
              ))}
            </View>

            {error ? (
              <View style={s.errorBox}>
                <Text style={s.errorTxt}>{error}</Text>
              </View>
            ) : null}

          </ScrollView>

          <View style={s.footer}>
            <Pressable style={s.cancelBtn} onPress={onClose} disabled={saving}>
              <Text style={s.cancelTxt}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[s.saveBtn, saving && s.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}>
              <Text style={s.saveTxt}>{saving ? 'Saving…' : 'Save'}</Text>
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

  body: { padding: 20 },

  statusBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statusTitle: { fontSize: 13, fontWeight: '700', marginBottom: 3 },
  statusSub: { fontSize: 11, lineHeight: 16 },

  field: { marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  fieldHint: { fontSize: 11, color: '#9ca3af', marginTop: 5 },

  docList: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 10,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  docIcon: { fontSize: 16 },
  docUrl: { flex: 1, fontSize: 11, color: '#374151' },
  removeBtn: {
    width: 24, height: 24,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  removeTxt: { fontSize: 10, color: '#dc2626', fontWeight: '700' },

  emptyDocs: { fontSize: 12, color: '#9ca3af', marginBottom: 10 },

  addDocRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 10 },
  addDocInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  addBtn: {
    backgroundColor: '#2d7a47',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  addBtnDisabled: { opacity: 0.4 },
  addBtnTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },

  uploadHint: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 10,
    alignItems: 'flex-start',
  },
  uploadHintIcon: { fontSize: 16 },
  uploadHintTxt: { flex: 1, fontSize: 11, color: '#6b7280', lineHeight: 16 },

  acceptedCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    gap: 6,
    marginBottom: 8,
  },
  acceptedTitle: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 4 },
  acceptedRow: { flexDirection: 'row', gap: 8 },
  acceptedDot: { fontSize: 12, color: '#9ca3af' },
  acceptedTxt: { fontSize: 11, color: '#6b7280', lineHeight: 17 },

  errorBox: {
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#fca5a5',
    marginBottom: 8,
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
