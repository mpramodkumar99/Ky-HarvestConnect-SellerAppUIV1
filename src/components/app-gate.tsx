import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppTabs from '@/components/app-tabs';
import { AuthFlow } from '@/components/auth-flow';
import { CreateStoreModal } from '@/components/create-store-modal';
import { PendingInviteModal } from '@/components/pending-invite-modal';
import { useAuth } from '@/context/auth-context';
import { useStore } from '@/context/store-context';
import { useToast } from '@/components/toast-provider';

const STEPS = [
  { icon: '🏪', title: 'Create Your Store',  desc: 'Name, type, location, and describe your store' },
  { icon: '🌾', title: 'Add Products',        desc: 'List what you sell with prices and stock levels' },
  { icon: '📦', title: 'Accept Orders',       desc: 'Buyers discover you and place orders directly' },
];

// ── No-Store Onboarding ───────────────────────────────────────────────────────

function OnboardingScreen() {
  const { addStore } = useStore();
  const { showToast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <View style={s.screen}>
      <CreateStoreModal
        visible={createOpen}
        onCreated={(store) => {
          addStore(store);
          setCreateOpen(false);
          showToast(`${store.name} created! Upload KYC to get verified.`, 'success');
        }}
        onClose={() => setCreateOpen(false)}
      />

      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>

        <View style={s.brand}>
          <View style={s.logoRing}>
            <Text style={s.logoIcon}>🌾</Text>
          </View>
          <Text style={s.appName}>HarvestConnect</Text>
          <View style={s.sellerPill}>
            <Text style={s.sellerPillTxt}>Seller</Text>
          </View>
        </View>

        <View style={s.hero}>
          <Text style={s.heroTitle}>Welcome, Seller!</Text>
          <Text style={s.heroSub}>
            Set up your first store to start selling fresh produce directly to buyers in your area — commission-free listings, T+1 payouts.
          </Text>
        </View>

        <View style={s.stepsCard}>
          <Text style={s.stepsHeading}>How it works</Text>
          {STEPS.map((step, i) => (
            <View key={i} style={s.stepRow}>
              <View style={s.stepLeft}>
                <View style={s.stepCircle}>
                  <Text style={s.stepIcon}>{step.icon}</Text>
                  <View style={s.stepNum}>
                    <Text style={s.stepNumTxt}>{i + 1}</Text>
                  </View>
                </View>
                {i < STEPS.length - 1 && <View style={s.connector} />}
              </View>
              <View style={s.stepRight}>
                <Text style={s.stepTitle}>{step.title}</Text>
                <Text style={s.stepDesc}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={s.badges}>
          {['Free to join', 'No listing fees', '7% on delivery only'].map((b) => (
            <View key={b} style={s.badge}>
              <Text style={s.badgeTxt}>✓  {b}</Text>
            </View>
          ))}
        </View>

        <View style={s.footer}>
          <Pressable style={s.ctaBtn} onPress={() => setCreateOpen(true)}>
            <Text style={s.ctaTxt}>Create My Store</Text>
            <View style={s.ctaArrow} />
          </Pressable>
          <Text style={s.footerNote}>Takes less than 2 minutes</Text>
        </View>

      </SafeAreaView>
    </View>
  );
}

// ── Root Gate ─────────────────────────────────────────────────────────────────

export default function AppGate() {
  const { initializing, isAuthenticated } = useAuth();
  const { stores, loadingStores, pendingInvites } = useStore();
  const [invitesDismissed, setInvitesDismissed] = useState(false);

  // Auth check in progress — AnimatedSplashOverlay covers the first 900ms
  if (initializing) {
    return (
      <View style={s.loadingScreen}>
        <ActivityIndicator size="large" color="#2d7a47" />
      </View>
    );
  }

  // Not logged in — show auth flow
  if (!isAuthenticated) {
    return <AuthFlow />;
  }

  // Logged in, still fetching stores
  if (loadingStores && stores.length === 0) {
    return (
      <View style={s.loadingScreen}>
        <ActivityIndicator size="large" color="#2d7a47" />
        <Text style={s.loadingTxt}>Loading your stores…</Text>
      </View>
    );
  }

  // Logged in, has pending invites and no stores yet — show invite screen
  if (!loadingStores && stores.length === 0 && pendingInvites.length > 0 && !invitesDismissed) {
    return (
      <PendingInviteModal
        visible
        onDone={() => setInvitesDismissed(true)}
      />
    );
  }

  // Logged in, no stores — onboarding
  if (stores.length === 0) {
    return <OnboardingScreen />;
  }

  // All good — main app; show invite modal on top if invites arrived after stores loaded
  return (
    <>
      <AppTabs />
      {pendingInvites.length > 0 && !invitesDismissed && (
        <PendingInviteModal
          visible
          onDone={() => setInvitesDismissed(true)}
        />
      )}
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  loadingScreen: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f9fafb', gap: 12,
  },
  loadingTxt: { fontSize: 13, color: '#6b7280' },

  screen: { flex: 1, backgroundColor: '#f9fafb' },
  safe:   { flex: 1, paddingHorizontal: 24 },

  brand: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingTop: 24, paddingBottom: 28,
  },
  logoRing: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#2d7a47',
    alignItems: 'center', justifyContent: 'center',
  },
  logoIcon:  { fontSize: 22 },
  appName:   { fontSize: 18, fontWeight: '800', color: '#111827', flex: 1 },
  sellerPill: {
    backgroundColor: '#2d7a47', borderRadius: 99,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  sellerPillTxt: { fontSize: 11, fontWeight: '700', color: '#fff' },

  hero: { marginBottom: 28 },
  heroTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 10, lineHeight: 34 },
  heroSub:   { fontSize: 14, color: '#6b7280', lineHeight: 21 },

  stepsCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 18,
  },
  stepsHeading: {
    fontSize: 12, fontWeight: '700', color: '#9ca3af',
    letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 18,
  },

  stepRow:   { flexDirection: 'row', gap: 16 },
  stepLeft:  { alignItems: 'center', width: 48 },
  stepCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#f0fdf4',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#86efac',
    position: 'relative',
  },
  stepIcon: { fontSize: 22 },
  stepNum: {
    position: 'absolute', bottom: -4, right: -4,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#2d7a47',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  stepNumTxt: { fontSize: 9, fontWeight: '800', color: '#fff' },
  connector: {
    flex: 1, width: 2, backgroundColor: '#d1fae5',
    marginVertical: 4, minHeight: 20,
  },
  stepRight: { flex: 1, paddingTop: 10, paddingBottom: 22 },
  stepTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  stepDesc:  { fontSize: 12, color: '#6b7280', marginTop: 3, lineHeight: 17 },

  badges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 28 },
  badge: {
    backgroundColor: '#f0fdf4', borderRadius: 99,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  badgeTxt: { fontSize: 11, fontWeight: '600', color: '#166534' },

  footer: { gap: 10, paddingBottom: 8 },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#2d7a47', borderRadius: 16, paddingVertical: 16,
  },
  ctaTxt:   { fontSize: 16, fontWeight: '800', color: '#fff' },
  ctaArrow: {
    width: 0, height: 0,
    borderTopWidth: 5, borderBottomWidth: 5, borderLeftWidth: 8,
    borderStyle: 'solid',
    borderTopColor: 'transparent', borderBottomColor: 'transparent',
    borderLeftColor: '#fff',
  },
  footerNote: { fontSize: 12, color: '#9ca3af', textAlign: 'center' },
});
