import React from 'react';
import { Sparkles, MessageSquare, Mail, Zap, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { ARTIST_INFO } from '../data/commissionsData';
import { AikoLogo } from './AikoHamsterLogo';

interface CommsHeaderProps {
  activeTab: 'catalog' | 'order' | 'tracker' | 'artist';
  setActiveTab: (tab: 'catalog' | 'order' | 'tracker' | 'artist') => void;
  isCommsOpen: boolean;
  openSlots: number;
  totalSlots: number;
  onOpenTos: () => void;
}

export const CommsHeader: React.FC<CommsHeaderProps> = ({
  activeTab,
  setActiveTab,
  isCommsOpen,
  openSlots,
  totalSlots,
  onOpenTos,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-b-2 border-[#18181B] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand & Artist */}
          <div
            id="brand-logo"
            onClick={() => setActiveTab('catalog')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="relative">
              <div className="w-12 h-12 rounded-xl overflow-hidden comic-border bg-amber-300 comic-shadow-sm group-hover:scale-105 transition-transform">
                <img
                  src="/aiko_avatar.jpg"
                  alt="Aiko Mascot"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to SVG logo if image load fails
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-comic text-2xl sm:text-3xl font-bold tracking-wide text-[#18181B] group-hover:text-red-600 transition-colors">
                  AIKO
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md font-bold comic-border bg-amber-400 text-[#18181B] hidden sm:inline-block">
                  @digitalzart
                </span>
              </div>
              <p className="text-xs font-semibold text-stone-600 flex items-center gap-1">
                Comisiones Digitales & Animación
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1.5 p-1.5 rounded-xl bg-stone-100 comic-border">
            <button
              id="nav-tab-catalog"
              onClick={() => setActiveTab('catalog')}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
                activeTab === 'catalog'
                  ? 'bg-amber-400 text-[#18181B] comic-shadow-sm comic-border'
                  : 'text-stone-700 hover:bg-stone-200'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-900" />
              Precios & Estilos
            </button>

            <button
              id="nav-tab-order"
              onClick={() => setActiveTab('order')}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
                activeTab === 'order'
                  ? 'bg-red-500 text-white comic-shadow-sm comic-border'
                  : 'text-stone-700 hover:bg-stone-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Hacer Pedido
            </button>

            <button
              id="nav-tab-tracker"
              onClick={() => setActiveTab('tracker')}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
                activeTab === 'tracker'
                  ? 'bg-stone-900 text-white comic-shadow-sm comic-border'
                  : 'text-stone-700 hover:bg-stone-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Rastrear Pedido
            </button>

            <button
              id="nav-tab-artist"
              onClick={() => setActiveTab('artist')}
              className={`px-3 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 'artist'
                  ? 'bg-purple-600 text-white comic-shadow-sm comic-border'
                  : 'text-purple-700 hover:bg-purple-100'
              }`}
            >
              👑 Panel Aiko
            </button>
          </nav>

          {/* Comms Status Badge & Direct Contact */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider comic-border flex items-center gap-1.5 ${
                isCommsOpen
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-500'
                  : 'bg-red-100 text-red-900 border-red-500'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isCommsOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                }`}
              />
              <span className="hidden sm:inline">
                {isCommsOpen ? `Slots: ${openSlots}/${totalSlots} Libres` : 'Comms Cerradas'}
              </span>
              <span className="sm:hidden font-comic text-sm">
                {isCommsOpen ? 'OPEN' : 'CLOSED'}
              </span>
            </div>

            <button
              onClick={onOpenTos}
              title="Términos del Servicio (TOS)"
              className="p-2 rounded-lg comic-border bg-white text-stone-700 hover:bg-stone-100 transition-colors text-xs font-bold hidden lg:flex items-center gap-1"
            >
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Términos (TOS)</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-stone-300 gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
              activeTab === 'catalog'
                ? 'bg-amber-400 text-black comic-border'
                : 'text-stone-600 hover:bg-stone-200'
            }`}
          >
            ⚡ Precios
          </button>
          <button
            onClick={() => setActiveTab('order')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
              activeTab === 'order'
                ? 'bg-red-500 text-white comic-border'
                : 'text-stone-600 hover:bg-stone-200'
            }`}
          >
            ✨ Pedir
          </button>
          <button
            onClick={() => setActiveTab('tracker')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
              activeTab === 'tracker'
                ? 'bg-stone-900 text-white comic-border'
                : 'text-stone-600 hover:bg-stone-200'
            }`}
          >
            🔍 Rastrear
          </button>
          <button
            onClick={() => setActiveTab('artist')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
              activeTab === 'artist'
                ? 'bg-purple-600 text-white comic-border'
                : 'text-purple-700 hover:bg-purple-100'
            }`}
          >
            👑 Aiko
          </button>
        </div>
      </div>
    </header>
  );
};
