import { useContext } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { ThemeContext } from '@/context/theme-context';

export function useColorScheme(): 'light' | 'dark' {
  const ctx = useContext(ThemeContext);
  const system = (useRNColorScheme() ?? 'light') as 'light' | 'dark';
  return ctx ? ctx.scheme : system;
}
