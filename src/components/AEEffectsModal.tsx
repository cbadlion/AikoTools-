import React from 'react';
import { EffectType, LayerEffect } from '../types/ae';
import { X, Sparkles, Wand2, Eye, Sun, Waves, Layers, Film } from 'lucide-react';

interface AEEffectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEffect: (effect: LayerEffect) => void;
}

export const AEEffectsModal: React.FC<AEEffectsModalProps> = ({ isOpen, onClose, onAddEffect }) => {
  if (!isOpen) return null;

  const effectPresets: {
    type: EffectType;
    name: string;
    category: string;
    description: string;
    icon: React.ReactNode;
    defaultParams: Record<string, any>;
  }[] = [
    {
      type: 'glow',
      name: 'Deep Glow',
      category: 'Estilizar y Neón',
      description: 'Resplandor luminoso After Effects con caída física, umbral e intensidad.',
      icon: <Sun size={18} className="text-[#9D95FF]" />,
      defaultParams: { radius: 25, intensity: 2.0, color: '#9D95FF' },
    },
    {
      type: 'glitch',
      name: 'RGB Split / Glitch',
      category: 'Distorsión & Glitch',
      description: 'Separación de canales cromáticos rojo y cian para estética cibernética.',
      icon: <Wand2 size={18} className="text-[#38BDF8]" />,
      defaultParams: { offset: 12, angle: 0, twitchSpeed: 3 },
    },
    {
      type: 'motion_blur',
      name: 'Directional Motion Blur',
      category: 'Desenfoque & Enfoque',
      description: 'Desenfoque cinematográfico direccional por velocidad de desplazamiento.',
      icon: <Sparkles size={18} className="text-[#F59E0B]" />,
      defaultParams: { blurAmount: 18, angle: 45 },
    },
    {
      type: 'gaussian_blur',
      name: 'Fast Gaussian Blur',
      category: 'Desenfoque & Enfoque',
      description: 'Desenfoque gaussiano suave con repetición de píxeles en bordes.',
      icon: <Eye size={18} className="text-[#10B981]" />,
      defaultParams: { radius: 15 },
    },
    {
      type: 'wave_warp',
      name: 'Wave Warp (Ondas)',
      category: 'Distorsión & Glitch',
      description: 'Deformación sinusoidal ondulatoria continua sobre la capa.',
      icon: <Waves size={18} className="text-[#EC4899]" />,
      defaultParams: { height: 16, width: 40, speed: 2 },
    },
    {
      type: 'vignette',
      name: 'Cinematic Vignette',
      category: 'Color & Gradiente',
      description: 'Oscurecimiento radial de esquinas para encuadre cinematográfico.',
      icon: <Layers size={18} className="text-[#A855F7]" />,
      defaultParams: { amount: 0.65, midpoint: 40 },
    },
    {
      type: 'film_grain',
      name: 'Film Grain & Noise',
      category: 'Generar & Textura',
      description: 'Textura orgánica de película analógica 35mm para look vintage.',
      icon: <Film size={18} className="text-[#EAB308]" />,
      defaultParams: { amount: 20, colored: false },
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-fade-in select-none">
      <div className="bg-[#151520] border border-[#2B2B3E] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#252536] bg-[#12121A]">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[#9D95FF]" />
            <span className="font-bold text-sm text-zinc-100">Biblioteca de Efectos (VFX)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-[#252538]"
          >
            <X size={16} />
          </button>
        </div>

        {/* List of effects */}
        <div className="p-3 overflow-y-auto space-y-2 no-scrollbar">
          {effectPresets.map((preset) => (
            <div
              key={preset.name}
              onClick={() => {
                onAddEffect({
                  id: `eff_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                  type: preset.type,
                  name: preset.name,
                  enabled: true,
                  params: preset.defaultParams,
                });
                onClose();
              }}
              className="flex items-start gap-3 p-3 rounded-xl bg-[#1B1B28] hover:bg-[#252538] border border-[#2B2B3E] hover:border-[#9D95FF]/60 cursor-pointer transition-all active:scale-[0.99]"
            >
              <div className="p-2.5 rounded-lg bg-[#12121A] border border-[#2D2D40] shrink-0 mt-0.5">
                {preset.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-zinc-100">{preset.name}</h4>
                  <span className="text-[10px] text-[#9D95FF] font-semibold bg-[#2E284A] px-1.5 py-0.5 rounded">
                    {preset.category}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                  {preset.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
