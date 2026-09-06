import React from 'react';
import { ShieldCheck, Cpu, Zap, Lock, Sparkles, Heart } from 'lucide-react';
import { AikoHamsterLogo } from './AikoHamsterLogo';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

export const Footer: React.FC = () => {
  const { t } = useLanguage();
  const { theme } = useTheme();

  return (
    <footer className="w-full mt-12 border-t border-[#1C2234] bg-[#080A10] text-stone-400 font-['Outfit']">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Top Badges with distinct colors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-[#1A2030] pb-8">
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#0F121C] border border-[#1E2536]">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-400">
              <Lock className="h-4 w-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-white">100% Privado en Navegador</h4>
              <p className="text-[11px] text-stone-400 leading-tight">
                Tus archivos nunca viajan a la nube ni a servidores externos.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#0F121C] border border-[#1E2536]">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-400">
              <Cpu className="h-4 w-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-white">Aceleración Wasm & Canvas</h4>
              <p className="text-[11px] text-stone-400 leading-tight">
                Motor gráfico de alta fidelidad optimizado en tiempo real.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#0F121C] border border-[#1E2536]">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-400">
              <Zap className="h-4 w-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-white">Sin Anuncios ni Límites</h4>
              <p className="text-[11px] text-stone-400 leading-tight">
                Acceso completo e ilimitado a todas las herramientas.
              </p>
            </div>
          </div>
        </div>

        {/* Main Footer Content */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#121624] border border-[#262C3E] p-1.5 flex items-center justify-center shadow-md">
              <AikoHamsterLogo size={26} color="#FFFFFF" accentColor={theme.primary} showText={false} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-['Syne'] text-base font-black text-white">
                  Aiko<span style={{ color: theme.primary }}>Tools</span> Studio
                </span>
                <span
                  style={{ color: theme.primary, borderColor: `${theme.primary}40`, backgroundColor: `${theme.primary}15` }}
                  className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold border"
                >
                  PRO v2.5
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                La navaja suiza multimedia definitiva para creadores y diseñadores.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-mono text-stone-400">
            <span className="px-2 py-1 rounded-lg bg-[#141722] border border-[#222838] hover:text-white transition-colors">PNG</span>
            <span className="px-2 py-1 rounded-lg bg-[#141722] border border-[#222838] hover:text-white transition-colors">JPG</span>
            <span className="px-2 py-1 rounded-lg bg-[#141722] border border-[#222838] hover:text-white transition-colors">WEBP</span>
            <span className="px-2 py-1 rounded-lg bg-[#141722] border border-[#222838] hover:text-white transition-colors">AVIF</span>
            <span className="px-2 py-1 rounded-lg bg-[#141722] border border-[#222838] hover:text-white transition-colors">GIF</span>
            <span className="px-2 py-1 rounded-lg bg-[#141722] border border-[#222838] hover:text-white transition-colors">MP4</span>
            <span className="px-2 py-1 rounded-lg bg-[#141722] border border-[#222838] hover:text-white transition-colors">WEBM</span>
            <span className="px-2 py-1 rounded-lg bg-[#141722] border border-[#222838] hover:text-white transition-colors">SVG</span>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] border-t border-[#161B28] pt-6 font-mono text-stone-400">
          <div className="flex items-center gap-1.5">
            <span>Hecho con</span>
            <Heart className="h-3 w-3 text-rose-500 fill-rose-500 inline" />
            <span>para velocidad, calidad y privacidad absoluta.</span>
          </div>

          <div className="flex items-center gap-3">
            <span style={{ color: theme.primary }} className="font-bold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full animate-ping" style={{ backgroundColor: theme.primary }} />
              Motor Activo
            </span>
            <span>01 / 01</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
