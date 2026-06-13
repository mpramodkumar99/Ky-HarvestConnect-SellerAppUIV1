import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { StoreProvider } from '@/context/store-context';
import { ToastProvider } from '@/components/toast-provider';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StoreProvider>
        <ToastProvider>
          <AnimatedSplashOverlay />
          <AppTabs />
        </ToastProvider>
      </StoreProvider>
    </ThemeProvider>
  );
}
