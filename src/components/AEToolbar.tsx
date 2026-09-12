import React, { useRef } from 'react';
import { ActiveTool } from '../types/ae';
import {
  MousePointer,
  Hand,
  RotateCw,
  Crosshair,
  Square,
  Type,
  Plus,
  Layers,
  Sparkles,
  Image as ImageIcon,
  Upload,
  Music,
} from 'lucide-react';

interface AEToolbarProps {
  activeTool: ActiveTool;
  onSelectTool: (tool: ActiveTool) => void;
  onOpenNewLayer: () => void;
  onOpenEffectsModal: () => void;
  onAddImageLayer?: (dataUrl: string, name?: string, naturalWidth?: number, naturalHeight?: number) => void;
  onOpenMp3Converter?: () => void;
  hasSelectedLayer: boolean;
}

export const AEToolbar: React.FC<AEToolbarProps> = ({
  activeTool,
  onSelectTool,
  onOpenNewLayer,
  onOpenEffectsModal,
  onAddImageLayer,
  onOpenMp3Converter,
  hasSelectedLayer,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tools: { id: ActiveTool; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { id: 'select', label: 'Selección', icon: <MousePointer size={16} />, shortcut: 'V' },
    { id: 'hand', label: 'Mano / Encuadre', icon: <Hand size={16} />, shortcut: 'H' },
    { id: 'rotate', label: 'Rotación', icon: <RotateCw size={16} />, shortcut: 'W' },
    { id: 'anchor', label: 'Punto de Anclaje', icon: <Crosshair size={16} />, shortcut: 'Y' },
    { id: 'shape', label: 'Herramienta Forma', icon: <Square size={16} />, shortcut: 'Q' },
    { id: 'text', label: 'Herramienta Texto', icon: <Type size={16} />, shortcut: 'T' },
  ];

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (result && onAddImageLayer) {
        const img = new Image();
        img.onload = () => {
          onAddImageLayer(result, file.name.replace(/\.[^.]+$/, ''), img.naturalWidth, img.naturalHeight);
        };
        img.src = result;
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="bg-[#15151E] border-b border-[#232330] px-2 py-1.5 flex items-center justify-between gap-1 select-none shrink-0 overflow-x-auto no-scrollbar">
      {/* Tool items */}
      <div className="flex items-center gap-1">
        {tools.map((t) => {
          const isActive = activeTool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onSelectTool(t.id)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-[#2E284A] text-[#9D95FF] border border-[#9D95FF]/60 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1C1C28] border border-transparent'
              }`}
              title={`${t.label} (${t.shortcut})`}
            >
              {t.icon}
              <span className="hidden sm:inline text-[11px]">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Layer, Image and Effect Add Buttons */}
      <div className="flex items-center gap-1.5 ml-auto">
        {/* Direct MP3 to URL Tool button */}
        {onOpenMp3Converter && (
          <button
            onClick={onOpenMp3Converter}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#1C1733] hover:bg-[#28214A] text-[#B8B1FF] border border-[#3E336E] transition-colors shadow-sm"
            title="Convertir Archivos MP3 en URL Pública Directa"
          >
            <Music size={14} className="text-[#38BDF8]" />
            <span className="text-[11px]">MP3 a URL</span>
          </button>
        )}

        {/* Direct Image button */}
        <label
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#142332] hover:bg-[#1C3146] text-[#38BDF8] border border-[#234563] cursor-pointer transition-colors shadow-sm"
          title="Añadir Imagen desde galería o archivo"
        >
          <ImageIcon size={14} className="text-[#38BDF8]" />
          <span className="text-[11px]">Imagen</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageFile}
            className="hidden"
          />
        </label>

        {/* VFX button (always visible) */}
        <button
          onClick={onOpenEffectsModal}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#261E42] text-[#B4ACFF] hover:bg-[#322858] border border-[#483B7E] transition-colors shadow-sm"
          title="Añadir Efecto Visual (Deep Glow, Glitch, Blur, Wave Warp, Vignette, etc.)"
        >
          <Sparkles size={14} className="text-[#A78BFA]" />
          <span className="text-[11px] font-bold">Efectos VFX</span>
        </button>

        {/* General New Layer button */}
        <button
          onClick={onOpenNewLayer}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#272738] hover:bg-[#34344C] text-zinc-100 border border-[#3A3A52] transition-colors"
          title="Nueva Capa (Texto, Forma, Sólido, Nulo, Ajuste)"
        >
          <Plus size={15} className="text-[#A1A1AA]" />
          <span className="text-[11px]">Capa</span>
        </button>
      </div>
    </div>
  );
};
