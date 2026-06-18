import { useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, ScrollView, Platform } from 'react-native';

import { useStore, ROLE_CONFIG } from '@/context/store-context';
import { useLanguage } from '@/context/language-context';
import { useAppColors, type AppColors } from '@/hooks/use-app-colors';
import { CreateStoreModal } from '@/components/create-store-modal';
import { useToast } from '@/components/toast-provider';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function StoreSwitcher({ visible, onClose }: Props) {
  const { stores, activeStore, setActiveStore, addStore } = useStore();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const c = useAppColors();
  const s = makeStyles(c);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
    <CreateStoreModal
      visible={createOpen}
      existingTypes={stores.map(s => s.type)}
      onCreated={(store) => {
        addStore(store);
        setCreateOpen(false);
        onClose();
        showToast(`${store.name} ${t('switcher_created_msg')}`, 'success');
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
            <Text style={s.title}>{t('switcher_title')}</Text>
            <Text style={s.sub}>
              {t('switcher_managing')} {stores.length} {t('switcher_stores')}
            </Text>
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
                        <Text style={s.activePillTxt}>{t('profile_viewing')}</Text>
                      </View>
                    )}
                  </View>
                  <View style={s.statusRow}>
                    <View style={[s.statusPill, store.status === 'live' ? s.statusPillLive : s.statusPillOff]}>
                      <Text style={[s.statusTxt, store.status === 'live' ? s.statusTxtLive : s.statusTxtOff]}>
                        {store.status === 'live' ? t('profile_store_live') : t('profile_store_offline')}
                      </Text>
                    </View>
                    <Text style={s.storeCat}>{store.category}</Text>
                  </View>
                  <Text style={s.storeLoc}>📍 {store.location}</Text>
                  <View style={s.metaRow}>
                    <Text style={s.metaTxt}>{store.productCount} {t('switcher_products')}</Text>
                    <Text style={s.metaDot}>·</Text>
                    <Text style={s.metaTxt}>{store.memberCount} {t('switcher_members')}</Text>
                    <Text style={s.metaDot}>·</Text>
                    <Text style={s.metaTxt}>{store.ordersToday} {t('switcher_orders_today')}</Text>
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
              <Text style={s.newStoreTxt}>{t('switcher_create_store')}</Text>
              <Text style={s.newStoreSub}>{t('switcher_create_sub')}</Text>
            </View>
          </Pressable>
        </View>
      </View>
      </View>
    </Modal>
    </>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: {
      backgroundColor: c.bg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '80%',
      paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    },
    handle: {
      width: 40, height: 4,
      backgroundColor: c.borderMid,
      borderRadius: 2,
      alignSelf: 'center',
      marginTop: 10, marginBottom: 6,
    },
    sheetHead: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.borderLight,
    },
    title: { fontSize: 18, fontWeight: '700', color: c.text },
    sub: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    closeX: {
      width: 32, height: 32,
      backgroundColor: c.bgSubtle,
      borderRadius: 16,
      alignItems: 'center', justifyContent: 'center',
      marginTop: 2,
    },
    closeXTxt: { fontSize: 13, color: c.textSub, fontWeight: '600' },

    list: { paddingHorizontal: 16, paddingTop: 8 },

    storeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12, padding: 14,
      borderRadius: 14, marginBottom: 8,
      backgroundColor: c.bgMuted,
      borderWidth: 1, borderColor: c.borderLight,
    },
    storeRowActive: { backgroundColor: c.primaryBg, borderColor: c.primaryLight },
    storeEmoji: {
      width: 52, height: 52,
      borderRadius: 14,
      backgroundColor: c.bgSubtle,
      alignItems: 'center', justifyContent: 'center',
    },
    storeEmojiActive: { backgroundColor: c.primaryBgStrong },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    storeName: { fontSize: 14, fontWeight: '700', color: c.text },
    storeNameActive: { color: c.primaryText },
    rolePill: { borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2 },
    roleText: { fontSize: 10, fontWeight: '700' },
    activePill: {
      backgroundColor: '#2d7a47',
      borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2,
    },
    activePillTxt: { fontSize: 10, fontWeight: '700', color: '#fff' },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statusPill: { borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2 },
    statusPillLive: { backgroundColor: '#dcfce7' },
    statusPillOff:  { backgroundColor: c.bgSubtle },
    statusTxt:     { fontSize: 10, fontWeight: '700' },
    statusTxtLive: { color: '#166534' },
    statusTxtOff:  { color: c.textMuted },
    storeCat: { fontSize: 11, color: c.textMuted },
    storeLoc: { fontSize: 11, color: c.textFaint },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    metaTxt: { fontSize: 10, color: c.textFaint },
    metaDot: { fontSize: 10, color: c.borderMid },
    checkmark: { fontSize: 20, color: c.primary, fontWeight: '700' },
    chevron: { fontSize: 20, color: c.borderMid },

    footer: {
      paddingHorizontal: 16, paddingTop: 12,
      borderTopWidth: 1, borderTopColor: c.borderLight,
    },
    newStoreBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: c.primaryBg,
      borderRadius: 14, padding: 14,
      borderWidth: 1.5, borderColor: c.primaryLight,
      borderStyle: 'dashed',
    },
    newStoreIcon: { fontSize: 28, color: c.primary },
    newStoreTxt: { fontSize: 14, fontWeight: '700', color: c.primary },
    newStoreSub: { fontSize: 11, color: c.primaryLight, marginTop: 1 },
  });
}
