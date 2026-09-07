import React from 'react';
import { X, Keyboard, Command, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const { theme } = useTheme();

  if (!isOpen) return null;

  const shortcuts = [
    { keys: ['Ctrl', 'O'], desc: t('shortcuts.openFile', 'Abrir selector de archivos') },
    { keys: ['Ctrl', 'V'], desc: t('shortcuts.pasteClipboard', 'Pegar imagen o captura del portapapeles') },
    { keys: ['Ctrl', 'Enter'], desc: t('shortcuts.processNow', 'Procesar archivo inmediatamente') },
    { keys: ['Ctrl', '/'], desc: t('shortcuts.openShortcuts', 'Abrir este menú de atajos') },
    { keys: ['Esc'], desc: t('shortcuts.closeWindows', 'Cerrar ventanas, menús o paneles activos') }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 font-['Outfit']">
      <div className="relative w-full max-w-md bg-[#121524] border border-[#262E44] rounded-[28px] p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 text-left">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E2538] pb-3">
          <div className="flex items-center gap-2.5">
            <div
              style={{ backgroundColor: `${theme.primary}20`, borderColor: `${theme.primary}50` }}
              className="flex h-9 w-9 items-center justify-center rounded-xl border"
            >
              <Keyboard className="h-4 w-4" style={{ color: theme.primary }} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{t('shortcuts.title', 'Atajos de Teclado')}</h3>
              <p className="text-[11px] text-stone-400">{t('shortcuts.subtitle', 'Optimiza tu flujo de trabajo rápido')}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-[#1E253E] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="space-y-2.5">
          {shortcuts.map((sc, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-2xl bg-[#171B2D] border border-[#242C42]"
            >
              <span className="text-xs text-stone-300 font-medium">{sc.desc}</span>
              <div className="flex items-center gap-1">
                {sc.keys.map((k, ki) => (
                  <React.Fragment key={ki}>
                    <kbd
                      style={{ borderColor: `${theme.primary}40` }}
                      className="px-2 py-1 rounded-lg bg-[#0F121E] border text-[11px] font-mono font-bold text-stone-200 shadow-inner"
                    >
                      {k}
                    </kbd>
                    {ki < sc.keys.length - 1 && <span className="text-stone-500 text-xs">+</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Mascot / Pro Tip */}
        <div className="p-3 rounded-2xl bg-[#181D30] border border-[#28324C] flex items-center gap-2 text-xs text-stone-300">
          <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
          <span>{t('shortcuts.tip', '¡Puedes arrastrar y soltar cualquier formato directamente en la ventana!')}</span>
        </div>
      </div>
    </div>
  );
};
