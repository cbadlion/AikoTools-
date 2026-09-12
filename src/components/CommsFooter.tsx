import React from 'react';
import { MessageSquare, Mail, Zap, Heart, Shield } from 'lucide-react';
import { ARTIST_INFO } from '../data/commissionsData';

interface CommsFooterProps {
  onOpenTos: () => void;
  onGoToOrder: () => void;
}

export const CommsFooter: React.FC<CommsFooterProps> = ({ onOpenTos, onGoToOrder }) => {
  return (
    <footer className="mt-20 border-t-2 border-[#18181B] bg-stone-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Artist Signature & Tag */}
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="w-14 h-14 rounded-2xl comic-border bg-amber-400 p-1 shrink-0 overflow-hidden comic-shadow-sm">
              <img
                src="/aiko_avatar.jpg"
                alt="Aiko Avatar"
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <div>
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="font-comic text-3xl text-amber-400">AIKO ⭐️</span>
                <span className="text-xs px-2 py-0.5 rounded bg-stone-800 text-stone-300 font-mono font-bold">
                  {ARTIST_INFO.handle}
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Ilustraciones Digitales & Animación Frame a Frame
              </p>
            </div>
          </div>

          {/* Quick Contact buttons */}
          <div className="flex items-center gap-3">
            <a
              href={`https://discord.com/users/${ARTIST_INFO.discord}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs comic-border flex items-center gap-2 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Discord: {ARTIST_INFO.discord}</span>
            </a>

            <a
              href={`mailto:${ARTIST_INFO.gmail}`}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs comic-border flex items-center gap-2 transition-colors"
            >
              <Mail className="w-4 h-4" />
              <span>Gmail: {ARTIST_INFO.gmail}</span>
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-400">
          <p className="flex items-center gap-1">
            <span>© {new Date().getFullYear()} Aiko (@digitalzart). Precios: Bubbles (500⚡), Frame Static (1500⚡), Frame Animation (3000⚡).</span>
          </p>

          <div className="flex items-center gap-4">
            <button
              onClick={onOpenTos}
              className="hover:text-amber-400 font-bold transition-colors underline"
            >
              Términos del Servicio (TOS)
            </button>
            <button
              onClick={onGoToOrder}
              className="text-amber-400 hover:text-amber-300 font-black transition-colors"
            >
              ¡Hacer un Pedido Ahora!
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
