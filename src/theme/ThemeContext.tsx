import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { monoInkCream, midnightGoldLifted } from './colors';
import { tokens } from './tokens';
import { Theme, ThemeMode } from './types';

interface ThemeContextValue {
  theme: Theme;
  tokens: typeof tokens;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(systemScheme === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    if (systemScheme === 'dark' || systemScheme === 'light') {
      setMode(systemScheme);
    }
  }, [systemScheme]);

  const theme: Theme = useMemo(
    () => ({
      mode,
      colors: mode === 'light' ? monoInkCream : midnightGoldLifted,
    }),
    [mode]
  );

  const toggleMode = () => setMode((m) => (m === 'light' ? 'dark' : 'light'));

  const value: ThemeContextValue = { theme, tokens, mode, setMode, toggleMode };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme() must be called inside a <ThemeProvider>');
  }
  return ctx;
}
