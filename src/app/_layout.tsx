import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppGate from '@/components/app-gate';
import { AuthProvider } from '@/context/auth-context';
import { StoreProvider } from '@/context/store-context';
import { ToastProvider } from '@/components/toast-provider';
import { LanguageProvider } from '@/context/language-context';
import { ThemePreferenceProvider, useThemePreference } from '@/context/theme-context';
import { OrderAlertProvider } from '@/context/order-alert-context';

function AppWithTheme() {
  const { scheme } = useThemePreference();
  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <LanguageProvider>
        <AuthProvider>
          <StoreProvider>
            <ToastProvider>
              <OrderAlertProvider>
                <AnimatedSplashOverlay />
                <AppGate />
              </OrderAlertProvider>
            </ToastProvider>
          </StoreProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default function TabLayout() {
  return (
    <ThemePreferenceProvider>
      <AppWithTheme />
    </ThemePreferenceProvider>
  );
}
