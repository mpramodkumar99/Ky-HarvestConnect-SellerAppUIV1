import { useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, TextInput, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { normalizePhone, requestOtp, verifyOtp, type AuthSession } from '@/services/auth-api';
import { createUser } from '@/services/user-api';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/components/toast-provider';

type Screen = 'welcome' | 'signup' | 'login-phone' | 'otp';

function isNetworkError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : '';
  return msg.includes('network request failed') || msg.includes('fetch') || msg.includes('failed to fetch');
}

// Dev-only: bypasses AuthSvc entirely — no network needed
const DEV_SESSION: AuthSession = {
  token:     'dev-token-s112',
  userId:    'user-s112',
  userType:  'seller',
  sessionId: 'dev-session-s112',
  expiresAt: new Date(Date.now() + 86400 * 1000).toISOString(),
};

// ── Welcome ───────────────────────────────────────────────────────────────────

function WelcomeScreen({
  onSignup, onLogin,
}: { onSignup: () => void; onLogin: () => void }) {
  const { login } = useAuth();
  const { showToast } = useToast();

  async function devLogin() {
    await login(DEV_SESSION);
    showToast('Dev login — AuthSvc bypassed.', 'info');
  }

  return (
    <View style={w.screen}>
      <SafeAreaView style={w.safe} edges={['top', 'bottom']}>

        <View style={w.top}>
          <View style={w.logoRing}>
            <Text style={w.logoIcon}>🌾</Text>
          </View>
          <Text style={w.brand}>HarvestConnect</Text>
          <View style={w.sellerPill}>
            <Text style={w.sellerPillTxt}>Seller</Text>
          </View>
        </View>

        <View style={w.hero}>
          <Text style={w.title}>Sell fresh.{'\n'}Earn directly.</Text>
          <Text style={w.sub}>
            Join thousands of farmers, artisans, and home cooks selling on HarvestConnect — no middlemen, no hidden fees.
          </Text>
        </View>

        <View style={w.features}>
          {[
            { icon: '📦', text: 'Orders straight from buyers in your area' },
            { icon: '💰', text: 'T+1 payouts to your bank account' },
            { icon: '📊', text: 'Sales analytics and growth insights' },
          ].map((f) => (
            <View key={f.text} style={w.featureRow}>
              <Text style={w.featureIcon}>{f.icon}</Text>
              <Text style={w.featureTxt}>{f.text}</Text>
            </View>
          ))}
        </View>

        <View style={w.footer}>
          <Pressable style={w.signupBtn} onPress={onSignup}>
            <Text style={w.signupTxt}>Create Account</Text>
            <View style={w.signupArrow} />
          </Pressable>
          <Pressable style={w.loginBtn} onPress={onLogin}>
            <Text style={w.loginTxt}>Already a seller? Log In</Text>
          </Pressable>

          {__DEV__ && (
            <Pressable style={w.devBtn} onPress={devLogin}>
              <Text style={w.devBtnTxt}>⚡ Dev Login (skip AuthSvc)</Text>
            </Pressable>
          )}
        </View>

      </SafeAreaView>
    </View>
  );
}

const w = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#1a4a28' },
  safe:   { flex: 1, paddingHorizontal: 28 },

  top: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 24, paddingBottom: 36 },
  logoRing: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
  },
  logoIcon:      { fontSize: 22 },
  brand:         { fontSize: 18, fontWeight: '800', color: '#fff', flex: 1 },
  sellerPill:    { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3 },
  sellerPillTxt: { fontSize: 11, fontWeight: '700', color: '#fff' },

  hero:  { marginBottom: 40 },
  title: { fontSize: 38, fontWeight: '900', color: '#fff', lineHeight: 46, marginBottom: 14 },
  sub:   { fontSize: 15, color: 'rgba(255,255,255,0.72)', lineHeight: 22 },

  features:   { gap: 14, flex: 1 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureIcon: { fontSize: 22, width: 32, textAlign: 'center' },
  featureTxt:  { fontSize: 14, color: 'rgba(255,255,255,0.85)', flex: 1, lineHeight: 20 },

  footer: { paddingTop: 32, paddingBottom: 12, gap: 10 },
  signupBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 16, paddingVertical: 17,
  },
  signupTxt: { fontSize: 16, fontWeight: '800', color: '#1a4a28' },
  signupArrow: {
    width: 0,
    height: 0,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderLeftWidth: 8,
    borderStyle: 'solid',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#1a4a28',
  },
  loginBtn: {
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 16, paddingVertical: 15, alignItems: 'center',
  },
  loginTxt: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  devBtn: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderStyle: 'dashed',
  },
  devBtnTxt: { fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: '600' },
});

// ── Signup ────────────────────────────────────────────────────────────────────

function SignupScreen({
  onOtpSent,
  onSwitchToLogin,
  onBack,
  initialPhone,
}: {
  onOtpSent: (phone: string) => void;
  onSwitchToLogin: (phone: string) => void;
  onBack: () => void;
  initialPhone?: string;
}) {
  const [name,          setName]          = useState('');
  const [phone,         setPhone]         = useState(initialPhone?.replace('+91', '') ?? '');
  const [email,         setEmail]         = useState('');
  const [loading,       setLoading]       = useState(false);
  const [switchLoading, setSwitchLoading] = useState(false);
  const [error,         setError]         = useState('');
  const [offline,       setOffline]       = useState(false);
  const [duplicate,     setDuplicate]     = useState(false);

  const digits    = phone.replace(/\D/g, '');
  const canSubmit = name.trim().length >= 2 && digits.length === 10 && !loading && !switchLoading;

  async function handleSwitchToLogin() {
    const normalized = normalizePhone(phone);
    setSwitchLoading(true);
    try {
      await requestOtp(normalized);
    } catch {
      // Navigate anyway — OTP screen can resend if this failed
    } finally {
      setSwitchLoading(false);
    }
    onSwitchToLogin(normalized);
  }

  async function handleSignup() {
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    setOffline(false);
    setDuplicate(false);
    const normalized = normalizePhone(phone);
    try {
      // Step 1: create user in UserSvc
      await createUser({
        name:  name.trim(),
        phone: normalized,
        email: email.trim() || undefined,
        type:  'seller',
      });
      // Step 2: request OTP now that user exists in AuthSvc lookup
      await requestOtp(normalized);
      onOtpSent(normalized);
    } catch (err) {
      if (isNetworkError(err)) {
        setOffline(true);
        setError('Cannot reach services. Check that UserSvc (3002) and AuthSvc (3001) are running.');
      } else if (err instanceof Error && err.message.toLowerCase().includes('already registered')) {
        setDuplicate(true);
        setError('This phone number is already registered.');
      } else {
        setError(err instanceof Error ? err.message : 'Registration failed. Try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={sg.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={sg.screen}>
        <SafeAreaView style={sg.safe} edges={['top', 'bottom']}>

          <Pressable style={sg.back} onPress={onBack}>
            <View style={sg.backChevron} /><Text style={sg.backTxt}>Back</Text>
          </Pressable>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            <View style={sg.header}>
              <View style={sg.iconWrap}>
                <Text style={{ fontSize: 36 }}>🌱</Text>
              </View>
              <Text style={sg.title}>Create your{'\n'}seller account</Text>
              <Text style={sg.sub}>Free to join. Start selling in minutes.</Text>
            </View>

            {/* Name */}
            <View style={sg.field}>
              <Text style={sg.label}>Full Name *</Text>
              <TextInput
                style={sg.input}
                value={name}
                onChangeText={(t) => { setName(t); setError(''); }}
                placeholder="e.g. Sridevi Reddy"
                placeholderTextColor="#9ca3af"
                autoCapitalize="words"
                returnKeyType="next"
                editable={!loading}
              />
            </View>

            {/* Phone */}
            <View style={sg.field}>
              <Text style={sg.label}>Phone Number *</Text>
              <View style={sg.phoneWrap}>
                <View style={sg.prefix}>
                  <Text style={sg.flag}>🇮🇳</Text>
                  <Text style={sg.prefixTxt}>+91</Text>
                </View>
                <TextInput
                  style={sg.phoneInput}
                  value={phone}
                  onChangeText={(t) => { setPhone(t); setError(''); setDuplicate(false); }}
                  placeholder="00000 00000"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                  maxLength={10}
                  returnKeyType="next"
                  editable={!loading}
                />
              </View>
            </View>

            {/* Email (optional) */}
            <View style={sg.field}>
              <Text style={sg.label}>Email <Text style={sg.optional}>(optional)</Text></Text>
              <TextInput
                style={sg.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleSignup}
                editable={!loading}
              />
            </View>

            {/* Error */}
            {error ? (
              <View style={[sg.errorBox, offline && sg.offlineBox]}>
                <Text style={[sg.errorTxt, offline && sg.offlineTxt]}>{error}</Text>
                {duplicate && (
                  <Pressable
                    style={sg.switchBtn}
                    onPress={handleSwitchToLogin}
                    disabled={switchLoading}>
                    <Text style={sg.switchBtnTxt}>
                      {switchLoading ? 'Sending OTP…' : 'Log in with this number'}
                    </Text>
                    {!switchLoading && <View style={sg.switchArrow} />}
                  </Pressable>
                )}
              </View>
            ) : null}

            <View style={sg.terms}>
              <Text style={sg.termsTxt}>
                By creating an account you agree to HarvestConnect's{' '}
                <Text style={sg.termsLink}>Terms of Service</Text> and{' '}
                <Text style={sg.termsLink}>Privacy Policy</Text>.
              </Text>
            </View>

            <View style={{ height: 24 }} />
          </ScrollView>

          <View style={sg.footer}>
            <Pressable
              style={[sg.submitBtn, !canSubmit && sg.submitBtnDisabled]}
              onPress={handleSignup}
              disabled={!canSubmit}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={sg.submitTxt}>Create Account & Send OTP</Text>}
            </Pressable>
          </View>

        </SafeAreaView>
      </View>
    </KeyboardAvoidingView>
  );
}

const sg = StyleSheet.create({
  flex:   { flex: 1 },
  screen: { flex: 1, backgroundColor: '#f9fafb' },
  safe:   { flex: 1, paddingHorizontal: 24 },

  back:        { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 16, paddingBottom: 4 },
  backChevron: {
    width: 0, height: 0,
    borderTopWidth: 5, borderBottomWidth: 5, borderRightWidth: 8,
    borderStyle: 'solid',
    borderTopColor: 'transparent', borderBottomColor: 'transparent',
    borderRightColor: '#2d7a47',
  },
  backTxt: { fontSize: 14, fontWeight: '600', color: '#2d7a47' },

  header:   { paddingTop: 8, paddingBottom: 28 },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#f0fdf4',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, borderWidth: 2, borderColor: '#bbf7d0',
  },
  title: { fontSize: 28, fontWeight: '800', color: '#111827', lineHeight: 36, marginBottom: 8 },
  sub:   { fontSize: 14, color: '#6b7280' },

  field:    { marginBottom: 18 },
  label:    { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 7 },
  optional: { fontWeight: '400', color: '#9ca3af' },
  input: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#111827', backgroundColor: '#fff',
  },

  phoneWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 14,
    backgroundColor: '#fff', overflow: 'hidden',
  },
  prefix: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 14,
    borderRightWidth: 1, borderRightColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  flag:      { fontSize: 18 },
  prefixTxt: { fontSize: 14, fontWeight: '700', color: '#111827' },
  phoneInput: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 15, color: '#111827', letterSpacing: 1.5,
  },

  errorBox:   { backgroundColor: '#fff5f5', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#fca5a5', marginBottom: 16 },
  offlineBox: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  errorTxt:   { fontSize: 12, color: '#dc2626', lineHeight: 17 },
  offlineTxt: { color: '#92400e' },
  switchBtn:    { marginTop: 10, paddingVertical: 8, backgroundColor: '#1a4a28', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  switchBtnTxt: { fontSize: 12, fontWeight: '700', color: '#fff' },
  switchArrow:  { width: 0, height: 0, borderTopWidth: 4, borderBottomWidth: 4, borderLeftWidth: 6, borderStyle: 'solid', borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: '#fff' },

  terms:     { marginBottom: 4 },
  termsTxt:  { fontSize: 11, color: '#9ca3af', lineHeight: 16 },
  termsLink: { color: '#2d7a47', fontWeight: '600' },

  footer:           { paddingBottom: 16, paddingTop: 8 },
  submitBtn:        { backgroundColor: '#2d7a47', borderRadius: 16, paddingVertical: 17, alignItems: 'center' },
  submitBtnDisabled:{ opacity: 0.4 },
  submitTxt:        { fontSize: 15, fontWeight: '800', color: '#fff' },
});

// ── Login Phone Entry ─────────────────────────────────────────────────────────

function LoginPhoneScreen({
  onOtpSent,
  onSwitchToSignup,
  onBack,
}: {
  onOtpSent: (phone: string) => void;
  onSwitchToSignup: (phone: string) => void;
  onBack: () => void;
}) {
  const [phone,        setPhone]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [switchLoading, setSwitchLoading] = useState(false);
  const [error,        setError]        = useState('');
  const [offline,      setOffline]      = useState(false);
  const [notFound,     setNotFound]     = useState(false);

  const digits    = phone.replace(/\D/g, '');
  const canSubmit = digits.length === 10 && !loading && !switchLoading;

  async function handleSend() {
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    setOffline(false);
    setNotFound(false);
    try {
      const normalized = normalizePhone(phone);
      await requestOtp(normalized);
      onOtpSent(normalized);
    } catch (err) {
      if (isNetworkError(err)) {
        setOffline(true);
        setError('Cannot reach AuthSvc. Make sure it\'s running on port 3001.');
      } else if (err instanceof Error && (
        err.message.toLowerCase().includes('not found') ||
        err.message.toLowerCase().includes('not registered') ||
        err.message.toLowerCase().includes('no account')
      )) {
        setNotFound(true);
        setError('No account found for this number.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to send OTP. Try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSwitchToSignup() {
    const normalized = normalizePhone(phone);
    setSwitchLoading(true);
    setSwitchLoading(false);
    onSwitchToSignup(normalized);
  }

  return (
    <KeyboardAvoidingView style={lp.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={lp.screen}>
        <SafeAreaView style={lp.safe} edges={['top', 'bottom']}>

          <Pressable style={lp.back} onPress={onBack}>
            <View style={lp.backChevron} /><Text style={lp.backTxt}>Back</Text>
          </Pressable>

          <View style={lp.body}>
            <View style={lp.iconWrap}>
              <Text style={{ fontSize: 36 }}>📱</Text>
            </View>
            <Text style={lp.title}>Welcome{'\n'}back!</Text>
            <Text style={lp.sub}>Enter your registered phone number to receive an OTP.</Text>

            <View style={lp.inputWrap}>
              <View style={lp.prefix}>
                <Text style={lp.flag}>🇮🇳</Text>
                <Text style={lp.prefixTxt}>+91</Text>
              </View>
              <TextInput
                style={lp.input}
                value={phone}
                onChangeText={(t) => { setPhone(t); setError(''); setOffline(false); }}
                placeholder="00000 00000"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
                maxLength={10}
                autoFocus
                returnKeyType="send"
                onSubmitEditing={handleSend}
              />
            </View>

            {error ? (
              <View style={[lp.errorBox, offline && lp.offlineBox]}>
                <Text style={[lp.errorTxt, offline && lp.offlineTxt]}>{error}</Text>
                {offline && __DEV__ && (
                  <Text style={lp.offlineHint}>Go back and use ⚡ Dev Login.</Text>
                )}
                {notFound && (
                  <Pressable
                    style={lp.switchBtn}
                    onPress={handleSwitchToSignup}
                    disabled={switchLoading}>
                    <Text style={lp.switchBtnTxt}>
                      {switchLoading ? 'Going to Sign Up…' : 'Create an account'}
                    </Text>
                    {!switchLoading && <View style={lp.switchArrow} />}
                  </Pressable>
                )}
              </View>
            ) : null}

            {__DEV__ && (
              <Text style={lp.hint}>Dev: phone 9000000112 → seller-112 seed. OTP is 123456.</Text>
            )}
          </View>

          <View style={lp.footer}>
            <Pressable
              style={[lp.sendBtn, !canSubmit && lp.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!canSubmit}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={lp.sendTxt}>Send OTP</Text>}
            </Pressable>
          </View>

        </SafeAreaView>
      </View>
    </KeyboardAvoidingView>
  );
}

const lp = StyleSheet.create({
  flex:   { flex: 1 },
  screen: { flex: 1, backgroundColor: '#f9fafb' },
  safe:   { flex: 1, paddingHorizontal: 24 },

  back:        { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 16, paddingBottom: 8 },
  backChevron: {
    width: 0, height: 0,
    borderTopWidth: 5, borderBottomWidth: 5, borderRightWidth: 8,
    borderStyle: 'solid',
    borderTopColor: 'transparent', borderBottomColor: 'transparent',
    borderRightColor: '#2d7a47',
  },
  backTxt: { fontSize: 14, fontWeight: '600', color: '#2d7a47' },

  body:     { flex: 1, justifyContent: 'center', paddingBottom: 40 },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#f0fdf4',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20, borderWidth: 2, borderColor: '#bbf7d0',
  },
  title: { fontSize: 30, fontWeight: '800', color: '#111827', lineHeight: 38, marginBottom: 10 },
  sub:   { fontSize: 14, color: '#6b7280', lineHeight: 21, marginBottom: 28 },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 2, borderColor: '#2d7a47', borderRadius: 16,
    backgroundColor: '#fff', overflow: 'hidden', marginBottom: 12,
  },
  prefix: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 16,
    borderRightWidth: 1, borderRightColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  flag:      { fontSize: 18 },
  prefixTxt: { fontSize: 15, fontWeight: '700', color: '#111827' },
  input: {
    flex: 1, paddingHorizontal: 16, paddingVertical: 16,
    fontSize: 20, fontWeight: '600', color: '#111827', letterSpacing: 2,
  },

  errorBox:    { backgroundColor: '#fff5f5', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#fca5a5', marginBottom: 12 },
  offlineBox:  { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  errorTxt:    { fontSize: 12, color: '#dc2626', lineHeight: 17 },
  offlineTxt:  { color: '#92400e' },
  offlineHint: { fontSize: 11, color: '#b45309', marginTop: 6 },
  switchBtn:    { marginTop: 10, paddingVertical: 8, backgroundColor: '#1a4a28', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  switchBtnTxt: { fontSize: 12, fontWeight: '700', color: '#fff' },
  switchArrow:  { width: 0, height: 0, borderTopWidth: 4, borderBottomWidth: 4, borderLeftWidth: 6, borderStyle: 'solid', borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: '#fff' },
  hint:        { fontSize: 11, color: '#9ca3af', lineHeight: 16 },

  footer:          { paddingBottom: 12 },
  sendBtn:         { backgroundColor: '#2d7a47', borderRadius: 16, paddingVertical: 17, alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.45 },
  sendTxt:         { fontSize: 16, fontWeight: '800', color: '#fff' },
});

// ── OTP Verification ──────────────────────────────────────────────────────────

function OtpScreen({ phone, onBack }: { phone: string; onBack: () => void }) {
  const { login } = useAuth();
  const { showToast } = useToast();

  const [code,      setCode]      = useState('');
  const [loading,   setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const [error,     setError]     = useState('');
  const [countdown, setCountdown] = useState(30);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(id); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  async function handleVerify(finalCode: string) {
    if (finalCode.length !== 6 || loading) return;
    setLoading(true);
    setError('');
    try {
      const session = await verifyOtp(phone, finalCode);
      await login(session);
      showToast('Welcome to HarvestConnect!', 'success');
    } catch (err) {
      if (isNetworkError(err)) {
        setError('Cannot reach AuthSvc (port 3001). Go back and use ⚡ Dev Login.');
      } else {
        setError(err instanceof Error ? err.message : 'Invalid OTP. Try again.');
      }
      setCode('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError('');
    try {
      await requestOtp(phone);
      setCountdown(30);
      setCode('');
      showToast('New OTP sent!', 'success');
    } catch (err) {
      setError(isNetworkError(err)
        ? 'Cannot reach AuthSvc. Go back and use ⚡ Dev Login.'
        : (err instanceof Error ? err.message : 'Failed to resend.'));
    } finally {
      setResending(false);
    }
  }

  function handleCodeChange(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    setError('');
    if (digits.length === 6) handleVerify(digits);
  }

  const displayPhone = phone.replace('+91', '');

  return (
    <KeyboardAvoidingView style={o.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={o.screen}>
        <SafeAreaView style={o.safe} edges={['top', 'bottom']}>

          <Pressable style={o.back} onPress={onBack}>
            <View style={o.backChevron} /><Text style={o.backTxt}>Back</Text>
          </Pressable>

          <View style={o.body}>
            <View style={o.iconWrap}>
              <Text style={{ fontSize: 36 }}>🔐</Text>
            </View>
            <Text style={o.title}>Verify your{'\n'}number</Text>
            <Text style={o.sub}>
              Enter the 6-digit OTP sent to{'\n'}
              <Text style={o.phone}>+91 {displayPhone}</Text>
            </Text>

            {/* Hidden input captures digits; boxes show them */}
            <TextInput
              ref={inputRef}
              value={code}
              onChangeText={handleCodeChange}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              style={o.hiddenInput}
              caretHidden
            />

            <Pressable style={o.boxRow} onPress={() => inputRef.current?.focus()}>
              {Array.from({ length: 6 }).map((_, i) => {
                const filled = i < code.length;
                const active = i === code.length && !loading;
                return (
                  <View key={i} style={[o.box, filled && o.boxFilled, active && o.boxActive, loading && o.boxLoading]}>
                    {loading && i === 0
                      ? <ActivityIndicator size="small" color="#2d7a47" />
                      : <Text style={[o.boxTxt, filled && o.boxTxtFilled]}>{code[i] ?? ''}</Text>}
                  </View>
                );
              })}
            </Pressable>

            {error ? (
              <View style={o.errorBox}>
                <Text style={o.errorTxt}>{error}</Text>
              </View>
            ) : null}

            {__DEV__ && (
              <View style={o.devHint}>
                <Text style={o.devHintTxt}>Dev: OTP is always <Text style={{ fontWeight: '800' }}>123456</Text></Text>
              </View>
            )}

            <View style={o.resendRow}>
              {countdown > 0 ? (
                <Text style={o.resendCountdown}>Resend OTP in {countdown}s</Text>
              ) : (
                <Pressable onPress={handleResend} disabled={resending}>
                  <Text style={[o.resendBtn, resending && { opacity: 0.5 }]}>
                    {resending ? 'Sending…' : 'Resend OTP'}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

        </SafeAreaView>
      </View>
    </KeyboardAvoidingView>
  );
}

const o = StyleSheet.create({
  flex:   { flex: 1 },
  screen: { flex: 1, backgroundColor: '#f9fafb' },
  safe:   { flex: 1, paddingHorizontal: 24 },

  back:        { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 16, paddingBottom: 8 },
  backChevron: {
    width: 0, height: 0,
    borderTopWidth: 5, borderBottomWidth: 5, borderRightWidth: 8,
    borderStyle: 'solid',
    borderTopColor: 'transparent', borderBottomColor: 'transparent',
    borderRightColor: '#2d7a47',
  },
  backTxt: { fontSize: 14, fontWeight: '600', color: '#2d7a47' },

  body:     { flex: 1, justifyContent: 'center', paddingBottom: 60 },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#f0fdf4',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20, borderWidth: 2, borderColor: '#bbf7d0',
  },
  title: { fontSize: 30, fontWeight: '800', color: '#111827', lineHeight: 38, marginBottom: 10 },
  sub:   { fontSize: 14, color: '#6b7280', lineHeight: 22, marginBottom: 32 },
  phone: { fontWeight: '700', color: '#111827' },

  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },

  boxRow: { flexDirection: 'row', gap: 10, marginBottom: 16, justifyContent: 'center' },
  box: {
    width: 48, height: 58, borderRadius: 14,
    borderWidth: 2, borderColor: '#e5e7eb',
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  boxFilled:    { borderColor: '#2d7a47', backgroundColor: '#f0fdf4' },
  boxActive:    { borderColor: '#2d7a47', shadowColor: '#2d7a47', shadowOpacity: 0.25, shadowRadius: 6, elevation: 3 },
  boxLoading:   { borderColor: '#e5e7eb' },
  boxTxt:       { fontSize: 22, fontWeight: '700', color: '#9ca3af' },
  boxTxtFilled: { color: '#1a4a28' },

  errorBox: { backgroundColor: '#fff5f5', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#fca5a5', marginBottom: 12 },
  errorTxt: { fontSize: 12, color: '#dc2626', lineHeight: 17 },

  devHint:    { backgroundColor: '#fef3c7', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#fde68a', marginBottom: 12, alignItems: 'center' },
  devHintTxt: { fontSize: 12, color: '#92400e' },

  resendRow:       { alignItems: 'center', marginTop: 8 },
  resendCountdown: { fontSize: 13, color: '#9ca3af' },
  resendBtn:       { fontSize: 14, fontWeight: '700', color: '#2d7a47' },
});

// ── AuthFlow orchestrator ─────────────────────────────────────────────────────

export function AuthFlow() {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [phone,  setPhone]  = useState('');

  if (screen === 'welcome') {
    return (
      <WelcomeScreen
        onSignup={() => setScreen('signup')}
        onLogin={() => setScreen('login-phone')}
      />
    );
  }

  if (screen === 'signup') {
    return (
      <SignupScreen
        onOtpSent={(ph) => { setPhone(ph); setScreen('otp'); }}
        onSwitchToLogin={(ph) => { setPhone(ph); setScreen('otp'); }}
        onBack={() => setScreen('welcome')}
        initialPhone={phone}
      />
    );
  }

  if (screen === 'login-phone') {
    return (
      <LoginPhoneScreen
        onOtpSent={(ph) => { setPhone(ph); setScreen('otp'); }}
        onSwitchToSignup={(ph) => { setPhone(ph); setScreen('signup'); }}
        onBack={() => setScreen('welcome')}
      />
    );
  }

  return <OtpScreen phone={phone} onBack={() => setScreen('login-phone')} />;
}
