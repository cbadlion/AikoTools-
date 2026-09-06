import React, { createContext, useContext, useState } from 'react';

export type ThemeAccent = 'crimson' | 'emerald' | 'amber' | 'cyan' | 'electric-blue';

export interface ThemeConfig {
  id: ThemeAccent;
  name: string;
  label: string;
  icon: string;
  primary: string; // Hex for logo/canvas/accents
  primaryGlow: string;
  gradient: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  cardActiveBorder: string;
  cardActiveBg: string;
  ringColor: string;
  buttonGradient: string;
  textAccent: string;
}

export const THEMES: Record<ThemeAccent, ThemeConfig> = {
  crimson: {
    id: 'crimson',
    name: 'Crimson Red Pro',
    label: '🔥 Crimson Red Pro',
    icon: '🔥',
    primary: '#EF4444',
    primaryGlow: 'rgba(239, 68, 68, 0.45)',
    gradient: 'from-red-500 via-rose-600 to-amber-600',
    badgeBg: 'bg-red-950/40',
    badgeText: 'text-red-400',
    badgeBorder: 'border-red-500/30',
    cardActiveBorder: 'border-red-500',
    cardActiveBg: 'bg-[#1E1114]',
    ringColor: 'ring-red-500/60',
    buttonGradient: 'from-red-600 via-red-500 to-rose-600 hover:from-red-500 hover:to-rose-500',
    textAccent: 'text-red-400'
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Studio',
    label: '🍃 Emerald Studio',
    icon: '🍃',
    primary: '#10B981',
    primaryGlow: 'rgba(16, 185, 129, 0.45)',
    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    badgeBg: 'bg-emerald-950/40',
    badgeText: 'text-emerald-400',
    badgeBorder: 'border-emerald-500/30',
    cardActiveBorder: 'border-emerald-500',
    cardActiveBg: 'bg-[#0E1F18]',
    ringColor: 'ring-emerald-500/60',
    buttonGradient: 'from-emerald-600 via-teal-500 to-emerald-700 hover:from-emerald-500 hover:to-teal-600',
    textAccent: 'text-emerald-400'
  },
  amber: {
    id: 'amber',
    name: 'Sunset Gold',
    label: '🌅 Sunset Gold',
    icon: '🌅',
    primary: '#F59E0B',
    primaryGlow: 'rgba(245, 158, 11, 0.45)',
    gradient: 'from-amber-500 via-orange-500 to-rose-500',
    badgeBg: 'bg-amber-950/40',
    badgeText: 'text-amber-400',
    badgeBorder: 'border-amber-500/30',
    cardActiveBorder: 'border-amber-500',
    cardActiveBg: 'bg-[#221B13]',
    ringColor: 'ring-amber-500/60',
    buttonGradient: 'from-amber-600 via-orange-500 to-rose-600 hover:from-amber-500 hover:to-rose-500',
    textAccent: 'text-amber-400'
  },
  cyan: {
    id: 'cyan',
    name: 'Cyber Cyan',
    label: '⚡ Cyber Cyan',
    icon: '⚡',
    primary: '#06B6D4',
    primaryGlow: 'rgba(6, 182, 212, 0.45)',
    gradient: 'from-cyan-500 via-sky-500 to-teal-500',
    badgeBg: 'bg-cyan-950/40',
    badgeText: 'text-cyan-400',
    badgeBorder: 'border-cyan-500/30',
    cardActiveBorder: 'border-cyan-500',
    cardActiveBg: 'bg-[#0E1F28]',
    ringColor: 'ring-cyan-500/60',
    buttonGradient: 'from-cyan-600 via-teal-500 to-blue-600 hover:from-cyan-500 hover:to-blue-500',
    textAccent: 'text-cyan-400'
  },
  'electric-blue': {
    id: 'electric-blue',
    name: 'Cobalt Pro',
    label: '💎 Cobalt Pro',
    icon: '💎',
    primary: '#3B82F6',
    primaryGlow: 'rgba(59, 130, 246, 0.45)',
    gradient: 'from-blue-500 via-indigo-600 to-cyan-500',
    badgeBg: 'bg-blue-950/40',
    badgeText: 'text-blue-400',
    badgeBorder: 'border-blue-500/30',
    cardActiveBorder: 'border-blue-500',
    cardActiveBg: 'bg-[#10192E]',
    ringColor: 'ring-blue-500/60',
    buttonGradient: 'from-blue-600 via-indigo-600 to-sky-600 hover:from-blue-500 hover:to-indigo-500',
    textAccent: 'text-blue-400'
  }
};

interface ThemeContextType {
  theme: ThemeConfig;
  themeAccent: ThemeAccent;
  setThemeAccent: (accent: ThemeAccent) => void;
  availableThemes: ThemeConfig[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'aikotools_theme_accent';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeAccent, setThemeAccentState] = useState<ThemeAccent>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeAccent;
      if (saved && THEMES[saved]) return saved;
    } catch {
      // Ignore error
    }
    return 'crimson'; // Default is now vivid, professional Crimson Red
  });

  const setThemeAccent = (accent: ThemeAccent) => {
    if (THEMES[accent]) {
      setThemeAccentState(accent);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, accent);
      } catch {
        // Ignore error
      }
    }
  };

  const theme = THEMES[themeAccent] || THEMES.crimson;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeAccent,
        setThemeAccent,
        availableThemes: Object.values(THEMES)
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
