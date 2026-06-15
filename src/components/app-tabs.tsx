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

type TabButtonProps = TabTriggerSlotProps & { icon?: string; badge?: number };

function TabButton({ icon = '', badge, isFocused, children, ...props }: TabButtonProps) {
  const color = isFocused ? '#2d7a47' : '#6b7280';
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
  return (
    <View {...props} style={[s.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {children}
    </View>
  );
}

export default function AppTabs() {
  const { newOrderCount } = useStore();
  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />
      <TabList asChild>
        <BottomBar>
          {/* @ts-ignore icon is a custom prop passed through asChild */}
          <TabTrigger name="index" href="/" asChild>
            <TabButton icon="📊">Dashboard</TabButton>
          </TabTrigger>
          {/* @ts-ignore */}
          <TabTrigger name="products" href="/products" asChild>
            <TabButton icon="🌾">Products</TabButton>
          </TabTrigger>
          {/* @ts-ignore */}
          <TabTrigger name="orders" href="/orders" asChild>
            <TabButton icon="📦" badge={newOrderCount || undefined}>Orders</TabButton>
          </TabTrigger>
          {/* @ts-ignore */}
          <TabTrigger name="analytics" href="/analytics" asChild>
            <TabButton icon="📈">Analytics</TabButton>
          </TabTrigger>
          {/* @ts-ignore */}
          <TabTrigger name="profile" href="/profile" asChild>
            <TabButton icon="🏪">Store</TabButton>
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
