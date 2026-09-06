import React, { useState, useEffect, useRef } from 'react';
import { Menu, Clock, BellRing, BellOff, Sparkles, Globe, ChevronDown, Check, Home, Palette, Keyboard } from 'lucide-react';
import {
  getNotificationPermission,
  requestNotificationPermission,
  areNotificationsEnabled,
  setNotificationsEnabled,
  notifyUser,
  playSuccessChime
} from '../utils/notifications';
import { getHistory } from '../utils/historyStorage';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { LanguageCode } from '../i18n/languages';

interface HeaderProps {
  onReset: () => void;
  onOpenToolsDrawer: () => void;
  onOpenHistory: () => void;
  onOpenAiAssistant?: () => void;
  onOpenShortcuts?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onReset,
  onOpenToolsDrawer,
  onOpenHistory,
  onOpenAiAssistant,
  onOpenShortcuts
}) => {
  const { t, language, setLanguage, languages, currentLanguageOption } = useLanguage();
  const { theme, themeAccent, setThemeAccent, availableThemes } = useTheme();
  const [historyCount, setHistoryCount] = useState(0);
  const [notifsActive, setNotifsActive] = useState(true);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  const updateCounts = async () => {
    try {
      const items = await getHistory();
      setHistoryCount(items.length);
    } catch {
      // Ignore error
    }
  };

  useEffect(() => {
    updateCounts();
    setNotifsActive(areNotificationsEnabled());

    const handleHistoryUpdate = () => {
      updateCounts();
    };

    window.addEventListener('aikotools:history_updated', handleHistoryUpdate);
    return () => window.removeEventListener('aikotools:history_updated', handleHistoryUpdate);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setIsLangMenuOpen(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleNotification = async () => {
    if (notifsActive) {
      setNotificationsEnabled(false);
      setNotifsActive(false);
      notifyUser({
        title: '🔔 ' + t('header.notifications', 'Notificaciones'),
        body: t('header.notificationsDisabled', 'Notificaciones desactivadas'),
        playSound: false,
        type: 'info'
      });
    } else {
      setNotificationsEnabled(true);
      setNotifsActive(true);
      await requestNotificationPermission();
      playSuccessChime();
      notifyUser({
        title: '🔔 ' + t('header.notifications', 'Notificaciones'),
        body: t('header.notificationsTest', '¡Notificaciones y sonido activados correctamente!'),
        playSound: true,
        type: 'success'
      });
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0A0C13]/95 backdrop-blur-md border-b border-[#1E2333]">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-3 sm:px-5 py-2.5">
        {/* Left Side Action Buttons: Drawer Toggle Menu, Home & Studio Brand */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenToolsDrawer}
            id="btn-open-tools-drawer"
            className="flex h-9 items-center gap-1.5 px-3 rounded-xl bg-[#131624] border border-[#232B3E] text-stone-200 hover:text-white hover:bg-[#1A1F32] hover:border-stone-400 active:scale-95 shadow-sm text-xs font-semibold transition-all cursor-pointer"
            title={t('header.toolsMenu', 'Menú de herramientas')}
          >
            <Menu className="h-4 w-4" style={{ color: theme.primary }} />
            <span className="text-xs font-medium text-stone-200">{t('header.tools', 'Menú')}</span>
          </button>

          <button
            onClick={onReset}
            id="btn-nav-home"
            className="flex h-9 items-center gap-2 px-2.5 rounded-xl bg-[#131624] border border-[#232B3E] text-stone-300 hover:text-white hover:border-stone-400 hover:bg-[#1A1F32] active:scale-95 shadow-sm transition-all cursor-pointer"
            title={t('header.home', 'Inicio')}
          >
            <Home className="h-4 w-4" style={{ color: theme.primary }} />
            <span className="hidden sm:inline text-xs font-bold text-white font-['Syne']">
              Aiko<span style={{ color: theme.primary }}>Tools</span>
            </span>
          </button>
        </div>

        {/* Right Side Action Buttons: Theme Selector, AI Assistant, Language, Notifications & History */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Theme Accent Switcher Dropdown */}
          <div className="relative" ref={themeMenuRef}>
            <button
              onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
              id="btn-theme-switcher"
              className="flex h-9 items-center gap-1.5 px-2.5 rounded-xl bg-[#131624] border border-[#232B3E] text-stone-200 hover:text-white hover:border-stone-400 active:scale-95 text-xs font-semibold shadow-xs transition-all cursor-pointer"
              title="Cambiar paleta de color y tema del estudio"
            >
              <div
                className="w-3.5 h-3.5 rounded-full border border-white/30 shadow-xs"
                style={{ backgroundColor: theme.primary, boxShadow: `0 0 6px ${theme.primaryGlow}` }}
              />
              <span className="hidden md:inline text-[11px] font-medium text-stone-300">
                {theme.name.split(' ')[0]}
              </span>
              <ChevronDown className="h-3 w-3 text-stone-400" />
            </button>

            {isThemeMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-[#121524] border border-[#242C40] shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-stone-400 font-mono border-b border-[#1E2536] mb-1 flex items-center gap-1.5">
                  <Palette className="h-3 w-3" style={{ color: theme.primary }} />
                  <span>Color de Acento</span>
                </div>
                <div className="space-y-1">
                  {availableThemes.map((tItem) => (
                    <button
                      key={tItem.id}
                      onClick={() => {
                        setThemeAccent(tItem.id);
                        setIsThemeMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                        themeAccent === tItem.id
                          ? 'bg-[#1C2338] text-white font-bold border border-[#3B4764]'
                          : 'text-stone-300 hover:bg-[#181D2E] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3.5 h-3.5 rounded-full border border-white/20"
                          style={{ backgroundColor: tItem.primary }}
                        />
                        <span>{tItem.name}</span>
                      </div>
                      {themeAccent === tItem.id && (
                        <Check className="h-3.5 w-3.5" style={{ color: tItem.primary }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Assistant Button */}
          {onOpenAiAssistant && (
            <button
              onClick={onOpenAiAssistant}
              id="btn-open-ai-assistant"
              style={{
                borderColor: `${theme.primary}50`,
                boxShadow: `0 0 10px ${theme.primary}20`
              }}
              className="relative flex h-9 items-center gap-1 px-2 sm:px-2.5 rounded-xl bg-[#131624] text-white hover:border-stone-300 active:scale-95 transition-all font-semibold text-xs cursor-pointer border"
              title={t('header.aiAssistant', 'Asistente IA Multimedia')}
            >
              <Sparkles className="h-3.5 w-3.5 animate-pulse" style={{ color: theme.primary }} />
              <span className="text-[11px] font-bold font-['Syne']">IA</span>
              <span
                className="flex h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: theme.primary, boxShadow: `0 0 6px ${theme.primary}` }}
              />
            </button>
          )}

          {/* Keyboard Shortcuts Trigger */}
          {onOpenShortcuts && (
            <button
              onClick={onOpenShortcuts}
              id="btn-open-shortcuts"
              className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl bg-[#131624] border border-[#232B3E] text-stone-300 hover:text-white hover:border-stone-400 active:scale-95 text-xs transition-all cursor-pointer"
              title="Atajos de teclado (Ctrl + /)"
            >
              <Keyboard className="h-3.5 w-3.5 text-stone-400" />
            </button>
          )}

          {/* Language Selector Dropdown */}
          <div className="relative" ref={langMenuRef}>
            <button
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              id="btn-language-selector"
              className="flex h-9 items-center gap-1 px-2 rounded-xl bg-[#131624] border border-[#232B3E] text-stone-200 hover:text-white hover:border-stone-400 active:scale-95 text-xs font-semibold shadow-xs transition-all cursor-pointer"
              title={t('header.language', 'Cambiar idioma')}
            >
              <span className="text-sm">{currentLanguageOption.flag}</span>
              <span className="text-[10px] font-mono uppercase text-stone-300 font-bold">
                {language}
              </span>
              <ChevronDown className="h-3 w-3 text-stone-400" />
            </button>

            {isLangMenuOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-[#121524] border border-[#242C40] shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-stone-400 font-mono border-b border-[#1E2536] mb-1 flex items-center gap-1">
                  <Globe className="h-3 w-3" style={{ color: theme.primary }} />
                  {t('header.language', 'Idioma')}
                </div>
                <div className="max-h-56 overflow-y-auto space-y-0.5 no-scrollbar">
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLanguage(l.code as LanguageCode);
                        setIsLangMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                        language === l.code
                          ? 'bg-[#1C2338] text-white font-bold border border-[#3B4764]'
                          : 'text-stone-300 hover:bg-[#181D2E] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{l.flag}</span>
                        <span>{l.nativeName}</span>
                      </div>
                      {language === l.code && <Check className="h-3.5 w-3.5" style={{ color: theme.primary }} />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Push Notification Toggle Button */}
          <button
            onClick={handleToggleNotification}
            id="btn-toggle-notifications"
            style={{
              borderColor: notifsActive ? `${theme.primary}60` : undefined,
              backgroundColor: notifsActive ? `${theme.primary}18` : undefined
            }}
            className={`flex h-9 w-9 items-center justify-center rounded-xl border text-xs font-semibold shadow-xs transition-all cursor-pointer ${
              notifsActive
                ? 'text-white'
                : 'bg-[#181318] border-stone-800 text-stone-500 hover:text-stone-300'
            }`}
            title={
              notifsActive
                ? t('header.notificationsEnabled', 'Notificaciones activadas con sonido')
                : t('header.notificationsDisabled', 'Notificaciones desactivadas')
            }
          >
            {notifsActive ? (
              <BellRing className="h-4 w-4" style={{ color: theme.primary }} />
            ) : (
              <BellOff className="h-4 w-4 text-stone-500" />
            )}
          </button>

          {/* History Button */}
          <button
            onClick={onOpenHistory}
            id="btn-open-history-drawer"
            className="relative flex h-9 items-center gap-1.5 px-2.5 rounded-xl bg-[#131624] border border-[#232B3E] text-white hover:border-stone-400 hover:bg-[#1A1F32] text-xs font-semibold shadow-xs transition-all cursor-pointer"
            title={t('header.history', 'Historial de archivos (auto-eliminación en 1 hora)')}
          >
            <Clock className="h-3.5 w-3.5" style={{ color: theme.primary }} />
            {historyCount > 0 && (
              <span
                style={{ backgroundColor: theme.primary }}
                className="flex h-4 min-w-4 items-center justify-center rounded-full text-white font-mono text-[9px] font-black px-1 shadow-xs"
              >
                {historyCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
