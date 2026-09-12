import React, { useState } from 'react';
import { Composition, AspectRatioType } from '../types/ae';
import {
  Sparkles,
  Download,
  RotateCcw,
  RotateCw,
  Grid,
  Maximize,
  Minimize,
  FolderOpen,
  Music,
} from 'lucide-react';

interface AETopBarProps {
  composition: Composition;
  onUpdateComposition: (updates: Partial<Composition>) => void;
  showGuides: boolean;
  onToggleGuides: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenRenderModal: () => void;
  onOpenPresets: () => void;
  onOpenMp3Converter?: () => void;
}

export const AETopBar: React.FC<AETopBarProps> = ({
  composition,
  onUpdateComposition,
  showGuides,
  onToggleGuides,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenRenderModal,
  onOpenPresets,
  onOpenMp3Converter,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };
  const handleAspectChange = (aspect: AspectRatioType) => {
    let width = 720;
    let height = 1280;

    switch (aspect) {
      case '9:16':
        width = 720;
        height = 1280;
        break;
      case '16:9':
        width = 1280;
        height = 720;
        break;
      case '1:1':
        width = 1080;
        height = 1080;
        break;
      case '4:5':
        width = 1080;
        height = 1350;
        break;
    }

    onUpdateComposition({ aspectRatio: aspect, width, height });
  };

  return (
    <header className="bg-[#121218] border-b border-[#232330] px-2.5 py-1.5 flex items-center justify-between text-zinc-200 select-none z-30 shrink-0">
      {/* Brand & Comp Info */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#9D95FF] to-[#6366F1] flex items-center justify-center shadow-lg shadow-indigo-950/40">
          <span className="text-[#0E0E14] font-black text-sm tracking-tight">Ae</span>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold tracking-wide text-zinc-100 uppercase">
              {composition.name}
            </span>
            <span className="text-[10px] bg-[#232332] text-[#9D95FF] font-semibold px-1.5 py-0.5 rounded border border-[#333346]">
              {composition.fps} FPS
            </span>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono block">
            {composition.width} × {composition.height} ({composition.aspectRatio})
          </span>
        </div>
      </div>

      {/* Center Controls: Aspect Ratio & Presets */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Aspect Ratio Selector */}
        <div className="flex items-center bg-[#1A1A24] p-0.5 rounded-lg border border-[#272738]">
          {(['9:16', '16:9', '1:1'] as AspectRatioType[]).map((ar) => (
            <button
              key={ar}
              onClick={() => handleAspectChange(ar)}
              className={`px-2 py-1 text-[11px] font-bold rounded-md transition-all ${
                composition.aspectRatio === ar
                  ? 'bg-[#9D95FF] text-[#0E0E14] shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title={`Formato ${ar}`}
            >
              {ar}
            </button>
          ))}
        </div>

        {/* Guides toggle */}
        <button
          onClick={onToggleGuides}
          className={`p-1.5 rounded-lg border transition-colors ${
            showGuides
              ? 'bg-[#2E284A] border-[#9D95FF] text-[#9D95FF]'
              : 'bg-[#1A1A24] border-[#272738] text-zinc-400 hover:text-zinc-200'
          }`}
          title="Guías y Márgenes Seguros"
        >
          <Grid size={15} />
        </button>

        {/* Presets library button */}
        <button
          onClick={onOpenPresets}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-[#1F1F2C] hover:bg-[#28283A] text-zinc-200 rounded-lg border border-[#2E2E42] transition-colors"
          title="Proyectos y Plantillas de After Effects"
        >
          <FolderOpen size={14} className="text-[#9D95FF]" />
          <span className="hidden sm:inline">Plantillas</span>
        </button>

        {/* MP3 to URL Converter Button */}
        {onOpenMp3Converter && (
          <button
            onClick={onOpenMp3Converter}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-[#1C1834] hover:bg-[#262047] text-[#B8B1FF] rounded-lg border border-[#403572] transition-colors shadow-sm"
            title="Convertir Archivo MP3 en URL Pública Directa"
          >
            <Music size={14} className="text-[#38BDF8]" />
            <span className="hidden sm:inline">MP3 a URL</span>
          </button>
        )}

        {/* Undo / Redo */}
        <div className="hidden sm:flex items-center bg-[#1A1A24] rounded-lg border border-[#272738] p-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1 text-zinc-400 hover:text-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Deshacer (Ctrl+Z)"
          >
            <RotateCcw size={14} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1 text-zinc-400 hover:text-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Rehacer (Ctrl+Y)"
          >
            <RotateCw size={14} />
          </button>
        </div>
      </div>

      {/* Right Controls: Fullscreen toggle & Render Queue */}
      <div className="flex items-center gap-1.5">
        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border bg-[#1A1A24] border-[#272738] text-zinc-400 hover:text-zinc-200 transition-colors"
          title={isFullscreen ? 'Salir de Pantalla Completa' : 'Modo Pantalla Completa'}
        >
          {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
          <span className="hidden lg:inline">{isFullscreen ? 'Ventana' : 'Pantalla Completa'}</span>
        </button>

        {/* Render & Export Button */}
        <button
          onClick={onOpenRenderModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#9D95FF] to-[#6366F1] hover:from-[#ADA6FF] hover:to-[#7577F8] text-[#0E0E14] font-bold text-xs rounded-lg shadow-md shadow-indigo-950/50 transition-transform active:scale-95"
        >
          <Download size={14} className="stroke-[2.5]" />
          <span>Exportar</span>
        </button>
      </div>
    </header>
  );
};
