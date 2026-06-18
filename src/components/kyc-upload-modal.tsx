import { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, StyleSheet,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { getSeller, updateSeller, addDocument, removeDocument } from '@/services/user-api';
import type { SellerType } from '@/services/user-api';
import { useLanguage } from '@/context/language-context';
import { useAppColors, type AppColors } from '@/hooks/use-app-colors';

// FSSAI is required only for food/edible seller types
const EDIBLE_TYPES: SellerType[] = ['farmer', 'dairy', 'homefood'];

// FSSAI: 14 digits · digits 1–2 = state code (01–38) · digit 3 = license type (1/2/3)
const FSSAI_REGEX = /^\d{14}$/;
function validateFssai(v: string): string | null {
  if (!v) return null;
  if (!FSSAI_REGEX.test(v)) return 'FSSAI must be exactly 14 digits';
  const state = parseInt(v.slice(0, 2), 10);
  if (state < 1 || state > 38) return 'Invalid state code in FSSAI number';
  const licType = v[2];
  if (!['1', '2', '3'].includes(licType)) return 'Invalid license type — digit 3 must be 1, 2, or 3';
  return null;
}

// GST: 15-char format — 2 state digits + 5 PAN alpha + 4 PAN digits + entity + Z + checksum
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
function validateGst(v: string): string | null {
  if (!v) return null;
  if (v.length !== 15) return 'GST number must be exactly 15 characters';
  if (!GST_REGEX.test(v)) return 'Invalid GST number format';
  return null;
}

interface Props {
  visible: boolean;
  sellerId: string;
  storeType: SellerType;
  currentFssai?: string;
  currentGst?: string;
  verified: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export function KycUploadModal({
  visible, sellerId, storeType, currentFssai, currentGst, verified, onClose, onUpdated,
}: Props) {
  const { t } = useLanguage();
  const c = useAppColors();
  const s = makeStyles(c);
  const isEdible = EDIBLE_TYPES.includes(storeType);

  const [fssai,         setFssai]         = useState('');
  const [gst,           setGst]           = useState('');
  const [docs,          setDocs]          = useState<string[]>([]);
  const [newDocUrl,     setNewDocUrl]     = useState('');
  const [fetchingDocs,  setFetchingDocs]  = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [docLoading,    setDocLoading]    = useState(false);
  const [error,         setError]         = useState('');

  const fssaiError = validateFssai(fssai);
  const gstError   = validateGst(gst.toUpperCase());
  const fssaiValid = fssai.length === 14 && !fssaiError;
  const gstValid   = gst.length === 15 && !gstError;

  useEffect(() => {
    if (!visible) return;
    setFssai(currentFssai ?? '');
    setGst(currentGst ?? '');
    setNewDocUrl('');
    setError('');
    setFetchingDocs(true);
    getSeller(sellerId)
      .then(s => setDocs(s.documentUrls ?? []))
      .catch(() => setDocs([]))
      .finally(() => setFetchingDocs(false));
  }, [visible, sellerId, currentFssai, currentGst]);

  async function handleSave() {
    setError('');
    if (isEdible && fssai && fssaiError) { setError(fssaiError); return; }
    if (gst && gstError) { setError(gstError); return; }
    setSaving(true);
    try {
      await updateSeller(sellerId, {
        ...(isEdible ? { fssaiNumber: fssai.trim() || undefined } : {}),
        gstNumber: gst.trim().toUpperCase() || undefined,
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
            <Text style={s.headTitle}>{t('kyc_title')}</Text>
            <Pressable style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeTxt}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* Verification status banner */}
            <View style={[s.statusBanner, { backgroundColor: verified ? c.primaryBg : c.warningBg }]}>
              <Text style={{ fontSize: 24 }}>{verified ? '✅' : '⏳'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.statusTitle, { color: verified ? c.primaryText : c.warningText }]}>
                  {verified ? t('kyc_verified_title') : t('kyc_pending_title')}
                </Text>
                <Text style={[s.statusSub, { color: verified ? c.primaryText : c.warningText }]}>
                  {verified ? t('kyc_verified_sub') : t('kyc_pending_sub')}
                </Text>
              </View>
            </View>

            {/* FSSAI — edible seller types only */}
            {isEdible && (
              <View style={s.field}>
                <View style={s.labelRow}>
                  <Text style={s.label}>{t('kyc_fssai_label')}</Text>
                  {fssaiValid && <Text style={s.validBadge}>✓ Valid format</Text>}
                  {fssai.length > 0 && !fssaiValid && fssaiError && (
                    <Text style={s.invalidBadge}>✕ {fssaiError}</Text>
                  )}
                </View>
                <TextInput
                  style={[s.input, fssai.length > 0 && fssaiError ? s.inputError : fssaiValid ? s.inputValid : null]}
                  value={fssai}
                  onChangeText={setFssai}
                  placeholder="e.g. 10019042000112"
                  placeholderTextColor={c.textFaint}
                  keyboardType="number-pad"
                  maxLength={14}
                  editable={!saving}
                />
                <Text style={s.fieldHint}>{t('kyc_fssai_hint')}</Text>
              </View>
            )}

            {/* GST Number — all seller types */}
            <View style={s.field}>
              <View style={s.labelRow}>
                <Text style={s.label}>GST Number</Text>
                {gstValid && <Text style={s.validBadge}>✓ Valid format</Text>}
                {gst.length > 0 && !gstValid && gstError && (
                  <Text style={s.invalidBadge}>✕ {gstError}</Text>
                )}
              </View>
              <TextInput
                style={[s.input, s.monoInput, gst.length > 0 && gstError ? s.inputError : gstValid ? s.inputValid : null]}
                value={gst}
                onChangeText={v => setGst(v.toUpperCase())}
                placeholder="e.g. 29ABCDE1234F1Z5"
                placeholderTextColor={c.textFaint}
                autoCapitalize="characters"
                maxLength={15}
                editable={!saving}
              />
              <Text style={s.fieldHint}>15-character GST Identification Number (GSTIN) — optional</Text>
            </View>

            {/* Documents */}
            <View style={s.field}>
              <Text style={s.label}>{t('kyc_docs_label')}</Text>

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
                <Text style={s.emptyDocs}>{t('kyc_no_docs')}</Text>
              )}

              <View style={s.addDocRow}>
                <TextInput
                  style={s.addDocInput}
                  value={newDocUrl}
                  onChangeText={setNewDocUrl}
                  placeholder={t('kyc_doc_url_ph')}
                  placeholderTextColor={c.textFaint}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!docLoading}
                />
                <Pressable
                  style={[s.addBtn, (!newDocUrl.trim() || docLoading) && s.addBtnDisabled]}
                  onPress={handleAddDoc}
                  disabled={!newDocUrl.trim() || docLoading}>
                  <Text style={s.addBtnTxt}>{docLoading ? '…' : t('kyc_doc_add')}</Text>
                </Pressable>
              </View>

              <View style={s.uploadHint}>
                <Text style={s.uploadHintIcon}>📸</Text>
                <Text style={s.uploadHintTxt}>{t('kyc_upload_hint')}</Text>
              </View>
            </View>

            {/* Accepted docs list */}
            <View style={s.acceptedCard}>
              <Text style={s.acceptedTitle}>{t('kyc_accepted_title')}</Text>
              {([
                t('kyc_accepted_1'),
                t('kyc_accepted_2'),
                t('kyc_accepted_3'),
                t('kyc_accepted_4'),
                t('kyc_accepted_5'),
              ] as string[]).map((doc) => (
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
              <Text style={s.cancelTxt}>{t('decline_cancel')}</Text>
            </Pressable>
            <Pressable
              style={[s.saveBtn, saving && s.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}>
              <Text style={s.saveTxt}>{saving ? t('kyc_saving') : t('kyc_save')}</Text>
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
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    label: { fontSize: 12, fontWeight: '600', color: c.textSub },
    validBadge: {
      fontSize: 10, fontWeight: '700',
      color: '#166534', backgroundColor: '#dcfce7',
      borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2,
    },
    invalidBadge: {
      fontSize: 10, fontWeight: '600',
      color: c.errorText, backgroundColor: c.errorBg,
      borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2,
      flex: 1,
    },
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
    monoInput: {
      fontFamily: 'monospace',
      letterSpacing: 1,
    },
    inputError: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
    inputValid: { borderColor: '#2d7a47', backgroundColor: c.primaryBg },
    fieldHint: { fontSize: 11, color: c.textFaint, marginTop: 5 },

    docList: {
      borderWidth: 1,
      borderColor: c.border,
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
      borderBottomColor: c.borderLight,
    },
    docIcon: { fontSize: 16 },
    docUrl: { flex: 1, fontSize: 11, color: c.textSub },
    removeBtn: {
      width: 24, height: 24,
      backgroundColor: c.errorBg,
      borderRadius: 12,
      alignItems: 'center', justifyContent: 'center',
    },
    removeTxt: { fontSize: 10, color: c.errorText, fontWeight: '700' },

    emptyDocs: { fontSize: 12, color: c.textFaint, marginBottom: 10 },

    addDocRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 10 },
    addDocInput: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 12,
      color: c.text,
      backgroundColor: c.bgScreen,
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
      backgroundColor: c.bgScreen,
      borderRadius: 10,
      padding: 10,
      alignItems: 'flex-start',
    },
    uploadHintIcon: { fontSize: 16 },
    uploadHintTxt: { flex: 1, fontSize: 11, color: c.textMuted, lineHeight: 16 },

    acceptedCard: {
      backgroundColor: c.bgScreen,
      borderRadius: 12,
      padding: 14,
      gap: 6,
      marginBottom: 8,
    },
    acceptedTitle: { fontSize: 12, fontWeight: '700', color: c.textSub, marginBottom: 4 },
    acceptedRow: { flexDirection: 'row', gap: 8 },
    acceptedDot: { fontSize: 12, color: c.textFaint },
    acceptedTxt: { fontSize: 11, color: c.textMuted, lineHeight: 17 },

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
    cancelTxt: { fontSize: 14, fontWeight: '600', color: c.textSub },
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
}
