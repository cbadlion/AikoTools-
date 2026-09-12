import React from 'react';
import { Shield, X, Check, Zap, HelpCircle } from 'lucide-react';
import { ARTIST_INFO } from '../data/commissionsData';

interface TosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TosModal: React.FC<TosModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative bg-[#FAF7F2] rounded-3xl comic-border border-4 border-[#18181B] comic-shadow-lg max-w-2xl w-full p-6 sm:p-8 animate-fade-in bg-notebook-grid my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b pb-4 border-stone-300 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-400 comic-border flex items-center justify-center">
              <Shield className="w-6 h-6 text-stone-900" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-stone-900">
                Términos del Servicio (TOS)
              </h3>
              <p className="text-xs text-stone-500 font-semibold">
                Normas de encargo con Aiko ({ARTIST_INFO.handle})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-stone-200 comic-border text-stone-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5 text-xs sm:text-sm text-stone-700 leading-relaxed font-medium">
          {/* 1. Payment */}
          <div className="p-4 rounded-2xl bg-white comic-border">
            <h4 className="font-black text-stone-900 text-sm mb-1.5 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-red-600 fill-red-500" />
              1. Pagos y Moneda (Volts ⚡)
            </h4>
            <p>
              Los precios oficiales están expresados en <strong className="text-stone-900">Volts (⚡)</strong>:
              Bubbles (500⚡), Frame Static (1500⚡) y Frame Animation (3000⚡). El pago se realiza por
              adelantado (100% o 50% anticipo previo al boceto) coordinado en privado vía Discord o
              Gmail.
            </p>
          </div>

          {/* 2. Revisions */}
          <div className="p-4 rounded-2xl bg-white comic-border">
            <h4 className="font-black text-stone-900 text-sm mb-1.5 flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              2. Revisiones y Cambios
            </h4>
            <p>
              Cada formato incluye un número de revisiones en la fase de boceto:
            </p>
            <ul className="list-disc list-inside mt-1.5 space-y-1 text-stone-600">
              <li><strong>Bubbles (500⚡):</strong> 1 revisión en la fase de boceto.</li>
              <li><strong>Frame Static (1500⚡):</strong> 2 revisiones (boceto y paleta de color).</li>
              <li><strong>Frame Animation (3000⚡):</strong> 3 revisiones (storyboard, lineart y animación).</li>
            </ul>
            <p className="text-[11px] text-stone-500 mt-1">
              * Cambios drásticos de pose o diseño tras aprobar el boceto pueden incurrir en costo adicional.
            </p>
          </div>

          {/* 3. Usage Rights */}
          <div className="p-4 rounded-2xl bg-white comic-border">
            <h4 className="font-black text-stone-900 text-sm mb-1.5 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-amber-600" />
              3. Derechos de Uso & Propiedad Intelectual
            </h4>
            <p>
              El arte es exclusivamente para <strong className="text-stone-900">uso personal</strong> (fondos
              de pantalla, avatares de redes sociales, fotos de perfil, etc.).
              Para monetización en streams (Twitch/YouTube), mercancía o marca comercial, se requiere el
              adicional de <strong className="text-amber-800">Licencia Comercial (+600 Volts)</strong>.
              Queda estrictamente prohibido el uso para NFTs o entrenamiento de inteligencias artificiales.
            </p>
          </div>

          {/* 4. Turnaround */}
          <div className="p-4 rounded-2xl bg-white comic-border">
            <h4 className="font-black text-stone-900 text-sm mb-1.5">
              4. Plazos y Entrega Digital
            </h4>
            <p>
              Los plazos habituales son de 2 a 14 días según el formato seleccionado. Los archivos
              se entregan en alta definición digital (PNG, GIF/MP4, WebP) mediante enlaces privados de
              descarga.
            </p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-stone-300 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-stone-950 font-black text-xs uppercase tracking-wide comic-border comic-shadow-sm transition-all"
          >
            Entendido y Acepto
          </button>
        </div>
      </div>
    </div>
  );
};
