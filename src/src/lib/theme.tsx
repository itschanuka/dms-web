'use client';

import { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme:       Theme;
  toggleTheme: () => void;
  isDark:      boolean;
  // Color tokens — computed from isDark, used across admin pages
  bg:          string;
  card:        string;
  border:      string;
  text:        string;
  muted:       string;
  inputBg:     string;
}

const DARK_TOKENS = {
  bg:      '#0f172a',
  card:    '#1e293b',
  border:  '#334155',
  text:    '#f1f5f9',
  muted:   '#64748b',
  inputBg: '#0f172a',
};

const LIGHT_TOKENS = {
  bg:      '#f8fafc',
  card:    '#ffffff',
  border:  '#e2e8f0',
  text:    '#0f172a',
  muted:   '#64748b',
  inputBg: '#ffffff',
};

const ThemeContext = createContext<ThemeContextValue>({
  theme:       'dark',
  toggleTheme: () => {},
  isDark:      true,
  ...DARK_TOKENS,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  // Read from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('dms_theme') as Theme | null;
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved);
    }
  }, []);

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('dms_theme', next);
  }

  const tokens = theme === 'dark' ? DARK_TOKENS : LIGHT_TOKENS;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark', ...tokens }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook — use this in any admin component
export function useTheme() {
  return useContext(ThemeContext);
}