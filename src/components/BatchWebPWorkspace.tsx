import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Layers,
  Upload,
  Play,
  Pause,
  Download,
  Trash2,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Sparkles,
  FileArchive,
  Film,
  Sliders,
  CheckCircle2,
  Zap,
  Info,
  Clock,
  Maximize2,
  Minimize2,
  Plus,
  ArrowRight,
  ShieldCheck,
  Flame,
  FileImage,
  FolderDown,
  X
} from 'lucide-react';
import {
  BatchImageItem,
  createAnimatedWebPFromImages,
  batchConvertToWebpZip,
  MuxResult,
  loadImageElement
} from '../utils/animatedWebpMuxer';
import { formatFileSize } from '../utils/mediaEngine';
import { saveToHistory } from '../utils/historyStorage';
import { notifyUser } from '../utils/notifications';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { generateSampleBatchImages } from '../utils/sampleMedia';

interface BatchWebPWorkspaceProps {
  initialFiles?: File[];
  onClear: () => void;
  onChainResult?: (file: File, toolId: string) => void;
}

export const BatchWebPWorkspace: React.FC<BatchWebPWorkspaceProps> = ({
  initialFiles = [],
  onClear,
  onChainResult
}) => {
  const { t } = useLanguage();
  const { theme } = useTheme();

  // Mode: 'animated' = 1 single .webp file, 'zip' = batch .zip of individual .webp files
  const [activeMode, setActiveMode] = useState<'animated' | 'zip'>('animated');

  // Images list
  const [items, setItems] = useState<BatchImageItem[]>([]);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState<number>(0);

  // Settings for Animated WebP
  const [fps, setFps] = useState<number>(10);
  const [delayMs, setDelayMs] = useState<number>(100);
  const [quality, setQuality] = useState<number>(85);
  const [loopCount, setLoopCount] = useState<number>(0); // 0 = infinite
  const [dimensionPreset, setDimensionPreset] = useState<'original' | 'sticker' | 'square' | 'vyzer' | '75%' | '50%'>('original');
  const [fit, setFit] = useState<'contain' | 'cover' | 'fill'>('contain');

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');

  // Results
  const [animatedResult, setAnimatedResult] = useState<MuxResult | null>(null);
  const [zipResult, setZipResult] = useState<{
    zipBlob: Blob;
    zipUrl: string;
    totalOriginalSize: number;
    totalWebpSize: number;
    convertedFiles: { name: string; blob: Blob; url: string; originalSize: number; newSize: number }[];
  } | null>(null);

  // Animated WebP preview state
  const [isPlaying, setIsPlaying] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync delayMs with fps (guarantees safe 34ms for 30 FPS to satisfy Vyzer & Discord strict <=30 FPS limits)
  const handleFpsChange = (newFps: number) => {
    setFps(newFps);
    setDelayMs(newFps === 30 ? 34 : Math.max(10, Math.ceil(1000 / newFps)));
  };

  const handleDelayChange = (newDelay: number) => {
    setDelayMs(newDelay);
    setFps(Math.max(1, Math.min(60, Math.round(1000 / newDelay))));
  };

  // Convert File objects to BatchImageItems with dimensions
  const addFilesToBatch = async (files: File[]) => {
    const validFiles = files.filter((f) => f.type.startsWith('image/') || f.name.match(/\.(png|jpe?g|webp|gif|bmp|svg|avif)$/i));
    if (validFiles.length === 0) return;

    const newItems: BatchImageItem[] = [];
    for (const file of validFiles) {
      const previewUrl = URL.createObjectURL(file);
      try {
        const img = await loadImageElement(file);
        newItems.push({
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          file,
          name: file.name,
          size: file.size,
          previewUrl,
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      } catch {
        newItems.push({
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          file,
          name: file.name,
          size: file.size,
          previewUrl
        });
      }
    }

    setItems((prev) => [...prev, ...newItems]);
  };

  // Load initial files on mount
  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      addFilesToBatch(initialFiles);
    }
  }, [initialFiles]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      items.forEach((it) => URL.revokeObjectURL(it.previewUrl));
      if (animatedResult?.url) URL.revokeObjectURL(animatedResult.url);
      if (zipResult?.zipUrl) URL.revokeObjectURL(zipResult.zipUrl);
    };
  }, []);

  // Total original batch size
  const totalOriginalSize = useMemo(() => {
    return items.reduce((acc, it) => acc + it.size, 0);
  }, [items]);

  // Max natural width and height among items
  const maxNaturalDimensions = useMemo(() => {
    let w = 800;
    let h = 800;
    for (const it of items) {
      if (it.width && it.width > w) w = it.width;
      if (it.height && it.height > h) h = it.height;
    }
    return { width: w, height: h };
  }, [items]);

  // Calculate target output dimensions based on preset
  const targetOutputDimensions = useMemo(() => {
    if (dimensionPreset === 'sticker') {
      return { width: 512, height: 512 };
    }
    if (dimensionPreset === 'vyzer') {
      return { width: 1000, height: 1000 };
    }
    if (dimensionPreset === 'square') {
      return { width: 800, height: 800 };
    }
    if (dimensionPreset === '75%') {
      return {
        width: Math.round(maxNaturalDimensions.width * 0.75),
        height: Math.round(maxNaturalDimensions.height * 0.75)
      };
    }
    if (dimensionPreset === '50%') {
      return {
        width: Math.round(maxNaturalDimensions.width * 0.5),
        height: Math.round(maxNaturalDimensions.height * 0.5)
      };
    }
    return maxNaturalDimensions;
  }, [dimensionPreset, maxNaturalDimensions]);

  // Reorder items
  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === items.length - 1) return;
    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    const it = items[index];
    URL.revokeObjectURL(it.previewUrl);
    setItems(items.filter((_, i) => i !== index));
    if (selectedPreviewIndex >= items.length - 1) {
      setSelectedPreviewIndex(Math.max(0, items.length - 2));
    }
  };

  const sortItemsByName = (ascending = true) => {
    const sorted = [...items].sort((a, b) => {
      return ascending
        ? a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
        : b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: 'base' });
    });
    setItems(sorted);
  };

  const reverseOrder = () => {
    setItems([...items].reverse());
  };

  const handleClearAll = () => {
    items.forEach((it) => URL.revokeObjectURL(it.previewUrl));
    setItems([]);
    setAnimatedResult(null);
    setZipResult(null);
  };

  // Load sample demo frames
  const handleLoadDemo = async (count = 12) => {
    setIsProcessing(true);
    setStatusText(`Generando ${count} fotogramas demo...`);
    try {
      const demoFiles = await generateSampleBatchImages(count);
      await addFilesToBatch(demoFiles);
      notifyUser({
        title: `✨ ${count} imágenes de muestra cargadas`,
        body: 'Listas para convertir en un archivo WebP animado o archivo ZIP.',
        type: 'success'
      });
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsProcessing(false);
      setStatusText('');
    }
  };

  // EXECUTE: Convert all images to a SINGLE animated .webp file
  const handleCreateAnimatedWebP = async () => {
    if (items.length === 0) return;
    setIsProcessing(true);
    setProgress(5);
    setStatusText(`Iniciando conversión de ${items.length} imágenes...`);

    try {
      const files = items.map((it) => it.file);
      const res = await createAnimatedWebPFromImages(files, {
        width: targetOutputDimensions.width,
        height: targetOutputDimensions.height,
        fps,
        delayMs,
        quality: quality / 100,
        loopCount,
        fit,
        onProgress: (p, cur, tot) => {
          setProgress(p);
          setStatusText(`Codificando fotograma ${cur} de ${tot} (${p}%)...`);
        }
      });

      setAnimatedResult(res);
      setIsPlaying(true);

      // Save result to local history
      saveToHistory(
        {
          blob: res.blob,
          url: res.url,
          fileName: `animacion_${items.length}_fotos.webp`,
          originalSize: totalOriginalSize,
          newSize: res.totalSize,
          width: res.width,
          height: res.height,
          format: 'webp',
          timeTakenMs: 120
        },
        'Lote a WebP (Animado)'
      );

      notifyUser({
        title: `✅ Archivo WebP generado (${formatFileSize(res.totalSize)})`,
        body: `${items.length} imágenes unidas en 1 solo archivo .webp a ${fps} FPS.`,
        type: 'success'
      });
    } catch (err: any) {
      console.error('Error al generar WebP animado:', err);
      notifyUser({
        title: 'Error al convertir a WebP',
        body: err?.message || 'Ocurrió un fallo durante la codificación.',
        type: 'warning'
      });
    } finally {
      setIsProcessing(false);
      setStatusText('');
    }
  };

  // EXECUTE: Convert all images to individual .webp files packed in a .zip file
  const handleCreateZipArchive = async () => {
    if (items.length === 0) return;
    setIsProcessing(true);
    setProgress(5);
    setStatusText(`Preparando lote de ${items.length} imágenes a WebP...`);

    try {
      const res = await batchConvertToWebpZip(
        items.map((it) => ({ file: it.file, name: it.name })),
        {
          quality: quality / 100,
          onProgress: (p, cur, tot) => {
            setProgress(p);
            setStatusText(`Convirtiendo imagen ${cur} de ${tot} a WebP (${p}%)...`);
          }
        }
      );

      setZipResult(res);

      saveToHistory(
        {
          blob: res.zipBlob,
          url: res.zipUrl,
          fileName: `lote_webp_${items.length}_imagenes.zip`,
          originalSize: res.totalOriginalSize,
          newSize: res.totalWebpSize,
          format: 'zip',
          timeTakenMs: 150
        },
        'Lote a WebP (.zip)'
      );

      notifyUser({
        title: `✅ Lote completado (${formatFileSize(res.totalWebpSize)})`,
        body: `${items.length} archivos WebP empaquetados en 1 archivo .zip.`,
        type: 'success'
      });
    } catch (err: any) {
      console.error('Error en conversión por lotes ZIP:', err);
      notifyUser({
        title: 'Error en conversión ZIP',
        body: err?.message || 'Fallo durante el empaquetado.',
        type: 'warning'
      });
    } finally {
      setIsProcessing(false);
      setStatusText('');
    }
  };

  // Download animated WebP file
  const downloadAnimatedWebP = () => {
    if (!animatedResult) return;
    const a = document.createElement('a');
    a.href = animatedResult.url;
    a.download = `aiko_animacion_${items.length}_frames.webp`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Download ZIP file
  const downloadZipArchive = () => {
    if (!zipResult) return;
    const a = document.createElement('a');
    a.href = zipResult.zipUrl;
    a.download = `aiko_lote_${items.length}_webp.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="w-full bg-[#11131B] border border-[#222736] rounded-2xl p-4 sm:p-6 space-y-6 shadow-2xl">
      {/* Hidden Multi-file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.webp,.png,.jpg,.jpeg,.gif,.avif,.svg"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            addFilesToBatch(Array.from(e.target.files));
            e.target.value = '';
          }
        }}
      />

      {/* Top Header & Mode Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1F2433]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div
              style={{ backgroundColor: `${theme.primary}20`, borderColor: `${theme.primary}50` }}
              className="p-1.5 rounded-lg border text-white"
            >
              <Layers className="h-5 w-5" style={{ color: theme.primary }} />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white font-['Syne']">
              Lote de Imágenes a <span style={{ color: theme.primary }}>WebP</span>
            </h2>
            <span
              style={{ backgroundColor: `${theme.primary}15`, color: theme.primary, borderColor: `${theme.primary}40` }}
              className="px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold"
            >
              PRO ENGINE
            </span>
          </div>
          <p className="text-xs text-stone-400">
            Convierte 10, 50 o 100+ imágenes en un único archivo WebP animado o expórtalas en un archivo .ZIP optimizado.
          </p>
        </div>

        {/* Mode Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-[#090A0F] border border-[#1E2333] rounded-xl self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveMode('animated')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeMode === 'animated'
                ? 'bg-red-600 text-white shadow-lg'
                : 'text-stone-400 hover:text-white hover:bg-[#151926]'
            }`}
          >
            <Film className="h-3.5 w-3.5" />
            <span>1 Archivo WebP Animado (.webp)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('zip')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeMode === 'zip'
                ? 'bg-red-600 text-white shadow-lg'
                : 'text-stone-400 hover:text-white hover:bg-[#151926]'
            }`}
          >
            <FileArchive className="h-3.5 w-3.5" />
            <span>Paquete de WebP (.zip)</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Upload & Images Tray vs Settings & Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Image Management & List (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Action Bar: Count, Add More, Reorder, Demo, Clear */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#090A0F] border border-[#1E2333] p-3 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white font-mono">
                {items.length} {items.length === 1 ? 'imagen' : 'imágenes'}
              </span>
              {items.length > 0 && (
                <span className="text-[11px] text-stone-400 font-mono">
                  ({formatFileSize(totalOriginalSize)})
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181D2C] hover:bg-[#22293E] border border-[#2B334D] text-xs font-bold text-white transition-all cursor-pointer shadow-xs"
              >
                <Plus className="h-3.5 w-3.5 text-sky-400" />
                <span>Añadir fotos</span>
              </button>

              {items.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => sortItemsByName(true)}
                    title="Ordenar por nombre A-Z"
                    className="p-1.5 rounded-lg bg-[#141722] hover:bg-[#1E2333] border border-[#242A3D] text-stone-300 hover:text-white text-xs transition-colors cursor-pointer"
                  >
                    A-Z
                  </button>
                  <button
                    type="button"
                    onClick={reverseOrder}
                    title="Invertir orden de fotogramas"
                    className="p-1.5 rounded-lg bg-[#141722] hover:bg-[#1E2333] border border-[#242A3D] text-stone-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </>
              )}

              {items.length === 0 && (
                <button
                  type="button"
                  onClick={() => handleLoadDemo(12)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/40 text-xs font-bold text-amber-300 transition-all cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span>Demo 12 fotos</span>
                </button>
              )}

              {items.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="p-1.5 rounded-lg bg-red-950/30 hover:bg-red-900/40 border border-red-500/30 text-red-400 text-xs transition-colors cursor-pointer"
                  title="Eliminar todas las imágenes"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Empty Upload State or Images List */}
          {items.length === 0 ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  addFilesToBatch(Array.from(e.dataTransfer.files));
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#262D42] hover:border-red-500/60 rounded-2xl p-8 sm:p-12 text-center bg-[#0C0E15] hover:bg-[#10131D] transition-all cursor-pointer space-y-4"
            >
              <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-tr from-sky-950 to-[#141A29] border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-xl">
                <Upload className="h-8 w-8 animate-bounce" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Arrastra y suelta tus imágenes aquí (hasta 50 o más)
                </h3>
                <p className="text-xs text-stone-400 max-w-md mx-auto">
                  Selecciona múltiples fotos, fotogramas de video, secuencias de animación o capturas. Soporta JPG, PNG, WebP, AVIF, GIF y SVG.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg transition-all"
                >
                  Seleccionar archivos en lote
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLoadDemo(12);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#181D2C] hover:bg-[#232B40] text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Probar con 12 imágenes demo</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Scrollable Grid of Uploaded Images */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[440px] overflow-y-auto pr-1">
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedPreviewIndex(idx)}
                    className={`relative group rounded-xl p-2 bg-[#090A0F] border transition-all cursor-pointer flex flex-col justify-between ${
                      selectedPreviewIndex === idx
                        ? 'border-red-500 ring-1 ring-red-500 shadow-lg'
                        : 'border-[#1E2333] hover:border-[#2D354D]'
                    }`}
                  >
                    {/* Index Badge */}
                    <div className="absolute top-3 left-3 z-10 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md text-[10px] font-mono font-bold text-white border border-white/10">
                      #{idx + 1}
                    </div>

                    {/* Quick remove button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeItem(idx);
                      }}
                      className="absolute top-3 right-3 z-10 p-1 rounded-md bg-black/70 hover:bg-red-600 text-stone-300 hover:text-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Quitar imagen"
                    >
                      <X className="h-3 w-3" />
                    </button>

                    {/* Image Thumbnail Container */}
                    <div className="w-full aspect-square rounded-lg bg-[#141722] overflow-hidden flex items-center justify-center border border-white/5">
                      <img
                        src={item.previewUrl}
                        alt={item.name}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    </div>

                    {/* File info footer */}
                    <div className="mt-2 space-y-0.5">
                      <p className="text-[11px] font-bold text-stone-200 truncate" title={item.name}>
                        {item.name}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono">
                        <span>{formatFileSize(item.size)}</span>
                        {item.width && item.height && (
                          <span>
                            {item.width}x{item.height}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Reorder arrows on hover */}
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/5 text-[11px] text-stone-400">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveItem(idx, 'up');
                        }}
                        className="p-1 rounded hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                        title="Mover antes"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <span className="text-[9px] uppercase tracking-wider text-stone-400">Posición</span>
                      <button
                        type="button"
                        disabled={idx === items.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveItem(idx, 'down');
                        }}
                        className="p-1 rounded hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                        title="Mover después"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add more button footer */}
              <div className="flex items-center justify-between text-xs text-stone-400 px-1">
                <span>
                  Tip: Arrastra más archivos en cualquier momento para agregarlos a la secuencia.
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Añadir más fotos</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Settings & Processing / Output (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Mode 1: Animated WebP Settings */}
          {activeMode === 'animated' && (
            <div className="bg-[#090A0F] border border-[#1E2333] rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-[#1A1F2C] pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-sky-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Ajustes de Animación WebP
                  </span>
                </div>
                <span className="text-[11px] text-sky-400 font-mono font-bold">
                  {items.length} fotogramas
                </span>
              </div>

              {/* FPS & Duration */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-300 font-semibold flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-stone-400" />
                    Velocidad (FPS / Fotogramas por segundo):
                  </span>
                  <span className="font-mono font-bold text-white px-2 py-0.5 rounded bg-[#181D2C] border border-[#2B334D]">
                    {fps} FPS ({delayMs} ms/cuadro)
                  </span>
                </div>

                <input
                  type="range"
                  min="1"
                  max="30"
                  step="1"
                  value={fps}
                  onChange={(e) => handleFpsChange(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-[#1F2537] rounded-lg appearance-none cursor-pointer accent-red-500"
                />

                {/* Quick Speed Presets */}
                <div className="grid grid-cols-5 gap-1 pt-1 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => handleFpsChange(2)}
                    className={`py-1 rounded border transition-colors cursor-pointer ${
                      fps === 2 ? 'bg-red-600 text-white border-red-500' : 'bg-[#121622] text-stone-400 border-[#20273A]'
                    }`}
                  >
                    2 FPS
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFpsChange(5)}
                    className={`py-1 rounded border transition-colors cursor-pointer ${
                      fps === 5 ? 'bg-red-600 text-white border-red-500' : 'bg-[#121622] text-stone-400 border-[#20273A]'
                    }`}
                  >
                    5 FPS
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFpsChange(10)}
                    className={`py-1 rounded border transition-colors cursor-pointer ${
                      fps === 10 ? 'bg-red-600 text-white border-red-500' : 'bg-[#121622] text-stone-400 border-[#20273A]'
                    }`}
                  >
                    10 FPS
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFpsChange(20)}
                    className={`py-1 rounded border transition-colors cursor-pointer ${
                      fps === 20 ? 'bg-red-600 text-white border-red-500' : 'bg-[#121622] text-stone-400 border-[#20273A]'
                    }`}
                  >
                    20 FPS
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFpsChange(30)}
                    className={`py-1 rounded border transition-colors cursor-pointer ${
                      fps === 30 ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-[#121622] text-emerald-400 border-emerald-900/40 hover:border-emerald-700'
                    }`}
                    title="30 FPS exacto calibrado a 34ms para Vyzer / Discord"
                  >
                    30 FPS (Vyzer)
                  </button>
                </div>
              </div>

              {/* WebP Quality Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-300 font-semibold">Calidad de Compresión WebP:</span>
                  <span className="font-mono font-bold text-white px-2 py-0.5 rounded bg-[#181D2C] border border-[#2B334D]">
                    {quality}%
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="5"
                  value={quality}
                  onChange={(e) => setQuality(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-[#1F2537] rounded-lg appearance-none cursor-pointer accent-red-500"
                />
              </div>

              {/* Dimensions Presets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-300 font-semibold">Resolución de Salida:</span>
                  <span className="text-[11px] font-mono text-sky-400">
                    {targetOutputDimensions.width} x {targetOutputDimensions.height} px
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setDimensionPreset('original')}
                    className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer truncate ${
                      dimensionPreset === 'original'
                        ? 'bg-red-600 text-white border-red-500 font-bold'
                        : 'bg-[#121622] text-stone-300 border-[#20273A] hover:border-stone-600'
                    }`}
                  >
                    Original
                  </button>
                  <button
                    type="button"
                    onClick={() => setDimensionPreset('vyzer')}
                    className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer truncate ${
                      dimensionPreset === 'vyzer'
                        ? 'bg-emerald-600 text-white border-emerald-500 font-bold'
                        : 'bg-[#121622] text-emerald-400 border-emerald-900/40 hover:border-emerald-700'
                    }`}
                    title="1000 x 1000 px para molduras de avatar de Vyzer / Discord"
                  >
                    Vyzer 1000px
                  </button>
                  <button
                    type="button"
                    onClick={() => setDimensionPreset('sticker')}
                    className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer truncate ${
                      dimensionPreset === 'sticker'
                        ? 'bg-red-600 text-white border-red-500 font-bold'
                        : 'bg-[#121622] text-stone-300 border-[#20273A] hover:border-stone-600'
                    }`}
                  >
                    Sticker 512px
                  </button>
                  <button
                    type="button"
                    onClick={() => setDimensionPreset('50%')}
                    className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer truncate ${
                      dimensionPreset === '50%'
                        ? 'bg-red-600 text-white border-red-500 font-bold'
                        : 'bg-[#121622] text-stone-300 border-[#20273A] hover:border-stone-600'
                    }`}
                  >
                    Escala 50%
                  </button>
                </div>
              </div>

              {/* Loop Count */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-stone-300 font-semibold">Bucle de Reproducción:</span>
                <select
                  value={loopCount}
                  onChange={(e) => setLoopCount(parseInt(e.target.value))}
                  className="bg-[#141722] border border-[#242A3D] text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-red-500 cursor-pointer"
                >
                  <option value={0}>Infinito (Bucle continuo)</option>
                  <option value={1}>1 sola vez (Sin bucle)</option>
                  <option value={3}>3 repeticiones</option>
                  <option value={5}>5 repeticiones</option>
                </select>
              </div>

              {/* Main Action Button */}
              <button
                type="button"
                disabled={items.length === 0 || isProcessing}
                onClick={handleCreateAnimatedWebP}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-sm font-bold shadow-lg shadow-red-950/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>{statusText || 'Procesando imágenes...'}</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 fill-white" />
                    <span>
                      Convertir {items.length} imágenes a 1 archivo WebP
                    </span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Mode 2: Batch ZIP Settings */}
          {activeMode === 'zip' && (
            <div className="bg-[#090A0F] border border-[#1E2333] rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-[#1A1F2C] pb-3">
                <div className="flex items-center gap-2">
                  <FileArchive className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Ajustes de Lote WebP ZIP
                  </span>
                </div>
                <span className="text-[11px] text-emerald-400 font-mono font-bold">
                  {items.length} archivos
                </span>
              </div>

              <p className="text-xs text-stone-400">
                Convierte cada una de tus {items.length} fotos a formato WebP moderno con máxima compresión y las empaqueta en un único archivo descargable .ZIP.
              </p>

              {/* Quality Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-300 font-semibold">Calidad WebP por imagen:</span>
                  <span className="font-mono font-bold text-white px-2 py-0.5 rounded bg-[#181D2C] border border-[#2B334D]">
                    {quality}%
                  </span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="100"
                  step="5"
                  value={quality}
                  onChange={(e) => setQuality(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-[#1F2537] rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* Main Action Button */}
              <button
                type="button"
                disabled={items.length === 0 || isProcessing}
                onClick={handleCreateZipArchive}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>{statusText || 'Convirtiendo a WebP...'}</span>
                  </>
                ) : (
                  <>
                    <FolderDown className="h-4 w-4" />
                    <span>
                      Convertir {items.length} fotos y descargar .ZIP
                    </span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Progress bar when converting */}
          {isProcessing && (
            <div className="p-4 rounded-xl bg-[#0C0E17] border border-[#232B40] space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-stone-300 font-bold">{statusText}</span>
                <span className="text-red-400 font-black">{progress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#181E30] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* RESULT 1: Animated WebP Preview & Download */}
          {animatedResult && (
            <div className="p-4 rounded-2xl bg-[#090A0F] border-2 border-red-500/60 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    ¡Archivo WebP Animado Listo!
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-red-950/60 text-red-400 border border-red-500/40 text-[10px] font-mono font-bold">
                  {animatedResult.frameCount} FOTOGRAMAS
                </span>
              </div>

              {/* Animated WebP Output Screen */}
              <div className="relative w-full aspect-square max-h-[300px] rounded-xl bg-[#05060A] border border-[#222736] overflow-hidden flex items-center justify-center p-2">
                <img
                  src={animatedResult.url}
                  alt="WebP Animado Resultante"
                  className="max-w-full max-h-full object-contain"
                />

                <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/80 backdrop-blur-sm text-[10px] font-mono text-stone-300 border border-white/10">
                  {animatedResult.width} x {animatedResult.height} px • {fps} FPS
                </div>
              </div>

              {/* Stats: Original vs Output */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-[#141722] border border-[#23293D] space-y-0.5">
                  <span className="text-[10px] text-stone-400 block">Total {items.length} fotos originales:</span>
                  <span className="font-bold text-stone-300">{formatFileSize(totalOriginalSize)}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#141722] border border-[#23293D] space-y-0.5">
                  <span className="text-[10px] text-stone-400 block">Peso archivo WebP final:</span>
                  <span className="font-bold text-emerald-400">
                    {formatFileSize(animatedResult.totalSize)}
                    {totalOriginalSize > animatedResult.totalSize && (
                      <span className="text-[10px] text-emerald-500 ml-1">
                        (-{Math.round((1 - animatedResult.totalSize / totalOriginalSize) * 100)}%)
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Download & Actions */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={downloadAnimatedWebP}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>Descargar animacion.webp ({formatFileSize(animatedResult.totalSize)})</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => window.open(animatedResult.url, '_blank')}
                    className="flex-1 py-2 rounded-lg bg-[#151926] hover:bg-[#1E2436] text-stone-300 hover:text-white border border-[#262E44] text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Abrir en pestaña nueva
                  </button>
                  {onChainResult && (
                    <button
                      type="button"
                      onClick={() => {
                        const file = new File([animatedResult.blob], 'animacion.webp', { type: 'image/webp' });
                        onChainResult(file, 'optimize-tools');
                      }}
                      className="flex-1 py-2 rounded-lg bg-[#151926] hover:bg-[#1E2436] text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Optimizar peso
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* RESULT 2: ZIP Archive Preview & Download */}
          {zipResult && (
            <div className="p-4 rounded-2xl bg-[#090A0F] border-2 border-emerald-500/60 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    ¡Lote ZIP Empaquetado!
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono font-bold">
                  {zipResult.convertedFiles.length} ARCHIVOS WEBP
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-[#141722] border border-[#23293D] space-y-0.5">
                  <span className="text-[10px] text-stone-400 block">Tamaño original:</span>
                  <span className="font-bold text-stone-300">{formatFileSize(zipResult.totalOriginalSize)}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#141722] border border-[#23293D] space-y-0.5">
                  <span className="text-[10px] text-stone-400 block">Tamaño archivo .ZIP:</span>
                  <span className="font-bold text-emerald-400">
                    {formatFileSize(zipResult.zipBlob.size)}
                    <span className="text-[10px] text-emerald-500 ml-1">
                      (-{Math.round((1 - zipResult.zipBlob.size / zipResult.totalOriginalSize) * 100)}%)
                    </span>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={downloadZipArchive}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Descargar archivo .ZIP ({formatFileSize(zipResult.zipBlob.size)})</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
