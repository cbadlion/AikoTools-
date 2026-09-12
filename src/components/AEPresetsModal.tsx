import React from 'react';
import { Composition, AELayer } from '../types/ae';
import { PRESET_PROJECTS } from '../utils/presets';
import { X, Sparkles, FolderOpen, Play, Check } from 'lucide-react';

interface AEPresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadPreset: (comp: Composition, layers: AELayer[]) => void;
}

export const AEPresetsModal: React.FC<AEPresetsModalProps> = ({
  isOpen,
  onClose,
  onLoadPreset,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-fade-in select-none">
      <div className="bg-[#151520] border border-[#2B2B3E] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#252536] bg-[#12121A]">
          <div className="flex items-center gap-2">
            <FolderOpen size={18} className="text-[#9D95FF]" />
            <span className="font-bold text-sm text-zinc-100">Proyectos y Plantillas de After Effects</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-[#252538]"
          >
            <X size={16} />
          </button>
        </div>

        {/* List of projects */}
        <div className="p-4 space-y-3">
          <p className="text-xs text-zinc-400 leading-relaxed">
            Selecciona una plantilla para cargar composiciones completas con capas, fotogramas clave con curvas de rebote y efectos VFX listos para editar y reproducir:
          </p>

          <div className="space-y-2">
            {Object.entries(PRESET_PROJECTS).map(([key, item]) => (
              <div
                key={key}
                onClick={() => {
                  onLoadPreset(item.data.composition, item.data.layers);
                  onClose();
                }}
                className="p-3 bg-[#1C1C28] hover:bg-[#242436] border border-[#2B2B3E] hover:border-[#9D95FF]/60 rounded-xl cursor-pointer transition-all active:scale-[0.99] flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-zinc-100 group-hover:text-[#9D95FF] transition-colors">
                      {item.title}
                    </span>
                    <span className="text-[10px] bg-[#2E284A] text-[#9D95FF] font-semibold px-1.5 py-0.5 rounded">
                      {item.data.composition.aspectRatio}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">{item.description}</p>
                </div>

                <div className="w-7 h-7 rounded-full bg-[#12121A] border border-[#333346] flex items-center justify-center text-zinc-400 group-hover:text-zinc-100 group-hover:bg-[#9D95FF] group-hover:text-[#0E0E14] transition-colors shrink-0 ml-2">
                  <Play size={12} fill="currentColor" className="ml-0.5" />
                </div>
              </div>
            ))}
          </div>

          {/* New blank composition */}
          <button
            onClick={() => {
              const cleanComp: Composition = {
                id: `comp_${Date.now()}`,
                name: 'Nueva Composición 9:16',
                width: 720,
                height: 1280,
                fps: 30,
                durationFrames: 150,
                bgColor: '#0F0F16',
                aspectRatio: '9:16',
              };
              onLoadPreset(cleanComp, []);
              onClose();
            }}
            className="w-full py-2 bg-[#202030] hover:bg-[#2A2A3E] text-zinc-300 text-xs font-semibold rounded-xl border border-[#303046] transition-colors"
          >
            Comenzar con Composición Vacía
          </button>
        </div>
      </div>
    </div>
  );
};
