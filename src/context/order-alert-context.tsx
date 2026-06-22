import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { useAudioPlayer } from 'expo-audio';

import { listOrders, toSellerTab, type Order } from '@/services/order-api';
import { useStore } from '@/context/store-context';
import { useToast } from '@/components/toast-provider';

const POLL_MS = 8_000; // poll every 8 s — fast enough to feel real-time

interface OrderAlertCtx {
  testAlert:      () => void;
  stopAlert:      () => void;
  orders:         Order[];
  ordersLoading:  boolean;
  refreshOrders:  () => void;
}

const OrderAlertContext = createContext<OrderAlertCtx>({
  testAlert:     () => {},
  stopAlert:     () => {},
  orders:        [],
  ordersLoading: false,
  refreshOrders: () => {},
});

export function useOrderAlert() {
  return useContext(OrderAlertContext);
}

export function OrderAlertProvider({ children }: { children: ReactNode }) {
  const { activeStore, setNewOrderCount } = useStore();
  const { showToast } = useToast();

  const player      = useAudioPlayer(require('../../assets/sounds/order-alert.m4a'));
  const ringing     = useRef(false);
  const seenIds     = useRef<Set<string>>(new Set());
  const initialized = useRef(false);
  const storeId     = activeStore?.id;

  const [orders,        setOrders]        = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const startLoop = useCallback(() => {
    if (ringing.current) return;
    try {
      ringing.current = true;
      player.loop = true;
      player.seekTo(0);
      player.play();
    } catch { ringing.current = false; }
  }, [player]);

  const stopAlert = useCallback(() => {
    if (!ringing.current) return;
    try {
      ringing.current = false;
      player.loop = false;
      player.pause();
    } catch {}
  }, [player]);

  const testAlert = useCallback(() => {
    try { player.loop = false; player.seekTo(0); player.play(); } catch {}
  }, [player]);

  // poll is stable per storeId — useCallback ensures setInterval / AppState
  // always call the latest version without capturing a stale closure.
  const poll = useCallback(async (showLoading = false) => {
    if (!storeId) return;
    if (showLoading) setOrdersLoading(true);
    try {
      const fetched = await listOrders({ sellerId: storeId });

      setOrders(fetched);

      // Any order in the "New" tab that we haven't seen before
      const freshNew = fetched.filter(
        o => toSellerTab(o.status) === 'new' && !seenIds.current.has(o.id),
      );

      // Mark every fetched order as seen so we don't re-alert
      fetched.forEach(o => seenIds.current.add(o.id));

      const newTabCount = fetched.filter(o => toSellerTab(o.status) === 'new').length;
      setNewOrderCount(newTabCount);

      if (initialized.current) {
        if (freshNew.length > 0) {
          startLoop();
          showToast(
            freshNew.length === 1
              ? `🛒 New order received!`
              : `🛒 ${freshNew.length} new orders received!`,
            'success',
          );
        }
        if (newTabCount === 0) stopAlert();
      }

      initialized.current = true;
    } catch { /* silent — network may be temporarily down */ }
    finally { if (showLoading) setOrdersLoading(false); }
  }, [storeId, showToast, setNewOrderCount, startLoop, stopAlert]);

  const refreshOrders = useCallback(() => { poll(true); }, [poll]);

  // Reset and start polling whenever the active store changes
  useEffect(() => {
    seenIds.current     = new Set();
    initialized.current = false;
    setOrders([]);
    stopAlert();
    poll(true);
    const timer = setInterval(() => poll(false), POLL_MS);
    return () => { clearInterval(timer); stopAlert(); };
  }, [poll, stopAlert]);

  // Re-poll immediately when app comes back to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') poll(false);
    });
    return () => sub.remove();
  }, [poll]);

  return (
    <OrderAlertContext.Provider value={{ testAlert, stopAlert, orders, ordersLoading, refreshOrders }}>
      {children}
    </OrderAlertContext.Provider>
  );
}
