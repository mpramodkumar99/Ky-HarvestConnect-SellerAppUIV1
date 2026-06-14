import { Modal, View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { useToast } from '@/components/toast-provider';
import type { BankAccount } from '@/services/user-api';

interface Props {
  visible: boolean;
  availableAmount: number;  // rupees (post 7% commission)
  grossAmount: number;      // rupees (pre-commission)
  deliveredCount: number;
  bankAccount: BankAccount | null;
  onClose: () => void;
}

export function PayoutModal({
  visible, availableAmount, grossAmount, deliveredCount, bankAccount, onClose,
}: Props) {
  const { showToast } = useToast();
  const commission = grossAmount - availableAmount;
  const canRequest = availableAmount > 0 && bankAccount !== null;

  function handleRequestPayout() {
    if (!bankAccount) {
      Alert.alert(
        'Bank Account Required',
        'Add your bank account in Profile → Bank & Payouts before requesting a payout.',
        [{ text: 'OK' }],
      );
      return;
    }
    const last4 = bankAccount.accountNumber.replace(/\D/g, '').slice(-4);
    Alert.alert(
      'Confirm Payout Request',
      `₹${availableAmount.toLocaleString('en-IN')} will be transferred to ${bankAccount.bankName} ···${last4} within 1 business day.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Now',
          onPress: () => {
            onClose();
            showToast('Payout requested! Funds arrive by next business day.', 'success');
          },
        },
      ],
    );
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

          {/* Header */}
          <View style={s.head}>
            <Text style={s.headTitle}>Payout</Text>
            <Pressable style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeTxt}>✕</Text>
            </Pressable>
          </View>

          {/* Amount hero */}
          <View style={s.hero}>
            <Text style={s.heroLabel}>Available for Payout</Text>
            <Text style={s.heroAmount}>₹{availableAmount.toLocaleString('en-IN')}</Text>
            <Text style={s.heroSub}>
              {deliveredCount} delivered order{deliveredCount !== 1 ? 's' : ''} · after 7% commission
            </Text>
          </View>

          <View style={s.body}>

            {/* Breakdown */}
            <View style={s.card}>
              <Text style={s.cardTitle}>Breakdown</Text>
              <View style={s.bRow}>
                <Text style={s.bLabel}>Order Revenue</Text>
                <Text style={s.bValue}>₹{grossAmount.toLocaleString('en-IN')}</Text>
              </View>
              <View style={[s.bRow, s.bRowBorder]}>
                <Text style={s.bLabel}>Platform Commission (7%)</Text>
                <Text style={[s.bValue, { color: '#dc2626' }]}>
                  − ₹{commission.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={[s.bRow, s.bRowBorder, s.bRowTotal]}>
                <Text style={s.bTotalLabel}>You Earn</Text>
                <Text style={s.bTotalValue}>₹{availableAmount.toLocaleString('en-IN')}</Text>
              </View>
            </View>

            {/* Bank account */}
            <View style={s.card}>
              <Text style={s.cardTitle}>Transfer To</Text>
              {bankAccount ? (
                <View style={s.bankRow}>
                  <View style={s.bankIcon}>
                    <Text style={{ fontSize: 22 }}>🏦</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.bankName}>{bankAccount.bankName}</Text>
                    <Text style={s.bankDetail}>
                      {bankAccount.accountNumber} · {bankAccount.ifscCode}
                    </Text>
                    {bankAccount.upiId ? (
                      <Text style={s.bankDetail}>UPI: {bankAccount.upiId}</Text>
                    ) : null}
                  </View>
                  <View style={s.verifiedPill}>
                    <Text style={s.verifiedTxt}>✓ Verified</Text>
                  </View>
                </View>
              ) : (
                <View style={s.noBankRow}>
                  <Text style={{ fontSize: 22 }}>⚠️</Text>
                  <Text style={s.noBankTxt}>
                    No bank account linked. Go to Profile → Bank & Payouts to add one.
                  </Text>
                </View>
              )}
            </View>

            {/* Settlement info */}
            <View style={s.infoRow}>
              <Text style={{ fontSize: 16 }}>⏱️</Text>
              <Text style={s.infoTxt}>
                Payouts are processed T+1 — funds arrive the next business day after your request.
              </Text>
            </View>

            {availableAmount === 0 && (
              <View style={s.zeroNote}>
                <Text style={{ fontSize: 16 }}>📭</Text>
                <Text style={s.zeroTxt}>
                  No delivered orders yet. Amounts become available once buyers confirm delivery.
                </Text>
              </View>
            )}

          </View>

          {/* Footer */}
          <View style={s.footer}>
            <Pressable style={s.closeBtn2} onPress={onClose}>
              <Text style={s.closeTxt2}>Close</Text>
            </Pressable>
            <Pressable
              style={[s.requestBtn, !canRequest && s.requestBtnDisabled]}
              onPress={handleRequestPayout}
              disabled={!canRequest}>
              <Text style={s.requestBtnTxt}>
                {availableAmount === 0 ? 'No Balance' : 'Request Payout →'}
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

  hero: {
    backgroundColor: '#1a4a28',
    paddingVertical: 28,
    alignItems: 'center',
    gap: 6,
  },
  heroLabel: { fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: '600', letterSpacing: 0.3 },
  heroAmount: { fontSize: 42, fontWeight: '800', color: '#fff' },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },

  body: { padding: 16, gap: 12 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },

  bRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  bRowBorder: { borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  bRowTotal: { backgroundColor: '#f9fafb' },
  bLabel: { fontSize: 13, color: '#6b7280' },
  bValue: { fontSize: 13, fontWeight: '600', color: '#111827' },
  bTotalLabel: { fontSize: 13, fontWeight: '700', color: '#111827' },
  bTotalValue: { fontSize: 15, fontWeight: '800', color: '#2d7a47' },

  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  bankIcon: {
    width: 44, height: 44,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  bankName: { fontSize: 13, fontWeight: '700', color: '#111827' },
  bankDetail: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  verifiedPill: {
    backgroundColor: '#dcfce7',
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  verifiedTxt: { fontSize: 10, fontWeight: '700', color: '#166534' },

  noBankRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
  },
  noBankTxt: { flex: 1, fontSize: 12, color: '#92400e', lineHeight: 17 },

  infoRow: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    alignItems: 'flex-start',
  },
  infoTxt: { flex: 1, fontSize: 12, color: '#6b7280', lineHeight: 17 },

  zeroNote: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  zeroTxt: { flex: 1, fontSize: 12, color: '#78350f', lineHeight: 17 },

  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  closeBtn2: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  closeTxt2: { fontSize: 14, fontWeight: '600', color: '#374151' },
  requestBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#2d7a47',
    alignItems: 'center',
  },
  requestBtnDisabled: { opacity: 0.45 },
  requestBtnTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
