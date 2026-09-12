import React, { useState } from 'react';
import {
  Zap,
  Check,
  Sparkles,
  Clock,
  RotateCcw,
  PackageCheck,
  Plus,
  ArrowRight,
  Play,
  Pause,
  Layers,
  Image as ImageIcon,
  Film,
  Smile,
} from 'lucide-react';
import { COMMISSION_TIERS, COMMISSION_ADDONS } from '../data/commissionsData';
import { CommissionTierId } from '../types/commissions';

interface TiersShowcaseProps {
  onStartOrderWithConfig: (tierId: CommissionTierId, addonIds: string[]) => void;
}

export const TiersShowcase: React.FC<TiersShowcaseProps> = ({
  onStartOrderWithConfig,
}) => {
  const [selectedTierId, setSelectedTierId] = useState<CommissionTierId>('frame_static');
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [isAnimationPlaying, setIsAnimationPlaying] = useState(true);
  const [activePreviewTab, setActivePreviewTab] = useState<'demo' | 'deliverables'>('demo');

  const selectedTier =
    COMMISSION_TIERS.find((t) => t.id === selectedTierId) || COMMISSION_TIERS[1];

  const toggleAddon = (addonId: string) => {
    setSelectedAddons((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
    );
  };

  // Calculate live total volts
  const addonsTotalVolts = selectedAddons.reduce((sum, id) => {
    const addon = COMMISSION_ADDONS.find((a) => a.id === id);
    return sum + (addon ? addon.volts : 0);
  }, 0);

  const totalVolts = selectedTier.volts + addonsTotalVolts;

  return (
    <section id="commission-tiers" className="mb-14">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-200 text-amber-900 comic-border text-xs font-black uppercase tracking-wider mb-3">
          <Zap className="w-4 h-4 fill-amber-600 text-amber-700" />
          Precios Oficiales de Comisiones
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-[#18181B] tracking-tight">
          Elige el Formato para tu Personaje
        </h2>
        <p className="text-stone-600 text-base mt-2">
          Desde adorables avatares chibi en burbuja hasta cuadros estáticos de alta resolución y
          animaciones completas en bucle.
        </p>
      </div>

      {/* 3 Main Tiers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mb-10">
        {COMMISSION_TIERS.map((tier) => {
          const isSelected = selectedTierId === tier.id;

          return (
            <div
              key={tier.id}
              onClick={() => setSelectedTierId(tier.id)}
              className={`cursor-pointer relative flex flex-col rounded-3xl comic-border p-6 transition-all bg-white ${
                isSelected
                  ? 'comic-shadow-lg ring-4 ring-amber-400 -translate-y-1.5'
                  : 'comic-shadow hover:-translate-y-1 hover:comic-shadow-lg opacity-95'
              }`}
            >
              {/* Tape Header Tag */}
              <div className="flex items-center justify-between mb-4">
                <span
                  className={`text-xs font-black uppercase px-3 py-1 rounded-full comic-border ${tier.tagColor}`}
                >
                  {tier.badge}
                </span>

                {tier.popular && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-[#18181B] text-xs font-black comic-border animate-pulse flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> MÁS POPULAR
                  </span>
                )}
              </div>

              {/* Tier Name & Price */}
              <div className="mb-4">
                <h3 className="text-2xl font-black text-[#18181B] flex items-center gap-2">
                  {tier.name}
                  {tier.id === 'bubbles' && <Smile className="w-6 h-6 text-red-500" />}
                  {tier.id === 'frame_static' && <ImageIcon className="w-6 h-6 text-amber-500" />}
                  {tier.id === 'frame_animation' && <Film className="w-6 h-6 text-red-600" />}
                </h3>

                <div className="mt-2 flex items-baseline gap-2">
                  <div className="font-comic text-5xl font-black text-red-600">
                    {tier.volts}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-comic text-xl font-bold text-stone-800 leading-none">
                      Volts ⚡
                    </span>
                    <span className="text-xs font-semibold text-stone-400">
                      (~${(tier.volts / 100).toFixed(0)} USD est.)
                    </span>
                  </div>
                </div>
              </div>

              {/* Short Description */}
              <p className="text-sm text-stone-600 font-medium leading-relaxed mb-5 min-h-[48px]">
                {tier.shortDesc}
              </p>

              {/* Turnaround & Revisions Info Bar */}
              <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-stone-50 comic-border mb-6 text-xs">
                <div className="flex items-center gap-1.5 text-stone-700 font-bold">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{tier.turnaround}</span>
                </div>
                <div className="flex items-center gap-1.5 text-stone-700 font-bold">
                  <RotateCcw className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>{tier.revisions} Revisiones</span>
                </div>
              </div>

              {/* Features List */}
              <div className="space-y-2 mb-6 flex-1">
                <p className="text-xs font-black uppercase tracking-wider text-stone-400 mb-2">
                  ¿Qué incluye?
                </p>
                {tier.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs font-semibold text-stone-700">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              {/* Selection Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTierId(tier.id);
                }}
                className={`w-full py-3 rounded-xl font-black text-sm uppercase tracking-wide comic-border transition-all flex items-center justify-center gap-2 ${
                  isSelected
                    ? 'bg-amber-400 text-stone-900 comic-shadow-sm'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                {isSelected ? (
                  <>
                    <Check className="w-4 h-4" /> Seleccionado
                  </>
                ) : (
                  'Seleccionar Este Formato'
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Interactive Live Preview & Customizer Box */}
      <div className="rounded-3xl comic-border bg-[#FFFDF9] comic-shadow-lg p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Left: Dynamic Tier Preview Canvas */}
          <div className="w-full lg:w-5/12 flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-600" />
                Vista Previa del Estilo: <strong className="text-stone-900">{selectedTier.name}</strong>
              </span>

              {selectedTierId === 'frame_animation' && (
                <button
                  onClick={() => setIsAnimationPlaying((p) => !p)}
                  className="px-2.5 py-1 rounded-lg comic-border bg-stone-100 hover:bg-stone-200 text-xs font-bold flex items-center gap-1"
                >
                  {isAnimationPlaying ? (
                    <>
                      <Pause className="w-3 h-3 text-red-600" /> Pausar
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 text-emerald-600" /> Reproducir
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Visual Canvas Display Replicating Style */}
            <div className="w-full aspect-square max-w-sm rounded-3xl comic-border bg-stone-950 p-4 comic-shadow relative overflow-hidden flex items-center justify-center">
              {/* Halftone / comic dots background */}
              <div className="absolute inset-0 bg-halftone-dots opacity-20 pointer-events-none" />

              {/* 1. BUBBLES PREVIEW */}
              {selectedTierId === 'bubbles' && (
                <div className="relative flex flex-col items-center justify-center text-center">
                  {/* Bubble circle container */}
                  <div className="w-52 h-52 rounded-full comic-border bg-gradient-to-tr from-amber-400 via-orange-300 to-red-400 p-2 comic-shadow relative group">
                    <div className="w-full h-full rounded-full overflow-hidden border-4 border-white relative bg-white">
                      <img
                        src="/aiko_avatar.jpg"
                        alt="Chibi Mascot"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      {/* Bubble glare overlay */}
                      <div className="absolute top-2 right-4 w-12 h-6 rounded-full bg-white/60 blur-xs rotate-35 pointer-events-none" />
                      <div className="absolute bottom-3 left-6 w-5 h-5 rounded-full bg-white/40 pointer-events-none" />
                    </div>
                  </div>

                  <div className="mt-4 px-3 py-1 bg-[#FAF7F2] comic-border rounded-xl text-xs font-black text-stone-900 comic-shadow-sm flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 fill-red-500 text-red-600" />
                    <span>Estilo Burbuja • 500 Volts</span>
                  </div>
                </div>
              )}

              {/* 2. FRAME STATIC PREVIEW */}
              {selectedTierId === 'frame_static' && (
                <div className="relative w-full h-full rounded-2xl comic-border overflow-hidden bg-amber-400/20 flex flex-col justify-end p-4 border-2 border-stone-800">
                  <img
                    src="/aiko_avatar.jpg"
                    alt="Frame Static Sample"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {/* Comic Frame Overlay lines */}
                  <div className="absolute inset-0 border-8 border-[#18181B]/80 pointer-events-none" />
                  <div className="relative z-10 bg-stone-950/85 backdrop-blur-sm p-3 rounded-xl comic-border text-white">
                    <div className="flex items-center justify-between">
                      <span className="font-comic text-xl text-amber-400">FRAME STATIC</span>
                      <span className="text-xs font-black bg-amber-400 text-stone-950 px-2 py-0.5 rounded">
                        1500 ⚡
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-300 font-medium">
                      Ilustración completa con sombreado de alta densidad & fondo cómic.
                    </p>
                  </div>
                </div>
              )}

              {/* 3. FRAME ANIMATION PREVIEW */}
              {selectedTierId === 'frame_animation' && (
                <div className="relative w-full h-full rounded-2xl comic-border overflow-hidden bg-stone-900 flex flex-col justify-end p-4 border-2 border-stone-800">
                  <div
                    className={`absolute inset-0 transition-transform duration-700 ${
                      isAnimationPlaying ? 'animate-pulse scale-105' : ''
                    }`}
                  >
                    <img
                      src="/aiko_avatar.jpg"
                      alt="Animation Frame Sample"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Animated Frame Sparkles Simulation */}
                  {isAnimationPlaying && (
                    <div className="absolute inset-0 pointer-events-none">
                      <Sparkles className="w-8 h-8 text-amber-300 absolute top-6 left-6 animate-bounce" />
                      <Sparkles className="w-6 h-6 text-red-400 absolute top-12 right-8 animate-pulse" />
                      <Zap className="w-7 h-7 text-amber-400 fill-amber-300 absolute bottom-16 right-6 animate-spin" />
                    </div>
                  )}

                  <div className="relative z-10 bg-stone-950/90 backdrop-blur-md p-3 rounded-xl comic-border text-white">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-comic text-xl text-red-400 flex items-center gap-1.5">
                        <Film className="w-4 h-4" /> LOOP ANIMATION
                      </span>
                      <span className="text-xs font-black bg-red-600 text-white px-2 py-0.5 rounded">
                        3000 ⚡
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-300 font-medium">
                      Bucle continuo en GIF, WebP animado & MP4 (60 FPS) listo para stream.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Deliverables summary */}
            <div className="w-full mt-4 p-3 rounded-2xl bg-amber-50 comic-border text-xs text-stone-700">
              <strong className="block text-stone-900 font-bold mb-1 flex items-center gap-1">
                <PackageCheck className="w-4 h-4 text-emerald-600" />
                Archivos que recibirás:
              </strong>
              <ul className="list-disc list-inside space-y-0.5 text-stone-600 font-medium">
                {selectedTier.deliverables.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right: Add-ons & Live Volts Calculator */}
          <div className="w-full lg:w-7/12 flex flex-col">
            <div className="mb-4">
              <h4 className="text-xl font-black text-[#18181B] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-600" />
                Personaliza con Extras (Opcional)
              </h4>
              <p className="text-xs text-stone-500 mt-0.5">
                Selecciona los complementos que necesitas para tu pedido:
              </p>
            </div>

            {/* Addons Grid */}
            <div className="space-y-2.5 mb-6">
              {COMMISSION_ADDONS.map((addon) => {
                const isChecked = selectedAddons.includes(addon.id);

                return (
                  <div
                    key={addon.id}
                    onClick={() => toggleAddon(addon.id)}
                    className={`cursor-pointer flex items-center justify-between p-3.5 rounded-2xl comic-border transition-all ${
                      isChecked
                        ? 'bg-amber-100 border-amber-500 comic-shadow-sm'
                        : 'bg-white hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-md comic-border flex items-center justify-center transition-colors ${
                          isChecked ? 'bg-red-600 text-white' : 'bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      <div>
                        <div className="text-sm font-bold text-[#18181B] flex items-center gap-1.5">
                          {addon.name}
                        </div>
                        <p className="text-xs text-stone-500 font-medium">
                          {addon.description}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-3">
                      <span className="font-comic text-lg font-black text-amber-700">
                        +{addon.volts} ⚡
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live Total Volts Summary Card */}
            <div className="mt-auto p-5 rounded-3xl comic-border bg-stone-900 text-white comic-shadow">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-xs uppercase tracking-widest text-amber-400 font-black">
                    Cotización Total Estimada
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="font-comic text-4xl sm:text-5xl font-black text-white">
                      {totalVolts}
                    </span>
                    <span className="font-comic text-2xl font-bold text-amber-400">
                      VOLTS ⚡
                    </span>
                    <span className="text-xs text-stone-400 font-bold ml-2">
                      (~${(totalVolts / 100).toFixed(0)} USD)
                    </span>
                  </div>
                  <p className="text-xs text-stone-300 mt-1">
                    Formato: <strong className="text-white">{selectedTier.name}</strong>
                    {selectedAddons.length > 0 && ` + ${selectedAddons.length} extra(s)`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onStartOrderWithConfig(selectedTierId, selectedAddons)}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-sm uppercase tracking-wide comic-border transition-all flex items-center justify-center gap-2 comic-shadow-sm hover:translate-x-0.5 hover:translate-y-0.5"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Pedir Esta Configuración</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
