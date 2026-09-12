import React, { useRef } from 'react';
import { Composition, AELayer } from '../types/ae';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Repeat,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Radio,
  Box,
  Wind,
  Plus,
  Copy,
  Scissors,
  Trash2,
  Diamond,
  Type,
  Square,
  Image as ImageIcon,
  Sparkles,
  Sliders,
} from 'lucide-react';

interface AETimelineProps {
  composition: Composition;
  layers: AELayer[];
  currentFrame: number;
  isPlaying: boolean;
  isLooping: boolean;
  selectedLayerId: string | null;
  onSelectLayer: (layerId: string | null) => void;
  onSetFrame: (frame: number) => void;
  onTogglePlay: () => void;
  onToggleLoop: () => void;
  onToggleLayerVisible: (layerId: string) => void;
  onToggleLayerLock: (layerId: string) => void;
  onToggleLayerSolo: (layerId: string) => void;
  onToggleLayerMotionBlur: (layerId: string) => void;
  onToggleLayer3D: (layerId: string) => void;
  onDuplicateLayer: (layerId: string) => void;
  onSplitLayer: (layerId: string) => void;
  onDeleteLayer: (layerId: string) => void;
  onMoveLayer: (layerId: string, direction: 'up' | 'down') => void;
  onAddKeyframeAtPlayhead: (layerId: string) => void;
  className?: string;
}

export const AETimeline: React.FC<AETimelineProps> = ({
  composition,
  layers,
  currentFrame,
  isPlaying,
  isLooping,
  selectedLayerId,
  onSelectLayer,
  onSetFrame,
  onTogglePlay,
  onToggleLoop,
  onToggleLayerVisible,
  onToggleLayerLock,
  onToggleLayerSolo,
  onToggleLayerMotionBlur,
  onToggleLayer3D,
  onDuplicateLayer,
  onSplitLayer,
  onDeleteLayer,
  onMoveLayer,
  onAddKeyframeAtPlayhead,
  className,
}) => {
  const rulerRef = useRef<HTMLDivElement>(null);

  // Timecode formatting MM:SS:FF
  const formatTimecode = (frame: number, fps: number) => {
    const totalSeconds = Math.floor(frame / fps);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const f = frame % fps;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
  };

  // Click or drag on ruler to scrub playhead
  const handleRulerScrub = (e: React.PointerEvent) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const targetFrame = Math.round((x / rect.width) * composition.durationFrames);
    onSetFrame(Math.max(0, Math.min(composition.durationFrames, targetFrame)));
  };

  const getLayerIcon = (type: string) => {
    switch (type) {
      case 'text':
        return <Type size={13} className="text-[#9D95FF]" />;
      case 'shape':
        return <Square size={13} className="text-[#38BDF8]" />;
      case 'image':
        return <ImageIcon size={13} className="text-[#10B981]" />;
      case 'adjustment':
        return <Sparkles size={13} className="text-[#F59E0B]" />;
      case 'null':
        return <Sliders size={13} className="text-[#EF4444]" />;
      default:
        return <Square size={13} className="text-zinc-400" />;
    }
  };

  // Collect all keyframes for a layer to plot diamonds
  const getLayerKeyframeFrames = (layer: AELayer): number[] => {
    const frames = new Set<number>();
    const checkProp = (p: any) => {
      if (p?.isAnimated && p?.keyframes) {
        p.keyframes.forEach((k: any) => frames.add(k.frame));
      }
    };
    checkProp(layer.transform.position);
    checkProp(layer.transform.scale);
    checkProp(layer.transform.rotation);
    checkProp(layer.transform.opacity);
    checkProp(layer.transform.anchorPoint);
    return Array.from(frames).sort((a, b) => a - b);
  };

  const selectedLayer = layers.find((l) => l.id === selectedLayerId);

  return (
    <div className={className || "bg-[#12121A] border-t border-[#232332] flex flex-col select-none shrink-0"}>
      {/* 1. Transport Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#171724] border-b border-[#232332]">
        {/* Timecode & Frame Counter */}
        <div className="flex items-center gap-2">
          <div className="bg-[#0E0E16] px-2.5 py-1 rounded-md border border-[#2B2B3E] font-mono font-bold text-xs text-[#38BDF8] tracking-widest shadow-inner">
            {formatTimecode(currentFrame, composition.fps)}
          </div>
          <span className="text-[11px] font-mono text-zinc-400">
            F: <strong className="text-zinc-200">{currentFrame}</strong> / {composition.durationFrames}
          </span>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-1">
          {/* Jump to Start */}
          <button
            onClick={() => onSetFrame(0)}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded hover:bg-[#252538]"
            title="Ir al inicio (Home)"
          >
            <SkipBack size={15} />
          </button>

          {/* 1 Frame Back */}
          <button
            onClick={() => onSetFrame(Math.max(0, currentFrame - 1))}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded hover:bg-[#252538]"
            title="Retroceder 1 fotograma"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Play / Pause Primary Button */}
          <button
            onClick={onTogglePlay}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-[#9D95FF] to-[#6366F1] hover:from-[#ADA6FF] hover:to-[#7375F5] flex items-center justify-center text-[#0E0E14] shadow-md shadow-indigo-950/60 transition-transform active:scale-90"
            title={isPlaying ? 'Pausar (Espacio)' : 'Reproducir (Espacio)'}
          >
            {isPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" className="ml-0.5" />}
          </button>

          {/* 1 Frame Forward */}
          <button
            onClick={() => onSetFrame(Math.min(composition.durationFrames, currentFrame + 1))}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded hover:bg-[#252538]"
            title="Avanzar 1 fotograma"
          >
            <ChevronRight size={16} />
          </button>

          {/* Jump to End */}
          <button
            onClick={() => onSetFrame(composition.durationFrames)}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded hover:bg-[#252538]"
            title="Ir al final (End)"
          >
            <SkipForward size={15} />
          </button>

          {/* Loop toggle */}
          <button
            onClick={onToggleLoop}
            className={`p-1.5 rounded transition-colors ${
              isLooping ? 'text-[#9D95FF] bg-[#2E284A]' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Bucle continuo de reproducción"
          >
            <Repeat size={14} />
          </button>
        </div>

        {/* Keyframe & Layer Quick Actions */}
        <div className="flex items-center gap-1">
          {selectedLayer && (
            <>
              {/* Add Keyframe button */}
              <button
                onClick={() => onAddKeyframeAtPlayhead(selectedLayer.id)}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold bg-[#2A2346] hover:bg-[#382F5E] text-[#9D95FF] border border-[#483B7E] rounded-md transition-colors"
                title="Añadir Fotograma Clave (Keyframe) en cabezal"
              >
                <Diamond size={12} fill="currentColor" />
                <span className="hidden sm:inline">Keyframe</span>
              </button>

              {/* Split Layer */}
              <button
                onClick={() => onSplitLayer(selectedLayer.id)}
                className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded hover:bg-[#252538]"
                title="Dividir Capa en Cabezal (Ctrl+Shift+D)"
              >
                <Scissors size={14} />
              </button>

              {/* Duplicate Layer */}
              <button
                onClick={() => onDuplicateLayer(selectedLayer.id)}
                className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded hover:bg-[#252538]"
                title="Duplicar Capa (Ctrl+D)"
              >
                <Copy size={14} />
              </button>

              {/* Delete Layer */}
              <button
                onClick={() => onDeleteLayer(selectedLayer.id)}
                className="p-1.5 text-red-400 hover:text-red-300 rounded hover:bg-red-950/40"
                title="Eliminar Capa"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. Timeline Ruler Header & Playhead Scrubber */}
      <div
        ref={rulerRef}
        onPointerDown={handleRulerScrub}
        onPointerMove={(e) => {
          if (e.buttons === 1) handleRulerScrub(e);
        }}
        className="relative h-6 bg-[#161622] border-b border-[#2A2A3C] cursor-pointer select-none overflow-hidden touch-none"
      >
        {/* Frame marks every 15 frames */}
        {Array.from({ length: Math.ceil(composition.durationFrames / 15) + 1 }).map((_, i) => {
          const f = i * 15;
          const leftPercent = (f / composition.durationFrames) * 100;
          return (
            <div
              key={f}
              className="absolute top-0 bottom-0 flex flex-col justify-between pointer-events-none"
              style={{ left: `${leftPercent}%` }}
            >
              <span className="text-[9px] font-mono text-zinc-500 pl-1">{f}f</span>
              <div className="h-2 w-px bg-zinc-700" />
            </div>
          );
        })}

        {/* Playhead Needle indicator */}
        <div
          className="absolute top-0 bottom-0 w-3 -ml-1.5 pointer-events-none z-20 flex flex-col items-center"
          style={{ left: `${(currentFrame / composition.durationFrames) * 100}%` }}
        >
          {/* Cyan/Purple Playhead Head */}
          <div className="w-3 h-3 bg-[#38BDF8] rotate-45 -mt-1.5 shadow-sm shadow-cyan-500" />
          <div className="w-0.5 flex-1 bg-[#38BDF8] shadow-sm shadow-cyan-500" />
        </div>
      </div>

      {/* 3. Layer Tracks List */}
      <div className="flex-1 min-h-[120px] max-h-60 overflow-y-auto divide-y divide-[#1E1E2C] no-scrollbar">
        {layers.length === 0 ? (
          <div className="py-6 text-center text-xs text-zinc-500">
            No hay capas en la composición. Toca "+ Capa" para añadir texto o formas.
          </div>
        ) : (
          layers.map((layer) => {
            const isSelected = selectedLayerId === layer.id;
            const inPercent = (layer.inFrame / composition.durationFrames) * 100;
            const outPercent = (layer.outFrame / composition.durationFrames) * 100;
            const widthPercent = Math.max(2, outPercent - inPercent);
            const keyframeFrames = getLayerKeyframeFrames(layer);

            return (
              <div
                key={layer.id}
                onClick={() => onSelectLayer(layer.id)}
                className={`flex items-center text-xs cursor-pointer transition-colors ${
                  isSelected ? 'bg-[#232135] text-zinc-100' : 'hover:bg-[#181824] text-zinc-300'
                }`}
              >
                {/* Left controls: Label color, name, switches */}
                <div className="w-48 sm:w-64 shrink-0 flex items-center gap-1.5 px-2 py-1.5 border-r border-[#232332]">
                  {/* Color Label pip */}
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: layer.colorLabel || '#9D95FF' }}
                    title="Etiqueta de Color"
                  />

                  {/* Layer Type Icon */}
                  {getLayerIcon(layer.type)}

                  {/* Layer Name */}
                  <span className="font-semibold truncate text-[11px] flex-1">
                    {layer.name}
                  </span>

                  {/* Switches: Eye, Lock, Solo, 3D, Blur */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLayerVisible(layer.id);
                      }}
                      className="p-1 text-zinc-400 hover:text-zinc-100"
                      title={layer.visible ? 'Ocultar Capa' : 'Mostrar Capa'}
                    >
                      {layer.visible ? <Eye size={12} className="text-zinc-200" /> : <EyeOff size={12} className="text-zinc-600" />}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLayerLock(layer.id);
                      }}
                      className="p-1 text-zinc-400 hover:text-zinc-100"
                      title={layer.locked ? 'Desbloquear Capa' : 'Bloquear Capa'}
                    >
                      {layer.locked ? <Lock size={12} className="text-amber-400" /> : <Unlock size={12} className="text-zinc-600" />}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLayerSolo(layer.id);
                      }}
                      className={`p-1 rounded text-[10px] font-bold ${
                        layer.solo ? 'text-amber-400 bg-amber-950/40' : 'text-zinc-600'
                      }`}
                      title="Solo Capa (Aislar)"
                    >
                      S
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLayer3D(layer.id);
                      }}
                      className={`p-1 rounded ${
                        layer.is3D ? 'text-[#9D95FF]' : 'text-zinc-600'
                      }`}
                      title="Capa 3D"
                    >
                      <Box size={12} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLayerMotionBlur(layer.id);
                      }}
                      className={`p-1 rounded ${
                        layer.motionBlur ? 'text-[#38BDF8]' : 'text-zinc-600'
                      }`}
                      title="Desenfoque de Movimiento (Motion Blur)"
                    >
                      <Wind size={12} />
                    </button>
                  </div>
                </div>

                {/* Right: Layer Span Bar & Keyframe Diamonds */}
                <div className="relative flex-1 h-7 bg-[#14141E] overflow-hidden flex items-center px-1">
                  {/* Layer Bar Span */}
                  <div
                    className="absolute h-4 rounded-sm flex items-center shadow-sm"
                    style={{
                      left: `${inPercent}%`,
                      width: `${widthPercent}%`,
                      backgroundColor: `${layer.colorLabel || '#6366F1'}40`,
                      borderLeft: `3px solid ${layer.colorLabel || '#9D95FF'}`,
                      borderRight: `3px solid ${layer.colorLabel || '#9D95FF'}`,
                    }}
                  >
                    <span className="text-[9px] font-bold text-zinc-200 px-1 truncate pointer-events-none opacity-80">
                      {layer.name}
                    </span>
                  </div>

                  {/* Keyframe Diamonds */}
                  {keyframeFrames.map((kfFrame) => {
                    const kfPercent = (kfFrame / composition.durationFrames) * 100;
                    const isAtPlayhead = kfFrame === currentFrame;

                    return (
                      <div
                        key={kfFrame}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSetFrame(kfFrame);
                        }}
                        className={`absolute w-2.5 h-2.5 rotate-45 -ml-1.25 cursor-pointer transition-transform hover:scale-125 z-10 ${
                          isAtPlayhead
                            ? 'bg-[#38BDF8] ring-1 ring-cyan-200 shadow-md shadow-cyan-500'
                            : 'bg-[#9D95FF] hover:bg-white'
                        }`}
                        style={{ left: `${kfPercent}%` }}
                        title={`Keyframe en fotograma ${kfFrame}`}
                      />
                    );
                  })}

                  {/* Background Playhead needle line in track */}
                  <div
                    className="absolute top-0 bottom-0 w-px bg-[#38BDF8]/40 pointer-events-none z-10"
                    style={{ left: `${(currentFrame / composition.durationFrames) * 100}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
