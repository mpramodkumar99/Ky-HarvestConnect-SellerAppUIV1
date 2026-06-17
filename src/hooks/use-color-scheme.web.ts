import { useContext, useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { ThemeContext } from '@/context/theme-context';

export function useColorScheme(): 'light' | 'dark' {
  const ctx = useContext(ThemeContext);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => { setHasHydrated(true); }, []);

  const system = (useRNColorScheme() ?? 'light') as 'light' | 'dark';

  if (!hasHydrated) return 'light';
  return ctx ? ctx.scheme : system;
}
