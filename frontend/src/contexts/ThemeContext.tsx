import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Theme = 'dark' | 'light';
export type ColorPalette = 'slate' | 'blue' | 'purple' | 'emerald' | 'rose' | 'amber';

export interface ThemeColors {
  bg: {
    primary: string;
    secondary: string;
    tertiary: string;
    hover: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  border: {
    light: string;
    default: string;
    dark: string;
  };
  accent: {
    primary: string;
    hover: string;
    light: string;
    dark: string;
  };
  card: {
    bg: string;
    border: string;
    hover: string;
  };
  button: {
    primary: string;
    primaryHover: string;
    secondary: string;
    secondaryHover: string;
    ghost: string;
    outline: string;
    danger: string;
    focusOffset: string;
  };
  input: {
    bg: string;
    text: string;
    placeholder: string;
    border: string;
    label: string;
    helper: string;
  };
  pill: {
    neutral: string;
  };
  table: {
    wrapper: string;
    header: string;
    row: string;
    divider: string;
  };
}

const themeColorPalettes: Record<Theme, ThemeColors> = {
  dark: {
    bg: { primary: 'bg-slate-950', secondary: 'bg-slate-900', tertiary: 'bg-slate-800', hover: 'hover:bg-slate-800' },
    text: { primary: 'text-slate-50', secondary: 'text-slate-300', tertiary: 'text-slate-400' },
    border: { light: 'border-slate-700', default: 'border-slate-800', dark: 'border-slate-900' },
    accent: { primary: 'text-indigo-400', hover: 'hover:text-indigo-300', light: 'text-indigo-500', dark: 'text-indigo-600' },
    card: { bg: 'bg-slate-900/80', border: 'border-slate-700', hover: 'hover:border-slate-600' },
    button: {
      primary: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-950/20',
      secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700',
      ghost: 'bg-transparent text-slate-300 hover:bg-slate-800 hover:text-slate-50 border-transparent',
      outline: 'bg-transparent text-slate-200 border-slate-700 hover:bg-slate-800 hover:border-slate-600 hover:text-slate-50',
      danger: 'bg-rose-600/15 hover:bg-rose-600 text-rose-300 hover:text-white border-rose-500/30',
      primaryHover: 'hover:bg-indigo-500',
      secondaryHover: 'hover:bg-slate-700',
      focusOffset: 'focus:ring-offset-slate-950',
    },
    input: {
      bg: 'bg-slate-900',
      text: 'text-slate-100',
      placeholder: 'placeholder-slate-500',
      border: 'border-slate-700 hover:border-slate-600',
      label: 'text-slate-400',
      helper: 'text-slate-500',
    },
    pill: {
      neutral: 'border-slate-700 bg-slate-900/70 text-slate-300',
    },
    table: {
      wrapper: 'border-slate-700 bg-slate-900',
      header: 'bg-slate-800 text-slate-300 border-slate-700',
      row: 'hover:bg-slate-800/60',
      divider: 'divide-slate-800 border-slate-800',
    },
  },
  light: {
    bg: { primary: 'bg-slate-50', secondary: 'bg-white', tertiary: 'bg-slate-100', hover: 'hover:bg-slate-100' },
    text: { primary: 'text-slate-900', secondary: 'text-slate-700', tertiary: 'text-slate-600' },
    border: { light: 'border-slate-200', default: 'border-slate-200', dark: 'border-slate-300' },
    accent: { primary: 'text-indigo-600', hover: 'hover:text-indigo-700', light: 'text-indigo-400', dark: 'text-indigo-800' },
    card: { bg: 'bg-white', border: 'border-slate-200', hover: 'hover:border-slate-300' },
    button: {
      primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200/60',
      secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300',
      ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-transparent',
      outline: 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 hover:border-slate-400 hover:text-slate-950',
      danger: 'bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border-rose-200',
      primaryHover: 'hover:bg-indigo-700',
      secondaryHover: 'hover:bg-slate-200',
      focusOffset: 'focus:ring-offset-slate-50',
    },
    input: {
      bg: 'bg-white',
      text: 'text-slate-900',
      placeholder: 'placeholder-slate-400',
      border: 'border-slate-300 hover:border-slate-400',
      label: 'text-slate-600',
      helper: 'text-slate-500',
    },
    pill: {
      neutral: 'border-slate-300 bg-white text-slate-700',
    },
    table: {
      wrapper: 'border-slate-200 bg-white',
      header: 'bg-slate-100 text-slate-700 border-slate-200',
      row: 'hover:bg-slate-50',
      divider: 'divide-slate-200 border-slate-200',
    },
  },
};

interface ThemeContextValue {
  theme: Theme;
  colors: ThemeColors;
  palette: ColorPalette;
  setPalette: (palette: ColorPalette) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme') as Theme | null;
    if (saved === 'dark' || saved === 'light') return saved;
    return 'dark';
  });
  const [palette, setPaletteState] = useState<ColorPalette>(() => {
    const saved = localStorage.getItem('palette') as ColorPalette | null;
    if (saved && ['slate', 'blue', 'purple', 'emerald', 'rose', 'amber'].includes(saved)) {
      return saved;
    }
    return 'slate';
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.dataset.theme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.dataset.theme = 'light';
    }
  }, [theme]);

  const setPalette = (nextPalette: ColorPalette) => {
    setPaletteState(nextPalette);
    localStorage.setItem('palette', nextPalette);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const colors = themeColorPalettes[theme];

  return (
    <ThemeContext.Provider value={{ theme, colors, palette, setPalette, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
