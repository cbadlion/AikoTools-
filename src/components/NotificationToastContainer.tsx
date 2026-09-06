import React, { useState, useEffect } from 'react';
import { ToastNotification } from '../utils/notifications';
import { CheckCircle2, Info, AlertTriangle, X, Sparkles } from 'lucide-react';

export const NotificationToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<ToastNotification>;
      if (customEvent.detail) {
        const newToast = customEvent.detail;
        setToasts((prev) => [...prev.slice(-3), newToast]);

        // Auto remove
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
        }, newToast.duration || 4000);
      }
    };

    window.addEventListener('aikotools:toast', handleToast);
    return () => window.removeEventListener('aikotools:toast', handleToast);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl bg-[#121622]/95 border border-[#10B981]/50 text-white shadow-[0_8px_30px_rgba(0,0,0,0.8)] backdrop-blur-md animate-in slide-in-from-top-4 duration-200"
        >
          {t.previewUrl ? (
            <img
              src={t.previewUrl}
              alt="Preview"
              className="h-10 w-10 rounded-lg object-cover border border-[#2B3349] shrink-0 bg-black/40"
            />
          ) : (
            <div className="h-9 w-9 rounded-xl bg-[#10B981]/20 border border-[#10B981]/40 flex items-center justify-center text-[#10B981] shrink-0">
              {t.type === 'warning' ? (
                <AlertTriangle className="h-4 w-4 text-amber-400" />
              ) : t.type === 'info' ? (
                <Info className="h-4 w-4 text-blue-400" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-[#34D399]" />
              )}
            </div>
          )}

          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white truncate font-['Syne']">
                {t.title}
              </span>
              <Sparkles className="h-3 w-3 text-[#10B981] shrink-0" />
            </div>
            <p className="text-[11px] text-stone-300 line-clamp-2 mt-0.5 leading-snug">
              {t.body}
            </p>
          </div>

          <button
            onClick={() => removeToast(t.id)}
            className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-[#1E2536] transition-colors shrink-0"
            aria-label="Cerrar notificación"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
