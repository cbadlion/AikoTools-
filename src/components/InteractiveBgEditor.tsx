import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Wand2,
  Eraser,
  RotateCcw,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye,
  Download,
  Sparkles,
  Layers,
  Check,
  Share2,
  Sliders,
  Paintbrush
} from 'lucide-react';
import { exportCanvasToFormat, formatFileSize } from '../utils/mediaEngine';
import { notifyUser } from '../utils/notifications';
import { saveToHistory } from '../utils/historyStorage';
import { ProcessResult } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface InteractiveBgEditorProps {
  file: File;
  previewUrl: string;
  onClose?: () => void;
  onApplyResult?: (result: ProcessResult) => void;
}

export const InteractiveBgEditor: React.FC<InteractiveBgEditorProps> = ({
  file,
  previewUrl,
  onApplyResult
}) => {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Tools: 'magic' (Varita Mágica Táctil), 'brush' (Borrador con Dedo), 'restore' (Pincel Restaurador)
  const [activeTool, setActiveTool] = useState<'magic' | 'brush' | 'restore'>('magic');

  // Brush settings
  const [brushSize, setBrushSize] = useState<number>(30);
  const [brushSoftness, setBrushSoftness] = useState<number>(2);

  // Magic Wand settings
  const [magicTolerance, setMagicTolerance] = useState<number>(30);
  const [magicMode, setMagicMode] = useState<'flood' | 'global'>('flood');

  // Canvas Viewport & Zoom
  const [zoom, setZoom] = useState<number>(1);
  const [showOriginal, setShowOriginal] = useState<boolean>(false);
  const [bgPreviewType, setBgPreviewType] = useState<'checker' | 'white' | 'black' | 'green' | 'custom'>('checker');
  const [customBgColor, setCustomBgColor] = useState<string>('#3B82F6');

  // History Stack for Undo/Redo
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });

  // Processing & Export State
  const [isAutoProcessing, setIsAutoProcessing] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<'png' | 'webp' | 'avif' | 'jpg' | 'ico' | 'bmp' | 'pdf'>('png');
  const [currentResult, setCurrentResult] = useState<ProcessResult | null>(null);
  const [tapEffect, setTapEffect] = useState<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });

  // 1. Initialize Canvas with Original Image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = previewUrl;
    img.onload = () => {
      originalImageRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Save initial state to history
      const initialData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([initialData]);
      setHistoryIndex(0);
    };
  }, [previewUrl]);

  // Push new state to history
  const pushHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => {
      const nextHistory = prev.slice(0, historyIndex + 1);
      if (nextHistory.length >= 20) nextHistory.shift(); // Limit to 20 steps
      return [...nextHistory, currentData];
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 19));
  }, [historyIndex]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    const prevIndex = historyIndex - 1;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.putImageData(history[prevIndex], 0, 0);
    setHistoryIndex(prevIndex);
  }, [historyIndex, history]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const nextIndex = historyIndex + 1;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.putImageData(history[nextIndex], 0, 0);
    setHistoryIndex(nextIndex);
  }, [historyIndex, history]);

  // Reset to original
  const handleReset = () => {
    if (!originalImageRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(originalImageRef.current, 0, 0);
    pushHistory();
  };

  // Keyboard Shortcuts (Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Coordinate Conversion Helper (from mouse/touch client coordinates to canvas pixel space)
  const getCanvasCoords = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor((clientX - rect.left) * scaleX);
    const y = Math.floor((clientY - rect.top) * scaleY);

    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return null;
    return { x, y };
  };

  // 2. MAGIC WAND / SELECCIÓN MÁGICA INTELIGENTE (TAP TO ERASE)
  const executeMagicWand = (startX: number, startY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    const startIdx = (startY * width + startX) * 4;
    const targetR = data[startIdx];
    const targetG = data[startIdx + 1];
    const targetB = data[startIdx + 2];
    const targetA = data[startIdx + 3];

    // If already fully transparent, ignore
    if (targetA === 0) return;

    // Perceptual Redmean Delta-E
    const getDeltaE = (r: number, g: number, b: number) => {
      const rMean = (r + targetR) / 2;
      const dr = r - targetR;
      const dg = g - targetG;
      const db = b - targetB;
      return Math.sqrt(
        (2 + rMean / 256) * dr * dr +
        4.0 * dg * dg +
        (2 + (255 - rMean) / 256) * db * db
      );
    };

    const maxDist = (magicTolerance / 100) * 580;

    if (magicMode === 'flood') {
      // BFS Flood Fill Contiguous Region
      const totalPixels = width * height;
      const visited = new Uint8Array(totalPixels);
      const queue: number[] = [startY * width + startX];
      visited[startY * width + startX] = 1;

      let head = 0;
      while (head < queue.length) {
        const idx = queue[head++];
        const offset = idx * 4;

        data[offset + 3] = 0; // Make transparent

        const px = idx % width;
        const py = Math.floor(idx / width);

        // 4 neighbors
        const neighbors = [
          px > 0 ? idx - 1 : -1,
          px < width - 1 ? idx + 1 : -1,
          py > 0 ? idx - width : -1,
          py < height - 1 ? idx + width : -1
        ];

        for (const n of neighbors) {
          if (n !== -1 && !visited[n]) {
            visited[n] = 1;
            const nOff = n * 4;
            if (data[nOff + 3] > 0) {
              const dist = getDeltaE(data[nOff], data[nOff + 1], data[nOff + 2]);
              if (dist <= maxDist) {
                queue.push(n);
              }
            }
          }
        }
      }
    } else {
      // Global Color Match
      const totalPixels = width * height;
      for (let i = 0; i < totalPixels; i++) {
        const offset = i * 4;
        if (data[offset + 3] > 0) {
          const dist = getDeltaE(data[offset], data[offset + 1], data[offset + 2]);
          if (dist <= maxDist) {
            data[offset + 3] = 0;
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    pushHistory();
  };

  // 3. FINGER / BRUSH ERASER & RESTORER DRAWING
  const drawBrushStroke = (x: number, y: number, isStarting: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const from = lastPointRef.current || { x, y };

    ctx.save();
    if (activeTool === 'brush') {
      // Erase to transparent
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      if (isStarting) {
        ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    } else if (activeTool === 'restore' && originalImageRef.current) {
      // Restore original pixels
      ctx.globalCompositeOperation = 'source-over';

      // Create a pattern or clip circle with original image
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(originalImageRef.current, 0, 0);
    }
    ctx.restore();

    lastPointRef.current = { x, y };
  };

  // Touch & Pointer Event Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);
    if (!coords) return;

    if (activeTool === 'magic') {
      // Trigger magic tap animation
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setTapEffect({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          active: true
        });
        setTimeout(() => setTapEffect((p) => ({ ...p, active: false })), 400);
      }
      executeMagicWand(coords.x, coords.y);
    } else {
      setIsDrawing(true);
      lastPointRef.current = coords;
      drawBrushStroke(coords.x, coords.y, true);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);
    if (coords) {
      setCursorPos({ x: e.clientX, y: e.clientY, visible: true });
      if (isDrawing && (activeTool === 'brush' || activeTool === 'restore')) {
        drawBrushStroke(coords.x, coords.y, false);
      }
    } else {
      setCursorPos((p) => ({ ...p, visible: false }));
    }
  };

  const handlePointerUp = () => {
    if (isDrawing) {
      setIsDrawing(false);
      lastPointRef.current = null;
      pushHistory();
    }
  };

  // 4. AUTO 1-CLICK BACKGROUND REMOVER (PERIMETRAL AUTO-SUJETO)
  const handleAutoRemoveBackground = async () => {
    if (!canvasRef.current || !originalImageRef.current) return;
    setIsAutoProcessing(true);

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;

      // Sample borders for dominant background color
      const samples: { r: number; g: number; b: number }[] = [];
      const stepX = Math.max(1, Math.floor(width / 30));
      const stepY = Math.max(1, Math.floor(height / 30));

      for (let x = 0; x < width; x += stepX) {
        const topIdx = x * 4;
        const btmIdx = ((height - 1) * width + x) * 4;
        samples.push({ r: data[topIdx], g: data[topIdx + 1], b: data[topIdx + 2] });
        samples.push({ r: data[btmIdx], g: data[btmIdx + 1], b: data[btmIdx + 2] });
      }
      for (let y = 0; y < height; y += stepY) {
        const leftIdx = y * width * 4;
        const rightIdx = (y * width + (width - 1)) * 4;
        samples.push({ r: data[leftIdx], g: data[leftIdx + 1], b: data[leftIdx + 2] });
        samples.push({ r: data[rightIdx], g: data[rightIdx + 1], b: data[rightIdx + 2] });
      }

      // Dominant color
      let sumR = 0, sumG = 0, sumB = 0;
      for (const s of samples) {
        sumR += s.r; sumG += s.g; sumB += s.b;
      }
      const domR = Math.round(sumR / samples.length);
      const domG = Math.round(sumG / samples.length);
      const domB = Math.round(sumB / samples.length);

      const getPerceptualDist = (r: number, g: number, b: number) => {
        const rMean = (r + domR) / 2;
        const dr = r - domR;
        const dg = g - domG;
        const db = b - domB;
        return Math.sqrt((2 + rMean / 256) * dr * dr + 4.0 * dg * dg + (2 + (255 - rMean) / 256) * db * db);
      };

      const maxThreshold = (magicTolerance / 100) * 580;

      // Flood fill from borders
      const totalPixels = width * height;
      const visited = new Uint8Array(totalPixels);
      const queue: number[] = [];

      for (let x = 0; x < width; x++) {
        queue.push(x);
        queue.push((height - 1) * width + x);
      }
      for (let y = 1; y < height - 1; y++) {
        queue.push(y * width);
        queue.push(y * width + (width - 1));
      }

      for (const idx of queue) visited[idx] = 1;

      let head = 0;
      while (head < queue.length) {
        const idx = queue[head++];
        const offset = idx * 4;
        const dist = getPerceptualDist(data[offset], data[offset + 1], data[offset + 2]);

        if (dist <= maxThreshold) {
          data[offset + 3] = 0;

          const px = idx % width;
          const py = Math.floor(idx / width);

          if (px > 0 && !visited[idx - 1]) { visited[idx - 1] = 1; queue.push(idx - 1); }
          if (px < width - 1 && !visited[idx + 1]) { visited[idx + 1] = 1; queue.push(idx + 1); }
          if (py > 0 && !visited[idx - width]) { visited[idx - width] = 1; queue.push(idx - width); }
          if (py < height - 1 && !visited[idx + width]) { visited[idx + width] = 1; queue.push(idx + width); }
        }
      }

      ctx.putImageData(imgData, 0, 0);
      pushHistory();
    } finally {
      setIsAutoProcessing(false);
    }
  };

  // 5. EXPORT AND SAVE
  const handleExport = async () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const bgCol = bgPreviewType === 'white' ? '#FFFFFF' : bgPreviewType === 'black' ? '#000000' : bgPreviewType === 'green' ? '#00FF00' : bgPreviewType === 'custom' ? customBgColor : undefined;

    const exp = await exportCanvasToFormat(canvas, exportFormat as any, 0.95, bgCol);
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const fileName = `aikotools_sin_fondo_${baseName}.${exp.ext}`;
    const url = URL.createObjectURL(exp.blob);

    const res: ProcessResult = {
      blob: exp.blob,
      url,
      fileName,
      newSize: exp.blob.size,
      originalSize: file.size,
      width: canvas.width,
      height: canvas.height,
      format: `${exp.formatLabel}${exp.ext !== 'jpg' && exp.ext !== 'jpeg' ? ' TRANSPARENTE' : ''}`,
      timeTakenMs: 45,
      extraInfo: `Edición táctil personalizada · ${canvas.width}×${canvas.height}px`
    };

    setCurrentResult(res);
    await saveToHistory(res, 'Eliminar Fondo');

    if (onApplyResult) {
      onApplyResult(res);
    }

    notifyUser({
      title: '✨ Recorte listo',
      body: `Tu archivo "${fileName}" se ha generado con éxito (${formatFileSize(res.newSize)}).`
    });
  };

  const handleDownload = () => {
    if (!currentResult) {
      handleExport().then(() => {
        // Trigger auto download if fresh
      });
      return;
    }
    const a = document.createElement('a');
    a.href = currentResult.url;
    a.download = currentResult.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShare = async () => {
    if (!currentResult) await handleExport();
    if (!currentResult) return;
    if (navigator.share && navigator.canShare) {
      try {
        const shareFile = new File([currentResult.blob], currentResult.fileName, { type: currentResult.blob.type });
        if (navigator.canShare({ files: [shareFile] })) {
          await navigator.share({
            files: [shareFile],
            title: currentResult.fileName,
            text: 'Fondo eliminado con AikoTools'
          });
          return;
        }
      } catch {
        // fallback
      }
    }
    handleDownload();
  };

  return (
    <div id="interactive-bg-editor" className="w-full space-y-4 font-['Outfit']">
      {/* Top Interactive Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-[#141722] border border-[#222736] shadow-md">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Tool 1: Varita Mágica Táctil */}
          <button
            type="button"
            id="tool-magic-wand"
            onClick={() => setActiveTool('magic')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTool === 'magic'
                ? 'bg-gradient-to-r from-[#10B981] to-[#059669] text-white shadow-[0_0_12px_rgba(16,185,129,0.4)] border border-[#34D399]'
                : 'bg-[#181C2B] text-stone-300 hover:text-white border border-[#262C3E]'
            }`}
          >
            <Wand2 className="h-4 w-4 text-[#34D399]" />
            <span>{t('interactive.magicWand', 'Selección Mágica')}</span>
          </button>

          {/* Tool 2: Borrador con Dedo */}
          <button
            type="button"
            id="tool-finger-brush"
            onClick={() => setActiveTool('brush')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTool === 'brush'
                ? 'bg-gradient-to-r from-[#10B981] to-[#059669] text-white shadow-[0_0_12px_rgba(16,185,129,0.4)] border border-[#34D399]'
                : 'bg-[#181C2B] text-stone-300 hover:text-white border border-[#262C3E]'
            }`}
          >
            <Eraser className="h-4 w-4 text-[#34D399]" />
            <span>{t('interactive.fingerBrush', 'Borrar con Dedo')}</span>
          </button>

          {/* Tool 3: Pincel Restaurador */}
          <button
            type="button"
            id="tool-restore-brush"
            onClick={() => setActiveTool('restore')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTool === 'restore'
                ? 'bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white shadow-[0_0_12px_rgba(59,130,246,0.4)] border border-[#60A5FA]'
                : 'bg-[#181C2B] text-stone-300 hover:text-white border border-[#262C3E]'
            }`}
          >
            <Paintbrush className="h-4 w-4 text-[#60A5FA]" />
            <span>{t('interactive.restore', 'Restaurar')}</span>
          </button>

          {/* Auto AI Button */}
          <button
            type="button"
            onClick={handleAutoRemoveBackground}
            disabled={isAutoProcessing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#14261C] hover:bg-[#1A3326] text-[#34D399] border border-[#10B981]/50 transition-all cursor-pointer"
          >
            <Sparkles className={`h-4 w-4 ${isAutoProcessing ? 'animate-spin' : ''}`} />
            <span>{isAutoProcessing ? t('interactive.cutting', 'Recortando...') : t('interactive.autoCut', 'Auto Recorte')}</span>
          </button>
        </div>

        {/* History Undo / Redo / Reset */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-2 rounded-xl bg-[#181C2B] border border-[#262C3E] text-stone-300 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-colors"
            title={t('workspace.undo', 'Deshacer (Ctrl+Z)')}
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 rounded-xl bg-[#181C2B] border border-[#262C3E] text-stone-300 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-colors"
            title={t('workspace.redo', 'Rehacer (Ctrl+Y)')}
          >
            <Redo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="p-2 rounded-xl bg-[#181C2B] border border-[#262C3E] text-stone-300 hover:text-white transition-colors"
            title={t('workspace.reset', 'Restablecer original')}
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Interactive Workspace Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* LEFT / CENTER: The Interactive Live Canvas */}
        <div className="lg:col-span-2 space-y-3">
          <div
            ref={containerRef}
            className="relative w-full h-[400px] sm:h-[480px] rounded-3xl border border-[#262C3E] flex items-center justify-center overflow-hidden select-none touch-none shadow-inner"
            style={{
              backgroundColor:
                bgPreviewType === 'white'
                  ? '#FFFFFF'
                  : bgPreviewType === 'black'
                  ? '#000000'
                  : bgPreviewType === 'green'
                  ? '#00FF00'
                  : bgPreviewType === 'custom'
                  ? customBgColor
                  : undefined,
              backgroundImage:
                bgPreviewType === 'checker'
                  ? 'repeating-conic-gradient(#1E2333 0% 25%, #121520 0% 50%)'
                  : undefined,
              backgroundSize: bgPreviewType === 'checker' ? '16px 16px' : undefined
            }}
          >
            {/* Tap effect animation for magic wand */}
            {tapEffect.active && (
              <div
                className="absolute pointer-events-none rounded-full border-2 border-[#10B981] bg-[#34D399]/30 animate-ping z-20"
                style={{
                  left: tapEffect.x - 20,
                  top: tapEffect.y - 20,
                  width: 40,
                  height: 40
                }}
              />
            )}

            {/* Original Overlay when holding Eye */}
            {showOriginal && (
              <img
                src={previewUrl}
                alt="Original"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10 transition-opacity"
                referrerPolicy="no-referrer"
              />
            )}

            {/* The Live Interactive Canvas */}
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className="max-h-full max-w-full object-contain cursor-crosshair transition-transform duration-100 ease-out"
              style={{
                transform: `scale(${zoom})`,
                imageRendering: 'auto'
              }}
            />

            {/* Bottom floating Viewport / Zoom Controls */}
            <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-[#141722]/90 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-[#2B3248] shadow-lg z-20">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                className="p-1 text-stone-300 hover:text-white"
                title={t('interactive.zoomOut', 'Reducir zoom')}
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="text-[11px] font-mono text-[#34D399] font-bold px-1 min-w-[45px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
                className="p-1 text-stone-300 hover:text-white"
                title={t('interactive.zoomIn', 'Aumentar zoom')}
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="p-1 text-stone-300 hover:text-white ml-1 border-l border-[#2B3248] pl-1.5"
                title={t('interactive.fit', 'Ajustar tamaño (100%)')}
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Bottom-Right "Ver Original" Toggle Button */}
            <div className="absolute bottom-3 right-3 z-20">
              <button
                type="button"
                onMouseDown={() => setShowOriginal(true)}
                onMouseUp={() => setShowOriginal(false)}
                onTouchStart={() => setShowOriginal(true)}
                onTouchEnd={() => setShowOriginal(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#141722]/90 backdrop-blur-md text-xs font-bold text-stone-200 border border-[#2B3248] shadow-lg hover:text-white active:bg-[#10B981] active:text-black transition-colors"
                title={t('interactive.holdOriginal', 'Mantén presionado para ver la imagen original')}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>{t('interactive.viewOriginal', 'Ver Original')}</span>
              </button>
            </div>

            {/* Top helper notification */}
            <div className="absolute top-3 inset-x-3 pointer-events-none flex justify-center z-10">
              <div className="bg-black/75 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[11px] text-[#A7F3D0] font-medium shadow-md">
                {activeTool === 'magic' && t('interactive.magicTip', '🪄 Toca o haz clic sobre el fondo para eliminarlo automáticamente')}
                {activeTool === 'brush' && t('interactive.brushTip', '👆 Pasa el dedo o ratón sobre las zonas que desees borrar')}
                {activeTool === 'restore' && t('interactive.restoreTip', '🖌️ Pasa el dedo para restaurar y recuperar partes borradas')}
              </div>
            </div>
          </div>

          {/* Background Display Mode Bar (Ajedrez, Blanco, Negro, Chroma) */}
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#141722] border border-[#222736] text-xs">
            <span className="text-stone-300 font-semibold flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-[#10B981]" />
              {t('interactive.previewBg', 'Fondo de visualización:')}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setBgPreviewType('checker')}
                className={`px-2 py-1 rounded-lg border text-[11px] font-bold ${
                  bgPreviewType === 'checker' ? 'bg-[#14261C] border-[#10B981] text-[#34D399]' : 'border-[#2B3248] text-stone-400'
                }`}
              >
                {t('interactive.checker', 'Ajedrez (Alfa)')}
              </button>
              <button
                type="button"
                onClick={() => setBgPreviewType('white')}
                className={`px-2 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 ${
                  bgPreviewType === 'white' ? 'bg-[#14261C] border-[#10B981] text-[#34D399]' : 'border-[#2B3248] text-stone-400'
                }`}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-white border border-stone-600" />
                {t('interactive.white', 'Blanco')}
              </button>
              <button
                type="button"
                onClick={() => setBgPreviewType('black')}
                className={`px-2 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 ${
                  bgPreviewType === 'black' ? 'bg-[#14261C] border-[#10B981] text-[#34D399]' : 'border-[#2B3248] text-stone-400'
                }`}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-black border border-stone-600" />
                {t('interactive.black', 'Negro')}
              </button>
              <button
                type="button"
                onClick={() => setBgPreviewType('green')}
                className={`px-2 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 ${
                  bgPreviewType === 'green' ? 'bg-[#14261C] border-[#10B981] text-[#34D399]' : 'border-[#2B3248] text-stone-400'
                }`}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-[#00FF00]" />
                {t('interactive.chroma', 'Chroma')}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Tool Adjustment Controls & Export */}
        <div className="space-y-4 p-4 sm:p-5 rounded-3xl bg-[#141722] border border-[#222736] shadow-md text-left">
          <div className="flex items-center justify-between pb-2 border-b border-[#222736]">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Sliders className="h-4 w-4 text-[#10B981]" />
              <span>{t('interactive.toolSettings', 'Ajustes de Herramienta')}</span>
            </h3>
            <span className="text-[10px] font-bold text-[#34D399] bg-[#14261C] px-2 py-0.5 rounded-full border border-[#10B981]/40">
              {activeTool === 'magic' ? t('interactive.magicWand', 'VARITA MÁGICA').toUpperCase() : activeTool === 'brush' ? t('interactive.fingerBrush', 'BORRADOR DEDO').toUpperCase() : t('interactive.restore', 'RESTAURADOR').toUpperCase()}
            </span>
          </div>

          {/* Magic Wand Controls */}
          {activeTool === 'magic' && (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-stone-300 mb-1 font-medium">
                  <span>{t('interactive.tolerance', 'Tolerancia de Selección Mágica')} ({magicTolerance}%)</span>
                  <span className="text-[#34D399] font-mono font-bold">
                    {magicTolerance < 20 ? t('interactive.strict', 'Estricto') : magicTolerance < 50 ? t('interactive.balanced', 'Equilibrado') : t('interactive.broad', 'Amplio')}
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="90"
                  value={magicTolerance}
                  onChange={(e) => setMagicTolerance(Number(e.target.value))}
                  className="w-full accent-[#10B981]"
                />
                <p className="text-[10px] text-stone-400 mt-1">
                  {t('interactive.toleranceDesc', 'Controla qué tan sensible es la varita a variaciones de sombra y textura del color tocado.')}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                  {t('interactive.selectionMode', 'Modo de Selección')}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMagicMode('flood')}
                    className={`p-2 rounded-xl text-left border text-xs transition-all ${
                      magicMode === 'flood'
                        ? 'bg-[#14261C] border-[#10B981] text-[#34D399] font-bold shadow-xs'
                        : 'bg-[#181C2B] border-[#262C3E] text-stone-300'
                    }`}
                  >
                    <p className="font-bold">{t('interactive.contiguous', 'Continuo')}</p>
                    <p className="text-[9px] text-stone-400">{t('interactive.contiguousDesc', 'Solo la zona tocada')}</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMagicMode('global')}
                    className={`p-2 rounded-xl text-left border text-xs transition-all ${
                      magicMode === 'global'
                        ? 'bg-[#14261C] border-[#10B981] text-[#34D399] font-bold shadow-xs'
                        : 'bg-[#181C2B] border-[#262C3E] text-stone-300'
                    }`}
                  >
                    <p className="font-bold">{t('interactive.global', 'Global')}</p>
                    <p className="text-[9px] text-stone-400">{t('interactive.globalDesc', 'Todo el color igual')}</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Brush / Restore Eraser Controls */}
          {(activeTool === 'brush' || activeTool === 'restore') && (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-stone-300 mb-1 font-medium">
                  <span>{t('interactive.brushThickness', 'Grosor del Pincel / Dedo')} ({brushSize}px)</span>
                  <div
                    className="rounded-full bg-[#10B981]"
                    style={{ width: Math.min(20, brushSize / 2), height: Math.min(20, brushSize / 2) }}
                  />
                </div>
                <input
                  type="range"
                  min="5"
                  max="120"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-full accent-[#10B981]"
                />
              </div>

              {/* Quick Brush Size Presets */}
              <div className="flex items-center gap-1.5">
                {[10, 25, 45, 80].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setBrushSize(s)}
                    className={`flex-1 py-1 rounded-lg border text-xs font-mono font-bold ${
                      brushSize === s ? 'bg-[#14261C] border-[#10B981] text-[#34D399]' : 'border-[#262C3E] text-stone-400 hover:text-white'
                    }`}
                  >
                    {s}px
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Export Format Selection */}
          <div className="pt-2 border-t border-[#262C3E] space-y-2">
            <label className="block text-xs font-semibold text-stone-300 flex items-center justify-between">
              <span>{t('interactive.downloadFormat', 'Formato de Descarga')}</span>
              <span className="text-[10px] text-[#34D399] font-mono font-bold uppercase">
                {exportFormat} {exportFormat !== 'jpg' ? `(${t('interactive.transparent', 'Transparente')})` : `(${t('interactive.solid', 'Sólido')})`}
              </span>
            </label>
            <div className="grid grid-cols-4 gap-1">
              {[
                { id: 'png', label: 'PNG' },
                { id: 'webp', label: 'WEBP' },
                { id: 'avif', label: 'AVIF' },
                { id: 'ico', label: 'ICO' },
                { id: 'jpg', label: 'JPG' },
                { id: 'bmp', label: 'BMP' },
                { id: 'pdf', label: 'PDF' }
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setExportFormat(fmt.id as any)}
                  className={`py-1.5 px-2 rounded-xl text-center border text-xs font-black transition-all ${
                    exportFormat === fmt.id
                      ? 'bg-gradient-to-r from-[#10B981] to-[#059669] text-white border-[#34D399] shadow-xs'
                      : 'bg-[#181C2B] border-[#262C3E] text-stone-300 hover:text-white'
                  }`}
                >
                  {fmt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Download & Share Actions */}
          <div className="pt-2 space-y-2">
            <button
              type="button"
              id="btn-download-interactive-result"
              onClick={handleDownload}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#10B981] via-[#059669] to-[#047857] hover:from-[#059669] hover:to-[#047857] text-white font-black text-xs sm:text-sm border border-[#34D399]/60 shadow-xl transition-all min-h-[48px] animate-blink-glow-green cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>{t('interactive.downloadEdited', 'Descargar Imagen Editada')}</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#181C2B] hover:bg-[#202638] text-xs font-semibold text-stone-300 hover:text-white border border-[#262C3E] transition-all"
            >
              <Share2 className="h-3.5 w-3.5 text-[#10B981]" />
              <span>{t('interactive.shareFile', 'Compartir archivo')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
