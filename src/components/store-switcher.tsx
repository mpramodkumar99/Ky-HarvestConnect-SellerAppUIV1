import { useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, ScrollView, Platform } from 'react-native';

import { useStore, ROLE_CONFIG } from '@/context/store-context';
import { CreateStoreModal } from '@/components/create-store-modal';
import { useToast } from '@/components/toast-provider';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function StoreSwitcher({ visible, onClose }: Props) {
  const { stores, activeStore, setActiveStore, addStore } = useStore();
  const { showToast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
    <CreateStoreModal
      visible={createOpen}
      onCreated={(store) => {
        addStore(store);
        setCreateOpen(false);
        onClose();
        showToast(`${store.name} created! Upload KYC to get verified.`, 'success');
      }}
      onClose={() => setCreateOpen(false)}
    />
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={s.container}>
        <Pressable style={[StyleSheet.absoluteFill, s.backdrop]} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.handle} />

        <View style={s.sheetHead}>
          <View>
            <Text style={s.title}>Switch Store</Text>
            <Text style={s.sub}>You are managing {stores.length} stores</Text>
          </View>
          <Pressable style={s.closeX} onPress={onClose}>
            <Text style={s.closeXTxt}>✕</Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={s.list}>
          {stores.map((store) => {
            const rc = ROLE_CONFIG[store.role];
            const isActive = store.id === activeStore.id;
            return (
              <Pressable
                key={store.id}
                style={[s.storeRow, isActive && s.storeRowActive]}
                onPress={() => {
                  setActiveStore(store);
                  onClose();
                }}>
                <View style={[s.storeEmoji, isActive && s.storeEmojiActive]}>
                  <Text style={{ fontSize: 26 }}>{store.icon}</Text>
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <View style={s.nameRow}>
                    <Text style={[s.storeName, isActive && s.storeNameActive]} numberOfLines={1}>
                      {store.name}
                    </Text>
                    <View style={[s.rolePill, { backgroundColor: rc.bg }]}>
                      <Text style={[s.roleText, { color: rc.color }]}>{rc.label}</Text>
                    </View>
                    {isActive && (
                      <View style={s.activePill}>
                        <Text style={s.activePillTxt}>Active</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.storeCat}>{store.category}</Text>
                  <Text style={s.storeLoc}>📍 {store.location}</Text>
                  <View style={s.metaRow}>
                    <Text style={s.metaTxt}>{store.productCount} products</Text>
                    <Text style={s.metaDot}>·</Text>
                    <Text style={s.metaTxt}>{store.memberCount} members</Text>
                    <Text style={s.metaDot}>·</Text>
                    <Text style={s.metaTxt}>{store.ordersToday} orders today</Text>
                  </View>
                </View>

                {isActive ? (
                  <Text style={s.checkmark}>✓</Text>
                ) : (
                  <Text style={s.chevron}>›</Text>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={s.footer}>
          <Pressable style={s.newStoreBtn} onPress={() => setCreateOpen(true)}>
            <Text style={s.newStoreIcon}>＋</Text>
            <View>
              <Text style={s.newStoreTxt}>Create New Store</Text>
              <Text style={s.newStoreSub}>Set up another storefront on HarvestConnect</Text>
            </View>
          </Pressable>
        </View>
      </View>
      </View>
    </Modal>
    </>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  sub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  closeX: {
    width: 32,
    height: 32,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  closeXTxt: { fontSize: 13, color: '#374151', fontWeight: '600' },

  list: { paddingHorizontal: 16, paddingTop: 8 },

  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  storeRowActive: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  storeEmoji: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeEmojiActive: { backgroundColor: '#dcfce7' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  storeName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  storeNameActive: { color: '#166534' },
  rolePill: {
    borderRadius: 99,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  roleText: { fontSize: 10, fontWeight: '700' },
  activePill: {
    backgroundColor: '#2d7a47',
    borderRadius: 99,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  activePillTxt: { fontSize: 10, fontWeight: '700', color: '#fff' },
  storeCat: { fontSize: 11, color: '#6b7280' },
  storeLoc: { fontSize: 11, color: '#9ca3af' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  metaTxt: { fontSize: 10, color: '#9ca3af' },
  metaDot: { fontSize: 10, color: '#d1d5db' },
  checkmark: { fontSize: 20, color: '#2d7a47', fontWeight: '700' },
  chevron: { fontSize: 20, color: '#d1d5db' },

  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  newStoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#f0fdf4',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#86efac',
    borderStyle: 'dashed',
  },
  newStoreIcon: { fontSize: 28, color: '#2d7a47' },
  newStoreTxt: { fontSize: 14, fontWeight: '700', color: '#2d7a47' },
  newStoreSub: { fontSize: 11, color: '#4ade80', marginTop: 1 },
});
