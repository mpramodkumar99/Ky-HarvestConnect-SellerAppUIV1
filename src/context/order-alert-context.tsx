import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { useAudioPlayer } from 'expo-audio';

import { listOrders, toSellerTab } from '@/services/order-api';
import { useStore } from '@/context/store-context';
import { useToast } from '@/components/toast-provider';

const POLL_MS = 30_000;

interface OrderAlertCtx {
  testAlert:  () => void;
  stopAlert:  () => void;
}

const OrderAlertContext = createContext<OrderAlertCtx>({
  testAlert: () => {},
  stopAlert: () => {},
});

export function useOrderAlert() {
  return useContext(OrderAlertContext);
}

export function OrderAlertProvider({ children }: { children: ReactNode }) {
  const { activeStore, setNewOrderCount } = useStore();
  const { showToast } = useToast();

  const player    = useAudioPlayer(require('../../assets/sounds/order-alert.m4a'));
  const ringing   = useRef(false);
  const seenIds   = useRef<Set<string>>(new Set());
  const initialized = useRef(false);
  const storeId   = activeStore?.id;

  function startLoop() {
    if (ringing.current) return;
    try {
      ringing.current = true;
      player.loop = true;
      player.seekTo(0);
      player.play();
    } catch { ringing.current = false; }
  }

  function stopAlert() {
    if (!ringing.current) return;
    try {
      ringing.current = false;
      player.loop = false;
      player.pause();
    } catch {}
  }

  function testAlert() {
    try { player.loop = false; player.seekTo(0); player.play(); } catch {}
  }

  async function poll() {
    if (!storeId) return;
    try {
      const orders = await listOrders({ sellerId: storeId });

      const freshNew = orders.filter(
        o => (o.status === 'confirmed' || o.status === 'pending_payment')
          && !seenIds.current.has(o.id)
      );

      orders.forEach(o => seenIds.current.add(o.id));

      const pendingCount = orders.filter(o => toSellerTab(o.status) === 'new').length;
      setNewOrderCount(pendingCount);

      if (initialized.current) {
        if (freshNew.length > 0) {
          startLoop();
          showToast(
            freshNew.length === 1
              ? 'New order received!'
              : `${freshNew.length} new orders received!`,
            'success'
          );
        }
        // Stop ringing if no pending orders remain
        if (pendingCount === 0) stopAlert();
      }

      initialized.current = true;
    } catch { /* network error — silent */ }
  }

  useEffect(() => {
    seenIds.current     = new Set();
    initialized.current = false;
    stopAlert();
    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => { clearInterval(timer); stopAlert(); };
  }, [storeId]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') poll();
    });
    return () => sub.remove();
  }, [storeId]);

  return (
    <OrderAlertContext.Provider value={{ testAlert, stopAlert }}>
      {children}
    </OrderAlertContext.Provider>
  );
}
