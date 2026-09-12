import React, { useState, useRef } from 'react';
import { Composition, AELayer } from '../types/ae';
import { renderCompositionFrame } from '../utils/canvasRenderer';
import {
  X,
  Download,
  Film,
  Image as ImageIcon,
  FileCode,
  CheckCircle,
  Loader2,
  Play,
  Upload,
} from 'lucide-react';

interface AERenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  composition: Composition;
  layers: AELayer[];
  currentFrame: number;
  onLoadProject: (comp: Composition, layers: AELayer[]) => void;
}

export const AERenderModal: React.FC<AERenderModalProps> = ({
  isOpen,
  onClose,
  composition,
  layers,
  currentFrame,
  onLoadProject,
}) => {
  const [renderType, setRenderType] = useState<'video' | 'gif' | 'png' | 'json'>('video');
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadFilename, setDownloadFilename] = useState('');
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // 1. Export High-Res PNG Frame
  const handleExportPNG = () => {
    const canvas = document.createElement('canvas');
    canvas.width = composition.width;
    canvas.height = composition.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderCompositionFrame(ctx, composition, layers, currentFrame);

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${composition.name.toLowerCase().replace(/\s+/g, '_')}_f${currentFrame}.png`;
    a.click();
    onClose();
  };

  // 2. Export Project JSON (.aepm)
  const handleExportJSON = () => {
    const projectData = {
      version: '1.0',
      application: 'AfterEffectsMobile',
      timestamp: new Date().toISOString(),
      composition,
      layers,
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${composition.name.toLowerCase().replace(/\s+/g, '_')}.aepm`;
    a.click();
    onClose();
  };

  // Import Project JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.composition && parsed.layers) {
          onLoadProject(parsed.composition, parsed.layers);
          onClose();
        }
      } catch (err) {
        alert('Archivo de proyecto inválido (.aepm)');
      }
    };
    reader.readAsText(file);
  };

  // 3. Render Video (WebM / MP4) via Canvas MediaRecorder
  const handleRenderVideo = async () => {
    setIsRendering(true);
    setRenderProgress(0);
    setDownloadUrl(null);

    const canvas = document.createElement('canvas');
    canvas.width = composition.width;
    canvas.height = composition.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsRendering(false);
      return;
    }

    try {
      // Capture canvas stream
      const stream = canvas.captureStream(composition.fps);
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 6000000, // 6 Mbps HD
      });

      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const renderPromise = new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          resolve(blob);
        };
      });

      recorder.start();

      const totalFrames = composition.durationFrames;
      const frameInterval = 1000 / composition.fps;

      for (let f = 0; f <= totalFrames; f++) {
        renderCompositionFrame(ctx, composition, layers, f);
        setRenderProgress(Math.round((f / totalFrames) * 100));
        // Small delay to allow recorder to consume frames
        await new Promise((r) => setTimeout(r, Math.min(25, frameInterval)));
      }

      recorder.stop();
      const videoBlob = await renderPromise;
      const videoUrl = URL.createObjectURL(videoBlob);

      setDownloadUrl(videoUrl);
      setDownloadFilename(`${composition.name.toLowerCase().replace(/\s+/g, '_')}.webm`);
      setIsRendering(false);
    } catch (err) {
      console.error('Render error:', err);
      // Fallback to PNG snapshot if MediaRecorder fails
      handleExportPNG();
      setIsRendering(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-fade-in select-none">
      <div className="bg-[#151520] border border-[#2B2B3E] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#252536] bg-[#12121A]">
          <div className="flex items-center gap-2">
            <Download size={18} className="text-[#9D95FF]" />
            <span className="font-bold text-sm text-zinc-100">Cola de Procesamiento (Render Queue)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-[#252538]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Format Selection */}
          <div>
            <label className="text-xs font-semibold text-zinc-400 block mb-2">
              Formato de Salida:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setRenderType('video')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  renderType === 'video'
                    ? 'bg-[#2E284A] border-[#9D95FF] text-[#9D95FF]'
                    : 'bg-[#1C1C28] border-[#2A2A3C] text-zinc-400'
                }`}
              >
                <Film size={16} />
                <span>Vídeo HD (WebM)</span>
              </button>

              <button
                onClick={() => setRenderType('png')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  renderType === 'png'
                    ? 'bg-[#2E284A] border-[#9D95FF] text-[#9D95FF]'
                    : 'bg-[#1C1C28] border-[#2A2A3C] text-zinc-400'
                }`}
              >
                <ImageIcon size={16} />
                <span>Fotograma PNG</span>
              </button>

              <button
                onClick={() => setRenderType('json')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  renderType === 'json'
                    ? 'bg-[#2E284A] border-[#9D95FF] text-[#9D95FF]'
                    : 'bg-[#1C1C28] border-[#2A2A3C] text-zinc-400'
                }`}
              >
                <FileCode size={16} />
                <span>Proyecto (.aepm)</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-[#2A2A3C] bg-[#1C1C28] hover:bg-[#252538] text-xs font-bold text-zinc-300 transition-all"
              >
                <Upload size={16} />
                <span>Cargar .aepm</span>
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.aepm"
            onChange={handleImportJSON}
            className="hidden"
          />

          {/* Composition summary */}
          <div className="bg-[#1C1C28] p-3 rounded-xl border border-[#2A2A3C] text-xs space-y-1">
            <div className="flex justify-between text-zinc-400">
              <span>Resolución:</span>
              <strong className="text-zinc-200 font-mono">
                {composition.width} × {composition.height} ({composition.aspectRatio})
              </strong>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Velocidad:</span>
              <strong className="text-zinc-200 font-mono">{composition.fps} FPS</strong>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Duración:</span>
              <strong className="text-zinc-200 font-mono">
                {composition.durationFrames} fotogramas ({(composition.durationFrames / composition.fps).toFixed(1)}s)
              </strong>
            </div>
          </div>

          {/* Rendering Progress Bar */}
          {isRendering && (
            <div className="space-y-1.5 bg-[#171724] p-3 rounded-xl border border-[#2B2B3E]">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
                <span className="flex items-center gap-1.5">
                  <Loader2 size={14} className="animate-spin text-[#9D95FF]" />
                  Procesando fotogramas...
                </span>
                <span className="font-mono text-[#9D95FF]">{renderProgress}%</span>
              </div>
              <div className="w-full bg-[#111118] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#9D95FF] to-[#38BDF8] h-full transition-all duration-100"
                  style={{ width: `${renderProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Ready Download link */}
          {downloadUrl && (
            <div className="bg-emerald-950/40 border border-emerald-800/60 p-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-emerald-300 font-bold">
                <CheckCircle size={16} />
                <span>¡Vídeo Renderizado con Éxito!</span>
              </div>
              <a
                href={downloadUrl}
                download={downloadFilename}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-lg shadow"
              >
                Descargar Vídeo
              </a>
            </div>
          )}

          {/* Action Button */}
          {!isRendering && !downloadUrl && (
            <button
              onClick={() => {
                if (renderType === 'video') handleRenderVideo();
                else if (renderType === 'png') handleExportPNG();
                else if (renderType === 'json') handleExportJSON();
              }}
              className="w-full py-2.5 bg-gradient-to-r from-[#9D95FF] to-[#6366F1] hover:from-[#ADA6FF] hover:to-[#7577F8] text-[#0E0E14] font-black text-xs rounded-xl shadow-lg shadow-indigo-950/60 transition-transform active:scale-95"
            >
              {renderType === 'video' ? 'Iniciar Renderizado' : 'Descargar Archivo'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
