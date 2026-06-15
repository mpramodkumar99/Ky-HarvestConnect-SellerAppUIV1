import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastEntry {
  message: string;
  type: ToastType;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
  showConfirm: (options: ConfirmOptions) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}

// ── Theme config per toast type ───────────────────────────────────────────────

const TOAST_THEME: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
  success: { bg: '#f0fdf4', border: '#86efac', icon: '✅', text: '#166534' },
  error:   { bg: '#fef2f2', border: '#fca5a5', icon: '✕',  text: '#991b1b' },
  warning: { bg: '#fffbeb', border: '#fde68a', icon: '⚠️', text: '#92400e' },
  info:    { bg: '#f0f9ff', border: '#bae6fd', icon: '💬', text: '#075985' },
};

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastEntry | null>(null);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);
  const slideY = useRef(new Animated.Value(-120)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    setToast({ message, type });
    slideY.setValue(-120);
    Animated.spring(slideY, { toValue: 0, useNativeDriver: true, bounciness: 4, speed: 14 }).start();
    dismissTimer.current = setTimeout(() => {
      Animated.timing(slideY, { toValue: -120, duration: 220, useNativeDriver: true }).start(() =>
        setToast(null)
      );
    }, 3200);
  }, [slideY]);

  const showConfirm = useCallback((options: ConfirmOptions) => {
    setConfirm(options);
  }, []);

  function handleConfirm() {
    const cb = confirm?.onConfirm;
    setConfirm(null);
    cb?.();
  }

  const cfg = toast ? TOAST_THEME[toast.type] : null;

  return (
    <ToastContext.Provider value={{ showToast, showConfirm }}>
      {children}

      {/* ── Toast ─────────────────────────────────────────────────────── */}
      {toast && cfg && (
        <Animated.View
          pointerEvents="none"
          style={[s.toastWrap, { top: insets.top + 10, transform: [{ translateY: slideY }] }]}
        >
          <View style={[s.toast, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
            <Text style={s.toastIcon}>{cfg.icon}</Text>
            <Text style={[s.toastMsg, { color: cfg.text }]} numberOfLines={3}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}

      {/* ── Confirm Sheet ─────────────────────────────────────────────── */}
      <Modal
        visible={!!confirm}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setConfirm(null)}
      >
        <View style={s.container}>
          <Pressable style={[StyleSheet.absoluteFill, s.backdrop]} onPress={() => setConfirm(null)} />
          <View style={s.sheet}>
            <View style={s.sheetBar} />
            <Text style={s.sheetTitle}>{confirm?.title}</Text>
            <Text style={s.sheetMsg}>{confirm?.message}</Text>
            <View style={s.sheetBtns}>
              <Pressable style={s.cancelBtn} onPress={() => setConfirm(null)}>
                <Text style={s.cancelTxt}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[s.confirmBtn, confirm?.destructive && s.destructiveBtn]}
                onPress={handleConfirm}
              >
                <Text style={s.confirmTxt}>{confirm?.confirmLabel ?? 'Confirm'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ToastContext.Provider>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Toast
  toastWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  toastIcon: { fontSize: 18 },
  toastMsg: { flex: 1, fontSize: 14, fontWeight: '500', lineHeight: 20 },

  // Confirm sheet
  container: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 12,
  },
  sheetBar: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
    marginBottom: 20,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  sheetMsg: { fontSize: 14, color: '#6b7280', lineHeight: 21, marginBottom: 28 },
  sheetBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  cancelTxt: { fontSize: 15, fontWeight: '600', color: '#374151' },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2d7a47',
    alignItems: 'center',
  },
  destructiveBtn: { backgroundColor: '#dc2626' },
  confirmTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
