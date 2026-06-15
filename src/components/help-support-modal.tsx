import { useState } from 'react';
import {
  Modal, View, Text, Pressable, StyleSheet, ScrollView, Linking,
} from 'react-native';

interface FaqItem {
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    q: 'How do I accept a new order?',
    a: 'Go to the Orders tab. New orders appear at the top under "New". Tap the order card and press "Accept" — the order moves to Accepted and the buyer is notified.',
  },
  {
    q: 'When and how do I get paid?',
    a: 'Payments are settled T+1 (the next business day after delivery confirmation). Funds are transferred directly to your registered bank account. You can track payouts in the Analytics screen.',
  },
  {
    q: 'How do I add or edit a product?',
    a: 'Go to the Products tab. Tap "＋ Add Product" to create a new listing, or tap any existing product to edit it. You can update price, stock, images, and description at any time.',
  },
  {
    q: 'What commission does HarvestConnect charge?',
    a: 'HarvestConnect charges 7% commission on each successfully delivered order. You earn 93% of the order value. Commission is deducted before the payout is transferred.',
  },
  {
    q: 'How do I get my store verified?',
    a: 'Upload your FSSAI license number and supporting documents via Profile → KYC & Documents. Our compliance team reviews submissions within 48 hours on business days.',
  },
  {
    q: 'How do I cancel or decline an order?',
    a: 'For new (unaccepted) orders: tap the order and press "Decline", then enter a reason. For accepted orders that cannot be fulfilled, please contact support directly — we will assist with buyer communication.',
  },
  {
    q: 'How do I update my delivery zones?',
    a: 'Go to Profile → Delivery Zones (or tap "Edit ›" in the Delivery Coverage card). Select the zones you can serve and save. Changes take effect immediately for new buyer searches.',
  },
  {
    q: 'Can I have multiple stores?',
    a: 'Yes. Tap the store icon at the top of any screen to open the Store Switcher. Tap "Create New Store" to set up an additional storefront — each store has its own products, orders, and team.',
  },
];

interface ContactOption {
  icon: string;
  label: string;
  sub: string;
  action: () => void;
  color: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function HelpSupportModal({ visible, onClose }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);

  const contactOptions: ContactOption[] = [
    {
      icon: '📞',
      label: 'Call Support',
      sub: 'Mon–Sat, 9 AM – 6 PM',
      action: () => Linking.openURL('tel:+918004254545'),
      color: '#2d7a47',
    },
    {
      icon: '💬',
      label: 'WhatsApp',
      sub: 'Quick replies via chat',
      action: () => Linking.openURL('https://wa.me/918004254545'),
      color: '#25D366',
    },
    {
      icon: '📧',
      label: 'Email Us',
      sub: 'seller-support@harvestconnect.in',
      action: () => Linking.openURL('mailto:seller-support@harvestconnect.in'),
      color: '#6366f1',
    },
  ];

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
            <Text style={s.headTitle}>Help & Support</Text>
            <Pressable style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeTxt}>✕</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={s.body}>

            {/* Search hint */}
            <View style={s.searchHint}>
              <Text style={{ fontSize: 18 }}>🔍</Text>
              <Text style={s.searchHintTxt}>
                Browse common questions below or contact our seller support team directly.
              </Text>
            </View>

            {/* FAQs */}
            <Text style={s.sectionTitle}>Frequently Asked Questions</Text>
            <View style={s.faqCard}>
              {FAQS.map((faq, i) => {
                const open = expanded === i;
                return (
                  <View key={i} style={[s.faqItem, i > 0 && s.faqBorder]}>
                    <Pressable
                      style={s.faqQ}
                      onPress={() => setExpanded(open ? null : i)}>
                      <Text style={s.faqQTxt}>{faq.q}</Text>
                      <Text style={[s.faqChevron, open && s.faqChevronOpen]}>›</Text>
                    </Pressable>
                    {open && (
                      <Text style={s.faqA}>{faq.a}</Text>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Contact */}
            <Text style={s.sectionTitle}>Still Need Help?</Text>
            <View style={s.contactGrid}>
              {contactOptions.map((opt) => (
                <Pressable key={opt.label} style={s.contactCard} onPress={opt.action}>
                  <View style={[s.contactIcon, { backgroundColor: opt.color + '18' }]}>
                    <Text style={{ fontSize: 24 }}>{opt.icon}</Text>
                  </View>
                  <Text style={s.contactLabel}>{opt.label}</Text>
                  <Text style={s.contactSub}>{opt.sub}</Text>
                </Pressable>
              ))}
            </View>

            {/* Seller guide */}
            <Pressable
              style={s.guideCard}
              onPress={() => Linking.openURL('https://harvestconnect.in/seller-guide')}>
              <View style={{ flex: 1 }}>
                <Text style={s.guideTxt}>📖  Seller Guide & Best Practices</Text>
                <Text style={s.guideSub}>Tips on pricing, photography, and growing your sales</Text>
              </View>
              <Text style={{ fontSize: 18, color: '#9ca3af' }}>›</Text>
            </Pressable>

            <View style={{ height: 32 }} />
          </ScrollView>
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

  body: { padding: 16 },

  searchHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  searchHintTxt: { flex: 1, fontSize: 12, color: '#166534', lineHeight: 17 },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 10 },

  faqCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    marginBottom: 20,
  },
  faqItem: { paddingHorizontal: 16 },
  faqBorder: { borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  faqQ: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    gap: 12,
  },
  faqQTxt: { flex: 1, fontSize: 13, fontWeight: '600', color: '#111827', lineHeight: 18 },
  faqChevron: { fontSize: 20, color: '#9ca3af', transform: [{ rotate: '0deg' }] },
  faqChevronOpen: { transform: [{ rotate: '90deg' }] },
  faqA: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
    paddingBottom: 14,
  },

  contactGrid: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  contactCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  contactIcon: {
    width: 48, height: 48,
    borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  contactLabel: { fontSize: 12, fontWeight: '700', color: '#111827' },
  contactSub: { fontSize: 10, color: '#9ca3af', textAlign: 'center' },

  guideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 10,
    marginBottom: 8,
  },
  guideTxt: { fontSize: 13, fontWeight: '600', color: '#111827' },
  guideSub: { fontSize: 11, color: '#6b7280', marginTop: 2 },
});
