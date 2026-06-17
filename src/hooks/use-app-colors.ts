import { useColorScheme } from '@/hooks/use-color-scheme';

const LIGHT = {
  bg:              '#ffffff',
  bgScreen:        '#f9fafb',
  bgMuted:         '#f9fafb',
  bgSubtle:        '#f3f4f6',
  border:          '#e5e7eb',
  borderLight:     '#f3f4f6',
  borderMid:       '#d1d5db',
  text:            '#111827',
  textSub:         '#374151',
  textMuted:       '#6b7280',
  textFaint:       '#9ca3af',
  primary:         '#2d7a47',
  primaryBg:       '#f0fdf4',
  primaryBgStrong: '#dcfce7',
  primaryText:     '#166534',
  primaryBorder:   '#86efac',
  primaryLight:    '#4ade80',
  errorBg:         '#fff5f5',
  errorBorder:     '#fca5a5',
  errorText:       '#dc2626',
  errorTextDark:   '#991b1b',
  warningBg:       '#fffbeb',
  warningText:     '#92400e',
  warningTextDark: '#78350f',
  warningBorder:   '#fde68a',
};

const DARK = {
  bg:              '#1c1c1e',
  bgScreen:        '#000000',
  bgMuted:         '#2c2c2e',
  bgSubtle:        '#3a3a3c',
  border:          '#38383a',
  borderLight:     '#2c2c2e',
  borderMid:       '#48484a',
  text:            '#ffffff',
  textSub:         '#e5e5ea',
  textMuted:       '#8e8e93',
  textFaint:       '#636366',
  primary:         '#2d7a47',
  primaryBg:       '#0d2218',
  primaryBgStrong: '#0f2d20',
  primaryText:     '#4ade80',
  primaryBorder:   '#1a4a2e',
  primaryLight:    '#86efac',
  errorBg:         '#2d0a0a',
  errorBorder:     '#7f1d1d',
  errorText:       '#f87171',
  errorTextDark:   '#fca5a5',
  warningBg:       '#1c1000',
  warningText:     '#fbbf24',
  warningTextDark: '#f59e0b',
  warningBorder:   '#92400e',
};

export type AppColors = typeof LIGHT;

export function useAppColors(): AppColors {
  const scheme = useColorScheme();
  return scheme === 'dark' ? DARK : LIGHT;
}
