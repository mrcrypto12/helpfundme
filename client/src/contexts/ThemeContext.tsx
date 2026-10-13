import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

type Theme = 'dark' | 'light';
type ThemeContextValue = { theme: Theme; toggleTheme: () => void };

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  const [preference, setPreference] = useState<Theme | null>(() => {
    const saved = localStorage.getItem('helpfundme-theme');
    return saved === 'light' || saved === 'dark' ? saved : null;
  });
  const theme: Theme = preference ?? (pathname === '/' ? 'light' : 'dark');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setPreference(next);
    localStorage.setItem('helpfundme-theme', next);
  };

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
