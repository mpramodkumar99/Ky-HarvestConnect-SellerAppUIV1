import { useState } from 'react';
import {
  Modal, View, Text, Pressable, StyleSheet, ScrollView, Linking,
} from 'react-native';
import { useLanguage } from '@/context/language-context';
import { useAppColors, type AppColors } from '@/hooks/use-app-colors';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function HelpSupportModal({ visible, onClose }: Props) {
  const { t } = useLanguage();
  const c = useAppColors();
  const s = makeStyles(c);
  const [expanded, setExpanded] = useState<number | null>(null);

  const FAQS = [
    { q: t('help_faq_q1'), a: t('help_faq_a1') },
    { q: t('help_faq_q2'), a: t('help_faq_a2') },
    { q: t('help_faq_q3'), a: t('help_faq_a3') },
    { q: t('help_faq_q4'), a: t('help_faq_a4') },
    { q: t('help_faq_q5'), a: t('help_faq_a5') },
    { q: t('help_faq_q6'), a: t('help_faq_a6') },
    { q: t('help_faq_q7'), a: t('help_faq_a7') },
    { q: t('help_faq_q8'), a: t('help_faq_a8') },
  ];

  const contactOptions = [
    {
      icon: '📞',
      label: t('help_call'),
      sub: t('help_call_hours'),
      action: () => Linking.openURL('tel:+918004254545'),
      color: '#2d7a47',
    },
    {
      icon: '💬',
      label: t('help_whatsapp'),
      sub: t('help_whatsapp_sub'),
      action: () => Linking.openURL('https://wa.me/918004254545'),
      color: '#25D366',
    },
    {
      icon: '📧',
      label: t('help_email'),
      sub: t('help_email_sub'),
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
            <Text style={s.headTitle}>{t('help_title')}</Text>
            <Pressable style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeTxt}>✕</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={s.body}>

            {/* Search hint */}
            <View style={s.searchHint}>
              <Text style={{ fontSize: 18 }}>🔍</Text>
              <Text style={s.searchHintTxt}>{t('help_hint')}</Text>
            </View>

            {/* FAQs */}
            <Text style={s.sectionTitle}>{t('help_faqs')}</Text>
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
            <Text style={s.sectionTitle}>{t('help_contact')}</Text>
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
                <Text style={s.guideTxt}>{t('help_guide')}</Text>
                <Text style={s.guideSub}>{t('help_guide_sub')}</Text>
              </View>
              <Text style={{ fontSize: 18, color: c.textFaint }}>›</Text>
            </Pressable>

            <View style={{ height: 32 }} />
          </ScrollView>
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

    body: { padding: 16 },

    searchHint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: c.primaryBg,
      borderRadius: 12,
      padding: 12,
      marginBottom: 20,
    },
    searchHintTxt: { flex: 1, fontSize: 12, color: c.primaryText, lineHeight: 17 },

    sectionTitle: { fontSize: 13, fontWeight: '700', color: c.text, marginBottom: 10 },

    faqCard: {
      backgroundColor: c.bg,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
      marginBottom: 20,
    },
    faqItem: { paddingHorizontal: 16 },
    faqBorder: { borderTopWidth: 1, borderTopColor: c.borderLight },
    faqQ: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      gap: 12,
    },
    faqQTxt: { flex: 1, fontSize: 13, fontWeight: '600', color: c.text, lineHeight: 18 },
    faqChevron: { fontSize: 20, color: c.textFaint, transform: [{ rotate: '0deg' }] },
    faqChevronOpen: { transform: [{ rotate: '90deg' }] },
    faqA: {
      fontSize: 12,
      color: c.textMuted,
      lineHeight: 18,
      paddingBottom: 14,
    },

    contactGrid: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    contactCard: {
      flex: 1,
      backgroundColor: c.bg,
      borderRadius: 14,
      padding: 14,
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: c.border,
    },
    contactIcon: {
      width: 48, height: 48,
      borderRadius: 24,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 2,
    },
    contactLabel: { fontSize: 12, fontWeight: '700', color: c.text },
    contactSub: { fontSize: 10, color: c.textFaint, textAlign: 'center' },

    guideCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.bg,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
      gap: 10,
      marginBottom: 8,
    },
    guideTxt: { fontSize: 13, fontWeight: '600', color: c.text },
    guideSub: { fontSize: 11, color: c.textMuted, marginTop: 2 },
  });
}
