import React, { useState, useEffect } from 'react';
import { HistoryItem } from '../types';
import { getHistory, deleteHistoryItem, clearAllHistory, formatTimeRemaining } from '../utils/historyStorage';
import { formatFileSize } from '../utils/mediaEngine';
import { useLanguage } from '../context/LanguageContext';
import {
  Clock,
  Download,
  Trash2,
  X,
  ShieldCheck,
  FileBox,
  Image as ImageIcon
} from 'lucide-react';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HistoryDrawer({ isOpen, onClose }: HistoryDrawerProps) {
  const { t } = useLanguage();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);

  // Load items from IndexedDB
  const loadItems = async () => {
    try {
      const data = await getHistory();
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadItems();
    }
  }, [isOpen]);

  // Listen to custom update event
  useEffect(() => {
    const handleUpdate = () => {
      loadItems();
    };
    window.addEventListener('aikotools:history_updated', handleUpdate);
    return () => window.removeEventListener('aikotools:history_updated', handleUpdate);
  }, []);

  // Update countdown timers every second when open
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteHistoryItem(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearAll = async () => {
    if (items.length === 0) return;
    await clearAllHistory();
    setItems([]);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-drawer-title"
      className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm transition-opacity"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md bg-[#0D0F15] border-l border-[#242A3D] text-white flex flex-col h-full shadow-2xl z-10 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#242A3D] flex items-center justify-between bg-[#121520]">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#10B981]/15 border border-[#10B981]/40 flex items-center justify-center text-[#10B981]">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="history-drawer-title" className="text-base font-black text-white font-['Syne']">
                  {t('history.title', 'Historial de Resultados')}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30">
                  {items.length}
                </span>
              </div>
              <p className="text-[11px] text-stone-400 font-normal">
                {t('history.subtitle', 'Auto-eliminación en 1 hora')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {items.length > 0 && (
              <button
                onClick={handleClearAll}
                id="btn-clear-all-history"
                className="px-2.5 py-1.5 rounded-xl bg-[#1E2333] border border-[#2B3349] text-xs font-semibold text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/40 transition-colors flex items-center gap-1"
                title={t('history.clearAll', 'Vaciar historial')}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('history.clearAll', 'Vaciar')}</span>
              </button>
            )}
            <button
              onClick={onClose}
              id="btn-close-history"
              className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-[#1E2333] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Security & Privacy Banner */}
        <div className="px-4 py-2.5 bg-[#14261C] border-b border-[#10B981]/20 flex items-center gap-2 text-xs text-[#34D399]">
          <ShieldCheck className="h-4 w-4 shrink-0 text-[#10B981]" />
          <span>{t('history.disclaimer', 'Tus creaciones se guardan solo en tu dispositivo y se borran tras 60 min.')}</span>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-[#1D2233]">
          {loading ? (
            <div className="py-12 text-center text-stone-400 text-xs">
              <div className="h-6 w-6 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              {t('history.loading', 'Cargando...')}
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-[#141722] border border-[#262C3E] flex items-center justify-center text-stone-500">
                <FileBox className="h-8 w-8 text-stone-500 opacity-60" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">{t('history.empty', 'No tienes archivos en el historial')}</p>
                <p className="text-xs text-stone-400 max-w-xs mx-auto">
                  {t('history.emptySub', 'Cualquier imagen, GIF o video que proceses aparecerá aquí con acceso rápido.')}
                </p>
              </div>
            </div>
          ) : (
            items.map((item) => {
              const timeRemaining = formatTimeRemaining(item.expiresAt);
              const isAlmostExpired = item.expiresAt - Date.now() < 10 * 60 * 1000;

              return (
                <div
                  key={item.id}
                  className="pt-3 first:pt-0 group relative flex gap-3 items-start bg-[#141722]/60 hover:bg-[#141722] p-3 rounded-2xl border border-[#222838] transition-all"
                >
                  {/* Thumbnail */}
                  <div className="relative h-16 w-16 shrink-0 rounded-xl bg-black/40 border border-[#2A3144] overflow-hidden flex items-center justify-center">
                    {item.previewThumbnail ? (
                      <img
                        src={item.previewThumbnail}
                        alt={item.fileName}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-stone-500" />
                    )}
                    <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] text-center font-mono py-0.5 text-stone-300 truncate">
                      {item.format}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30 truncate">
                        {item.toolName}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          isAlmostExpired
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                            : 'bg-[#1E2536] text-[#A7F3D0] border border-[#2E374D]'
                        }`}
                      >
                        <Clock className="h-3 w-3 text-[#10B981]" />
                        {timeRemaining}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-white truncate" title={item.fileName}>
                      {item.fileName}
                    </p>

                    <div className="flex items-center gap-2 text-[11px] text-stone-400 font-mono">
                      <span>{formatFileSize(item.newSize)}</span>
                      {item.width && item.height && (
                        <>
                          <span>•</span>
                          <span>{item.width}x{item.height}px</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <a
                      href={item.url}
                      download={item.fileName}
                      id={`btn-download-history-${item.id}`}
                      className="p-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white transition-transform active:scale-95 shadow-md shadow-[#10B981]/20 flex items-center justify-center"
                      title={t('history.download', 'Descargar')}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      id={`btn-delete-history-${item.id}`}
                      className="p-2 rounded-xl bg-[#1E2333] hover:bg-rose-500/20 text-stone-400 hover:text-rose-400 transition-colors flex items-center justify-center"
                      title={t('history.delete', 'Eliminar')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-[#242A3D] bg-[#121520] text-center text-xs text-stone-400">
          <p>
            {t('history.disclaimer', 'Tus creaciones se guardan solo en tu dispositivo y se borran tras 60 min.')}
          </p>
        </div>
      </div>
    </div>
  );
}
