import { createContext, useContext, useState, useEffect } from 'react';

const THEMES = ['adventure', 'mystery', 'scifi', 'fantasy', 'horror'];
const MODES = ['day', 'night'];

const STORAGE_KEYS = {
  theme: 'spellpath-theme',
  mode: 'spellpath-mode',
};

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  // Load from localStorage or use defaults
  const [theme, setThemeState] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.theme);
      return saved && THEMES.includes(saved) ? saved : 'adventure';
    }
    return 'adventure';
  });

  const [mode, setModeState] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.mode);
      return saved && MODES.includes(saved) ? saved : 'day';
    }
    return 'day';
  });

  // Sync to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.theme, theme);
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.mode, mode);
    }
  }, [mode]);

  // Sync to DOM data attributes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = theme;
      document.documentElement.dataset.mode = mode;
    }
  }, [theme, mode]);

  const setTheme = (newTheme) => {
    if (THEMES.includes(newTheme)) {
      setThemeState(newTheme);
    }
  };

  const setMode = (newMode) => {
    if (MODES.includes(newMode)) {
      setModeState(newMode);
    }
  };

  const toggleMode = () => {
    setModeState(prev => prev === 'day' ? 'night' : 'day');
  };

  const value = {
    theme,
    mode,
    setTheme,
    setMode,
    toggleMode,
    themes: THEMES,
    modes: MODES,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

