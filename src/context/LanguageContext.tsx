import React, { createContext, useContext, useState, useEffect } from 'react';
import { LanguageCode, SUPPORTED_LANGUAGES, LanguageOption } from '../i18n/languages';
import { translations } from '../i18n/translations';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string, fallback?: string) => string;
  currentLanguageOption: LanguageOption;
  languages: LanguageOption[];
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem('aikotools_lang') as LanguageCode;
    if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
      return saved;
    }
    const navLang = navigator.language || '';
    // Exact match (e.g. zh-TW)
    const exact = SUPPORTED_LANGUAGES.find((l) => l.code.toLowerCase() === navLang.toLowerCase());
    if (exact) return exact.code as LanguageCode;

    // Traditional Chinese variants
    if (navLang.toLowerCase().includes('tw') || navLang.toLowerCase().includes('hant') || navLang.toLowerCase().includes('hk')) {
      return 'zh-TW';
    }

    // 2-letter prefix match
    const shortLang = navLang.slice(0, 2).toLowerCase();
    const shortMatch = SUPPORTED_LANGUAGES.find((l) => l.code.toLowerCase() === shortLang);
    if (shortMatch) return shortMatch.code as LanguageCode;

    return 'es';
  });

  const isRTL = language === 'ar' || language === 'he';

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  }, [language, isRTL]);

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    localStorage.setItem('aikotools_lang', lang);
  };

  const t = (key: string, fallback?: string): string => {
    const langDict = translations[language];
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    // Fallback to Spanish or English
    if (translations['es'] && translations['es'][key]) {
      return translations['es'][key];
    }
    if (translations['en'] && translations['en'][key]) {
      return translations['en'][key];
    }
    return fallback || key;
  };

  const currentLanguageOption =
    SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        currentLanguageOption,
        languages: SUPPORTED_LANGUAGES,
        isRTL
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
