import { Modal, View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { useToast } from '@/components/toast-provider';
import { useLanguage } from '@/context/language-context';
import { useAppColors, type AppColors } from '@/hooks/use-app-colors';
import type { BankAccount } from '@/services/user-api';

interface Props {
  visible: boolean;
  availableAmount: number;
  grossAmount: number;
  deliveredCount: number;
  bankAccount: BankAccount | null;
  onClose: () => void;
}

export function PayoutModal({
  visible, availableAmount, grossAmount, deliveredCount, bankAccount, onClose,
}: Props) {
  const { showToast } = useToast();
  const { t } = useLanguage();
  const c = useAppColors();
  const s = makeStyles(c);
  const commission = grossAmount - availableAmount;
  const canRequest = availableAmount > 0 && bankAccount !== null;

  function handleRequestPayout() {
    if (!bankAccount) {
      Alert.alert(t('payout_bank_required_title'), t('payout_bank_required_msg'), [{ text: 'OK' }]);
      return;
    }
    const last4 = bankAccount.accountNumber.replace(/\D/g, '').slice(-4);
    Alert.alert(
      t('payout_confirm_title'),
      `₹${availableAmount.toLocaleString('en-IN')} will be transferred to ${bankAccount.bankName} ···${last4} within 1 business day.`,
      [
        { text: t('payout_cancel'), style: 'cancel' },
        {
          text: t('payout_request_now'),
          onPress: () => { onClose(); showToast(t('payout_success_toast'), 'success'); },
        },
      ],
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={s.container}>
        <Pressable style={[StyleSheet.absoluteFill, s.backdrop]} onPress={onClose} />
        <View style={s.sheet}>

          <View style={s.head}>
            <Text style={s.headTitle}>{t('payout_title')}</Text>
            <Pressable style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeTxt}>✕</Text>
            </Pressable>
          </View>

          <View style={s.hero}>
            <Text style={s.heroLabel}>{t('payout_available_label')}</Text>
            <Text style={s.heroAmount}>₹{availableAmount.toLocaleString('en-IN')}</Text>
            <Text style={s.heroSub}>
              {deliveredCount} {deliveredCount !== 1 ? t('payout_delivered_orders_p') : t('payout_delivered_orders')} · {t('payout_delivered_after')}
            </Text>
          </View>

          <View style={s.body}>
            <View style={s.card}>
              <Text style={s.cardTitle}>{t('payout_breakdown')}</Text>
              <View style={s.bRow}>
                <Text style={s.bLabel}>{t('payout_order_revenue')}</Text>
                <Text style={s.bValue}>₹{grossAmount.toLocaleString('en-IN')}</Text>
              </View>
              <View style={[s.bRow, s.bRowBorder]}>
                <Text style={s.bLabel}>{t('payout_commission')}</Text>
                <Text style={[s.bValue, { color: c.errorText }]}>
                  − ₹{commission.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={[s.bRow, s.bRowBorder, s.bRowTotal]}>
                <Text style={s.bTotalLabel}>{t('payout_you_earn')}</Text>
                <Text style={s.bTotalValue}>₹{availableAmount.toLocaleString('en-IN')}</Text>
              </View>
            </View>

            <View style={s.card}>
              <Text style={s.cardTitle}>{t('payout_transfer_to')}</Text>
              {bankAccount ? (
                <View style={s.bankRow}>
                  <View style={s.bankIcon}>
                    <Text style={{ fontSize: 22 }}>🏦</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.bankName}>{bankAccount.bankName}</Text>
                    <Text style={s.bankDetail}>{bankAccount.accountNumber} · {bankAccount.ifscCode}</Text>
                    {bankAccount.upiId ? <Text style={s.bankDetail}>UPI: {bankAccount.upiId}</Text> : null}
                  </View>
                  <View style={s.verifiedPill}>
                    <Text style={s.verifiedTxt}>✓ {t('payout_verified')}</Text>
                  </View>
                </View>
              ) : (
                <View style={s.noBankRow}>
                  <Text style={{ fontSize: 22 }}>⚠️</Text>
                  <Text style={s.noBankTxt}>{t('payout_no_bank')}</Text>
                </View>
              )}
            </View>

            <View style={s.infoRow}>
              <Text style={{ fontSize: 16 }}>⏱️</Text>
              <Text style={s.infoTxt}>{t('payout_t1_info')}</Text>
            </View>

            {availableAmount === 0 && (
              <View style={s.zeroNote}>
                <Text style={{ fontSize: 16 }}>📭</Text>
                <Text style={s.zeroTxt}>{t('payout_no_orders')}</Text>
              </View>
            )}
          </View>

          <View style={s.footer}>
            <Pressable style={s.closeBtn2} onPress={onClose}>
              <Text style={s.closeTxt2}>{t('payout_close')}</Text>
            </Pressable>
            <Pressable
              style={[s.requestBtn, !canRequest && s.requestBtnDisabled]}
              onPress={handleRequestPayout}
              disabled={!canRequest}>
              <Text style={s.requestBtnTxt}>
                {availableAmount === 0 ? t('payout_no_balance') : t('payout_request_btn')}
              </Text>
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
    sheet: { backgroundColor: c.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },

    head: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14,
      borderBottomWidth: 1, borderBottomColor: c.borderLight,
    },
    headTitle: { fontSize: 17, fontWeight: '700', color: c.text },
    closeBtn: {
      width: 32, height: 32, backgroundColor: c.bgSubtle,
      borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    },
    closeTxt: { fontSize: 13, color: c.textSub, fontWeight: '700' },

    hero: { backgroundColor: '#1a4a28', paddingVertical: 28, alignItems: 'center', gap: 6 },
    heroLabel: { fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: '600', letterSpacing: 0.3 },
    heroAmount: { fontSize: 42, fontWeight: '800', color: '#fff' },
    heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },

    body: { padding: 16, gap: 12 },
    card: { backgroundColor: c.bg, borderRadius: 14, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
    cardTitle: {
      fontSize: 11, fontWeight: '700', color: c.textFaint,
      letterSpacing: 0.4, textTransform: 'uppercase',
      paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8,
    },

    bRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
    bRowBorder: { borderTopWidth: 1, borderTopColor: c.borderLight },
    bRowTotal: { backgroundColor: c.bgScreen },
    bLabel: { fontSize: 13, color: c.textMuted },
    bValue: { fontSize: 13, fontWeight: '600', color: c.text },
    bTotalLabel: { fontSize: 13, fontWeight: '700', color: c.text },
    bTotalValue: { fontSize: 15, fontWeight: '800', color: c.primary },

    bankRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
    bankIcon: { width: 44, height: 44, backgroundColor: c.primaryBg, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    bankName: { fontSize: 13, fontWeight: '700', color: c.text },
    bankDetail: { fontSize: 11, color: c.textMuted, marginTop: 2 },
    verifiedPill: { backgroundColor: '#dcfce7', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
    verifiedTxt: { fontSize: 10, fontWeight: '700', color: '#166534' },

    noBankRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14 },
    noBankTxt: { flex: 1, fontSize: 12, color: c.warningText, lineHeight: 17 },

    infoRow: { flexDirection: 'row', gap: 10, backgroundColor: c.bgScreen, borderRadius: 12, padding: 12, alignItems: 'flex-start' },
    infoTxt: { flex: 1, fontSize: 12, color: c.textMuted, lineHeight: 17 },

    zeroNote: {
      flexDirection: 'row', gap: 10, backgroundColor: c.warningBg, borderRadius: 12, padding: 12,
      alignItems: 'flex-start', borderWidth: 1, borderColor: c.warningBorder,
    },
    zeroTxt: { flex: 1, fontSize: 12, color: c.warningTextDark, lineHeight: 17 },

    footer: {
      flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 28,
      borderTopWidth: 1, borderTopColor: c.borderLight,
    },
    closeBtn2: {
      flex: 1, paddingVertical: 13, borderRadius: 12,
      borderWidth: 1.5, borderColor: c.borderMid, alignItems: 'center',
    },
    closeTxt2: { fontSize: 14, fontWeight: '600', color: c.textSub },
    requestBtn: { flex: 2, paddingVertical: 13, borderRadius: 12, backgroundColor: '#2d7a47', alignItems: 'center' },
    requestBtnDisabled: { opacity: 0.45 },
    requestBtnTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  });
}
