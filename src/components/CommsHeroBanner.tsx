import React from 'react';
import { Zap, Megaphone, Sparkles, MessageSquare, Mail, Copy, Check, ArrowRight } from 'lucide-react';
import { ARTIST_INFO } from '../data/commissionsData';
import { CommissionTierId } from '../types/commissions';

interface CommsHeroBannerProps {
  onSelectTier: (tierId: CommissionTierId) => void;
  onOpenOrderForm: () => void;
}

export const CommsHeroBanner: React.FC<CommsHeroBannerProps> = ({
  onSelectTier,
  onOpenOrderForm,
}) => {
  const [copiedDiscord, setCopiedDiscord] = React.useState(false);

  const handleCopyDiscord = () => {
    navigator.clipboard.writeText(ARTIST_INFO.discord);
    setCopiedDiscord(true);
    setTimeout(() => setCopiedDiscord(false), 2000);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl comic-border bg-[#FBF7EE] comic-shadow-lg p-6 sm:p-8 lg:p-10 mb-10 bg-notebook-grid border-4 border-[#18181B]">
      {/* Halftone / Comic burst background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-200/40 rounded-full blur-3xl -z-0 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-red-200/40 rounded-full blur-3xl -z-0 pointer-events-none" />

      {/* Comic Action Splatters Decoration */}
      <div className="absolute -top-6 -right-6 font-comic text-9xl text-amber-500/10 select-none pointer-events-none -rotate-12">
        POW!
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
        {/* Left Column: Comic Title, Taped Pricing Slips & Description */}
        <div className="flex-1 text-center lg:text-left">
          {/* Header Title with Megaphone */}
          <div className="inline-flex items-center gap-3 bg-amber-400 px-5 py-2 rounded-2xl comic-border comic-shadow-sm -rotate-2 mb-4 hover:rotate-0 transition-transform">
            <Megaphone className="w-7 h-7 text-red-600 animate-bounce" />
            <span className="font-comic text-3xl sm:text-4xl text-[#18181B] tracking-wider uppercase font-black drop-shadow-sm">
              COMMS OPEN!!
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-[#18181B] tracking-tight mb-3">
            Comisiones de Arte Digital & Animación
          </h1>

          <p className="text-stone-700 text-base sm:text-lg max-w-xl font-medium leading-relaxed mb-6">
            ¡Hola! Soy <strong className="text-red-600 font-bold">Aiko</strong> (
            <span className="underline decoration-amber-400 font-semibold">{ARTIST_INFO.handle}</span>).
            Transformo tus personajes, avatares y OCs en arte dinámico estilo anime/cómic.
            Selecciona tu formato ideal con entrega en <strong className="text-amber-700">Volts ⚡</strong>:
          </p>

          {/* Interactive Pricing Slips (Exact match with user flyer) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
            {/* 1. Bubbles 500 Volts */}
            <div
              onClick={() => onSelectTier('bubbles')}
              className="cursor-pointer group relative bg-[#FFFEEB] p-4 rounded-xl comic-border comic-shadow hover:-translate-y-1 hover:comic-shadow-lg transition-all -rotate-1 hover:rotate-0"
            >
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-3 bg-amber-200/90 border border-stone-400 rounded-xs -rotate-2" />
              <div className="flex items-center gap-1.5 text-red-600 font-black mb-1">
                <Zap className="w-5 h-5 fill-red-500 animate-pulse" />
                <span className="font-comic text-xl text-[#18181B] uppercase tracking-wide">
                  Bubbles
                </span>
              </div>
              <div className="font-comic text-3xl font-black text-red-600 leading-none">
                500 <span className="text-sm font-sans font-bold text-stone-800">Volts</span>
              </div>
              <p className="text-xs text-stone-500 font-medium mt-1">Chibi / Icono Discord</p>
            </div>

            {/* 2. Frame Static 1500 Volts */}
            <div
              onClick={() => onSelectTier('frame_static')}
              className="cursor-pointer group relative bg-[#FFFEEB] p-4 rounded-xl comic-border comic-shadow hover:-translate-y-1 hover:comic-shadow-lg transition-all rotate-1 hover:rotate-0 ring-2 ring-amber-400/60"
            >
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-3 bg-amber-200/90 border border-stone-400 rounded-xs rotate-1" />
              <div className="flex items-center gap-1.5 text-amber-600 font-black mb-1">
                <Zap className="w-5 h-5 fill-amber-500 animate-pulse" />
                <span className="font-comic text-xl text-[#18181B] uppercase tracking-wide">
                  Frame Static
                </span>
              </div>
              <div className="font-comic text-3xl font-black text-amber-600 leading-none">
                1500 <span className="text-sm font-sans font-bold text-stone-800">Volts</span>
              </div>
              <p className="text-xs text-stone-500 font-medium mt-1">Ilustración Completa</p>
            </div>

            {/* 3. Frame Animation 3000 Volts */}
            <div
              onClick={() => onSelectTier('frame_animation')}
              className="cursor-pointer group relative bg-[#FFFEEB] p-4 rounded-xl comic-border comic-shadow hover:-translate-y-1 hover:comic-shadow-lg transition-all -rotate-1 hover:rotate-0"
            >
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-3 bg-amber-200/90 border border-stone-400 rounded-xs -rotate-1" />
              <div className="flex items-center gap-1.5 text-red-600 font-black mb-1">
                <Zap className="w-5 h-5 fill-red-600 animate-pulse" />
                <span className="font-comic text-xl text-[#18181B] uppercase tracking-wide">
                  Frame Animation
                </span>
              </div>
              <div className="font-comic text-3xl font-black text-red-600 leading-none">
                3000 <span className="text-sm font-sans font-bold text-stone-800">Volts</span>
              </div>
              <p className="text-xs text-stone-500 font-medium mt-1">Animación Looped</p>
            </div>
          </div>

          {/* Action CTA & Private Contact */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
            <button
              onClick={onOpenOrderForm}
              className="px-7 py-3.5 rounded-2xl bg-red-600 text-white font-black text-base uppercase tracking-wide comic-border comic-shadow hover:bg-red-700 hover:translate-x-0.5 hover:translate-y-0.5 hover:comic-shadow-sm transition-all flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span>Hacer Pedido de Comisión</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            {/* Contact in Private box */}
            <div className="flex items-center gap-2 bg-stone-900 text-white px-4 py-3 rounded-2xl comic-border">
              <span className="text-xs font-bold text-amber-300">
                Interested? Call me in private!
              </span>
              <div className="flex items-center gap-1.5 ml-1">
                <button
                  onClick={handleCopyDiscord}
                  title="Copiar Discord"
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-bold transition-all flex items-center gap-1"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Discord</span>
                  {copiedDiscord ? <Check className="w-3 h-3 text-emerald-300" /> : null}
                </button>
                <a
                  href={`mailto:${ARTIST_INFO.gmail}?subject=Consulta de Comisiones Digitales`}
                  className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-xs font-bold transition-all flex items-center gap-1"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Gmail</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Mascot & Comic Badge Card */}
        <div className="w-full sm:w-80 lg:w-96 flex flex-col items-center">
          <div className="relative w-full aspect-square rounded-3xl comic-border bg-amber-400 p-3 comic-shadow-lg rotate-1 hover:rotate-0 transition-transform">
            {/* Taped label on top of mascot image */}
            <div className="absolute -top-3 left-8 px-4 py-1 bg-white comic-border text-xs font-black uppercase tracking-wider rounded-md -rotate-3 z-20 comic-shadow-sm">
              👑 Artista & Creadora
            </div>

            <div className="w-full h-full rounded-2xl overflow-hidden comic-border bg-stone-900 relative">
              <img
                src="/aiko_avatar.jpg"
                alt="Aiko Hamster Mascot Art"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-comic text-2xl text-amber-400 drop-shadow">
                      Aiko ⭐️
                    </h3>
                    <p className="text-xs font-semibold text-stone-200">
                      @digitalzart
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-red-600 text-white text-xs font-black comic-border">
                    ⚡ ACTIVA
                  </span>
                </div>
              </div>
            </div>

            {/* Comic tape in corner */}
            <div className="absolute -bottom-3 right-6 px-4 py-1.5 bg-[#FFFEEB] comic-border text-xs font-black text-stone-900 rounded-md rotate-2 comic-shadow-sm">
              @digitalzart
            </div>
          </div>

          {/* Quick Currency Note */}
          <div className="mt-4 text-xs font-bold text-stone-600 flex items-center gap-1 bg-amber-100 px-3 py-1.5 rounded-full border border-amber-300">
            <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
            <span>Moneda: Volts (⚡) | Pagos por Discord / Privado</span>
          </div>
        </div>
      </div>
    </div>
  );
};
