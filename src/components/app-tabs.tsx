import {
  Tabs,
  TabList,
  TabSlot,
  TabTrigger,
  type TabTriggerSlotProps,
  type TabListProps,
} from 'expo-router/ui';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '@/context/store-context';
import { useLanguage } from '@/context/language-context';
import { useAppColors } from '@/hooks/use-app-colors';

type TabButtonProps = TabTriggerSlotProps & { icon?: string; badge?: number };

function TabButton({ icon = '', badge, isFocused, children, ...props }: TabButtonProps) {
  const c = useAppColors();
  const color = isFocused ? c.primary : c.textMuted;
  return (
    <Pressable {...props} style={s.tab}>
      <View style={s.iconWrap}>
        <Text style={s.icon}>{icon}</Text>
        {!!badge && (
          <View style={s.badge}>
            <Text style={s.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={[s.label, { color }]}>{children as string}</Text>
      {isFocused && <View style={s.indicator} />}
    </Pressable>
  );
}

function BottomBar({ children, ...props }: TabListProps) {
  const insets = useSafeAreaInsets();
  const c = useAppColors();
  return (
    <View
      {...props}
      style={[s.bar, { paddingBottom: Math.max(insets.bottom, 8), backgroundColor: c.bg, borderTopColor: c.border }]}>
      {children}
    </View>
  );
}

export default function AppTabs() {
  const { newOrderCount } = useStore();
  const { t } = useLanguage();
  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />
      <TabList asChild>
        <BottomBar>
          {/* @ts-ignore icon is a custom prop passed through asChild */}
          <TabTrigger name="index" href="/" asChild>
            <TabButton icon="📊">{t('tab_dashboard')}</TabButton>
          </TabTrigger>
          {/* @ts-ignore */}
          <TabTrigger name="products" href="/products" asChild>
            <TabButton icon="🌾">{t('tab_products')}</TabButton>
          </TabTrigger>
          {/* @ts-ignore */}
          <TabTrigger name="orders" href="/orders" asChild>
            <TabButton icon="📦" badge={newOrderCount || undefined}>{t('tab_orders')}</TabButton>
          </TabTrigger>
          {/* @ts-ignore */}
          <TabTrigger name="analytics" href="/analytics" asChild>
            <TabButton icon="📈">{t('tab_analytics')}</TabButton>
          </TabTrigger>
          {/* @ts-ignore */}
          <TabTrigger name="profile" href="/profile" asChild>
            <TabButton icon="🏪">{t('tab_store')}</TabButton>
          </TabTrigger>
        </BottomBar>
      </TabList>
    </Tabs>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingBottom: 4,
    position: 'relative',
  },
  iconWrap: { position: 'relative' },
  icon: { fontSize: 20 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#dc2626',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#ffffff', fontSize: 9, fontWeight: '700' },
  label: { fontSize: 10, fontWeight: '500' },
  indicator: {
    position: 'absolute',
    bottom: -4,
    width: 28,
    height: 3,
    backgroundColor: '#2d7a47',
    borderRadius: 2,
  },
});
