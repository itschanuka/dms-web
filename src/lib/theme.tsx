'use client';

import { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme:       Theme;
  toggleTheme: () => void;
  isDark:      boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme:       'dark',
  toggleTheme: () => {},
  isDark:      true,
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

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook — use this in any admin component
export function useTheme() {
  return useContext(ThemeContext);
}