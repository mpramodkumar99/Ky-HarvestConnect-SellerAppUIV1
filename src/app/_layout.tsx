import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppGate from '@/components/app-gate';
import { AuthProvider } from '@/context/auth-context';
import { StoreProvider } from '@/context/store-context';
import { ToastProvider } from '@/components/toast-provider';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <StoreProvider>
          <ToastProvider>
            <AnimatedSplashOverlay />
            <AppGate />
          </ToastProvider>
        </StoreProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
