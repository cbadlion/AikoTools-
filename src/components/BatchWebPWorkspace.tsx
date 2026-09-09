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
  FolderOpen,
  FolderArchive,
  Image as ImageIcon,
  X,
  CheckSquare,
  Square,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Check
} from 'lucide-react';
import {
  BatchImageItem,
  createAnimatedWebPFromImages,
  batchConvertToWebpZip,
  MuxResult,
  loadImageElement
} from '../utils/animatedWebpMuxer';
import { formatFileSize, extractMediaFrames } from '../utils/mediaEngine';
import { saveToHistory } from '../utils/historyStorage';
import { notifyUser } from '../utils/notifications';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { generateSampleBatchImages } from '../utils/sampleMedia';

const MAX_BATCH_ITEMS = 1000;
const DEFAULT_PAGE_SIZE = 48;

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState<number>(0);

  // Pagination for high performance (supporting up to 1000 items smoothly)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

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
  const folderFilesInputRef = useRef<HTMLInputElement>(null);
  const directoryInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const mediaExtractInputRef = useRef<HTMLInputElement>(null);

  // Sync delayMs with fps (guarantees safe 34ms for 30 FPS to satisfy Vyzer & Discord strict <=30 FPS limits)
  const handleFpsChange = (newFps: number) => {
    setFps(newFps);
    setDelayMs(newFps === 30 ? 34 : Math.max(10, Math.ceil(1000 / newFps)));
  };

  const handleDelayChange = (newDelay: number) => {
    setDelayMs(newDelay);
    setFps(Math.max(1, Math.min(60, Math.round(1000 / newDelay))));
  };

  // Modern Directory Picker with native fallback
  const handleOpenDirectoryPicker = async () => {
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker();
        const files: File[] = [];
        for await (const entry of dirHandle.values()) {
          if (entry.kind === 'file') {
            const file = await entry.getFile();
            if (
              file.type.startsWith('image/') ||
              file.name.match(/\.(png|jpe?g|webp|gif|bmp|svg|avif|heic|heif|ico|tiff?)$/i)
            ) {
              files.push(file);
            }
          }
        }
        if (files.length > 0) {
          addFilesToBatch(files);
        } else {
          notifyUser({
            title: t('batch.noImagesInFolder', 'Sin imágenes compatibles'),
            body: t('batch.noImagesInFolderDesc', 'No se encontraron imágenes en la carpeta seleccionada.'),
            type: 'warning'
          });
        }
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.warn('Directory picker fallback:', err);
      }
    }
    directoryInputRef.current?.click();
  };

  // Universal Drop Handler supporting directories and files
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const dtItems = e.dataTransfer.items;
    if (!dtItems || dtItems.length === 0) {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        addFilesToBatch(Array.from(e.dataTransfer.files));
      }
      return;
    }

    const files: File[] = [];
    const traverseEntry = async (entry: any) => {
      if (entry.isFile) {
        const file: File = await new Promise((resolve) => entry.file(resolve));
        files.push(file);
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        const readAllEntries = async (): Promise<any[]> => {
          let all: any[] = [];
          let batch: any[] = await new Promise((res) => dirReader.readEntries(res));
          while (batch.length > 0) {
            all = all.concat(batch);
            batch = await new Promise((res) => dirReader.readEntries(res));
          }
          return all;
        };
        const subEntries = await readAllEntries();
        for (const sub of subEntries) {
          await traverseEntry(sub);
        }
      }
    };

    const promises: Promise<void>[] = [];
    for (let i = 0; i < dtItems.length; i++) {
      const item = dtItems[i];
      const entry = (item as any).webkitGetAsEntry ? (item as any).webkitGetAsEntry() : null;
      if (entry) {
        promises.push(traverseEntry(entry));
      } else {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }

    if (promises.length > 0) {
      await Promise.all(promises);
      if (files.length > 0) {
        addFilesToBatch(files);
        return;
      }
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToBatch(Array.from(e.dataTransfer.files));
    }
  };

  // Convert File objects to BatchImageItems with dimensions
  const addFilesToBatch = async (files: File[]) => {
    const validFiles = files.filter(
      (f) =>
        f.type.startsWith('image/') ||
        f.name.match(/\.(png|jpe?g|webp|gif|bmp|svg|avif|heic|heif|ico|tiff?)$/i)
    );
    if (validFiles.length === 0) {
      if (files.length > 0) {
        notifyUser({
          title: t('batch.noValidImagesTitle', 'Archivos no compatibles'),
          body: t(
            'batch.noValidImagesDesc',
            'Por favor selecciona imágenes (JPG, PNG, WebP, GIF, AVIF, SVG).'
          ),
          type: 'warning'
        });
      }
      return;
    }

    const currentCount = items.length;
    const remainingSlots = MAX_BATCH_ITEMS - currentCount;

    if (remainingSlots <= 0) {
      notifyUser({
        title: t('batch.maxLimitReached', 'Límite máximo de 1000 fotogramas alcanzado'),
        body: t('batch.limitNoticeDesc', 'No se pueden añadir más de 1000 imágenes a la vez.'),
        type: 'warning'
      });
      return;
    }

    const filesToAdd = validFiles.slice(0, remainingSlots);
    if (validFiles.length > remainingSlots) {
      notifyUser({
        title: t('batch.limitReachedNotice', `Se añadieron ${remainingSlots} archivos`),
        body: t('batch.limitReachedBody', `Se alcanzó el límite máximo de 1000 fotogramas por lote.`),
        type: 'warning'
      });
    }

    const newItems: BatchImageItem[] = [];
    const newSelectedIds = new Set(selectedIds);

    for (const file of filesToAdd) {
      const previewUrl = URL.createObjectURL(file);
      const itemId = `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      newSelectedIds.add(itemId);

      try {
        const img = await loadImageElement(file);
        newItems.push({
          id: itemId,
          file,
          name: file.name,
          size: file.size,
          previewUrl,
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      } catch {
        newItems.push({
          id: itemId,
          file,
          name: file.name,
          size: file.size,
          previewUrl
        });
      }
    }

    setItems((prev) => [...prev, ...newItems]);
    setSelectedIds(newSelectedIds);
  };

  // Extract individual frames from an animated file (GIF, WebP animado, or video)
  const handleExtractFramesFromFile = async (file: File) => {
    setIsProcessing(true);
    setProgress(5);
    setStatusText(t('batch.extractingProgress', 'Extrayendo fotogramas del archivo multimedia...'));

    try {
      const result = await extractMediaFrames(file, (p) => {
        setProgress(p);
        setStatusText(`${t('batch.extractingProgress', 'Extrayendo fotogramas...')} ${p}%`);
      });

      if (!result.frames || result.frames.length === 0) {
        throw new Error(t('batch.extractNoFrames', 'No se pudieron extraer fotogramas de este archivo.'));
      }

      const remainingSlots = MAX_BATCH_ITEMS - items.length;
      if (remainingSlots <= 0) {
        notifyUser({
          title: t('batch.maxLimitReached', 'Límite máximo alcanzado'),
          body: t('batch.limitNoticeDesc', 'Ya tienes 1000 fotogramas en el lote.'),
          type: 'warning'
        });
        return;
      }

      const framesToTake = result.frames.slice(0, remainingSlots);
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const newItems: BatchImageItem[] = [];
      const newSelectedIds = new Set(selectedIds);

      for (let i = 0; i < framesToTake.length; i++) {
        const frame = framesToTake[i];
        const blob = await new Promise<Blob | null>((resolve) => frame.canvas.toBlob(resolve, 'image/png'));
        if (blob) {
          const frameName = `${baseName}_frame_${String(i + 1).padStart(3, '0')}.png`;
          const frameFile = new File([blob], frameName, { type: 'image/png' });
          const previewUrl = URL.createObjectURL(frameFile);
          const itemId = `extracted-${baseName}-${i}-${Date.now()}`;
          newSelectedIds.add(itemId);

          newItems.push({
            id: itemId,
            file: frameFile,
            name: frameName,
            size: blob.size,
            previewUrl,
            width: frame.canvas.width,
            height: frame.canvas.height
          });
        }
      }

      setItems((prev) => [...prev, ...newItems]);
      setSelectedIds(newSelectedIds);

      notifyUser({
        title: `✨ ${newItems.length} ${t('batch.framesExtractedTitle', 'fotogramas extraídos')}`,
        body: t('batch.framesExtractedBody', 'Fotogramas listos para ordenar, filtrar y compilar.'),
        type: 'success'
      });
    } catch (err: any) {
      console.error('Error al extraer fotogramas:', err);
      notifyUser({
        title: t('batch.extractError', 'Error al extraer fotogramas'),
        body: err?.message || t('batch.extractErrorDesc', 'El archivo no contiene fotogramas válidos.'),
        type: 'warning'
      });
    } finally {
      setIsProcessing(false);
      setStatusText('');
    }
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

  // Selected items helper
  const selectedItems = useMemo(() => {
    return items.filter((it) => selectedIds.has(it.id));
  }, [items, selectedIds]);

  const itemsToProcess = useMemo(() => {
    return selectedItems.length > 0 ? selectedItems : items;
  }, [selectedItems, items]);

  // Total original batch size of selected items
  const totalOriginalSize = useMemo(() => {
    return itemsToProcess.reduce((acc, it) => acc + it.size, 0);
  }, [itemsToProcess]);

  // Max natural width and height among selected items
  const maxNaturalDimensions = useMemo(() => {
    let w = 800;
    let h = 800;
    for (const it of itemsToProcess) {
      if (it.width && it.width > w) w = it.width;
      if (it.height && it.height > h) h = it.height;
    }
    return { width: w, height: h };
  }, [itemsToProcess]);

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

  // Frame selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(items.map((it) => it.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const invertSelection = () => {
    setSelectedIds((prev) => {
      const next = new Set<string>();
      for (const it of items) {
        if (!prev.has(it.id)) next.add(it.id);
      }
      return next;
    });
  };

  const selectEven = () => {
    const next = new Set<string>();
    items.forEach((it, idx) => {
      if ((idx + 1) % 2 === 0) next.add(it.id);
    });
    setSelectedIds(next);
  };

  const selectOdd = () => {
    const next = new Set<string>();
    items.forEach((it, idx) => {
      if ((idx + 1) % 2 !== 0) next.add(it.id);
    });
    setSelectedIds(next);
  };

  const keepOnlySelected = () => {
    const unselected = items.filter((it) => !selectedIds.has(it.id));
    unselected.forEach((it) => URL.revokeObjectURL(it.previewUrl));
    const kept = items.filter((it) => selectedIds.has(it.id));
    setItems(kept);
    setCurrentPage(1);
    setSelectedPreviewIndex(0);
  };

  const deleteSelected = () => {
    const toDelete = items.filter((it) => selectedIds.has(it.id));
    toDelete.forEach((it) => URL.revokeObjectURL(it.previewUrl));
    const remaining = items.filter((it) => !selectedIds.has(it.id));
    setItems(remaining);
    setSelectedIds(new Set(remaining.map((it) => it.id)));
    setCurrentPage(1);
    setSelectedPreviewIndex(0);
  };

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
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(it.id);
      return next;
    });
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
    setSelectedIds(new Set());
    setAnimatedResult(null);
    setZipResult(null);
    setCurrentPage(1);
  };

  // Load sample demo frames
  const handleLoadDemo = async (count = 12) => {
    setIsProcessing(true);
    setStatusText(`${t('batch.generatingDemo', 'Generando')} ${count} ${t('batch.demoFrames', 'fotogramas demo...')}`);
    try {
      const demoFiles = await generateSampleBatchImages(count);
      await addFilesToBatch(demoFiles);
      notifyUser({
        title: `✨ ${count} ${t('batch.demoLoadedTitle', 'imágenes de muestra cargadas')}`,
        body: t('batch.demoLoadedBody', 'Listas para convertir en un archivo WebP animado o archivo ZIP.'),
        type: 'success'
      });
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsProcessing(false);
      setStatusText('');
    }
  };

  // EXECUTE: Convert all chosen images to a SINGLE animated .webp file
  const handleCreateAnimatedWebP = async () => {
    const framesToEncode = selectedItems.length > 0 ? selectedItems : items;
    if (framesToEncode.length === 0) return;

    setIsProcessing(true);
    setProgress(5);
    setStatusText(`${t('batch.startingConversion', 'Iniciando conversión de')} ${framesToEncode.length} ${t('batch.images', 'fotogramas...')}`);

    try {
      const files = framesToEncode.map((it) => it.file);
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
          setStatusText(`${t('batch.encodingFrame', 'Codificando fotograma')} ${cur} ${t('batch.of', 'de')} ${tot} (${p}%)...`);
        }
      });

      setAnimatedResult(res);
      setIsPlaying(true);

      // Save result to local history
      saveToHistory(
        {
          blob: res.blob,
          url: res.url,
          fileName: `animacion_${framesToEncode.length}_fotos.webp`,
          originalSize: totalOriginalSize,
          newSize: res.totalSize,
          width: res.width,
          height: res.height,
          format: 'webp',
          timeTakenMs: 120
        },
        t('batch.historyTitle', 'Lote a WebP (Animado)')
      );

      notifyUser({
        title: `✅ ${t('batch.successTitle', 'Archivo WebP generado')} (${formatFileSize(res.totalSize)})`,
        body: `${framesToEncode.length} ${t('batch.successBody', 'imágenes unidas en 1 solo archivo .webp a')} ${fps} FPS.`,
        type: 'success'
      });
    } catch (err: any) {
      console.error('Error al generar WebP animado:', err);
      notifyUser({
        title: t('batch.errorTitle', 'Error al convertir a WebP'),
        body: err?.message || t('batch.errorDesc', 'Ocurrió un fallo durante la codificación.'),
        type: 'warning'
      });
    } finally {
      setIsProcessing(false);
      setStatusText('');
    }
  };

  // EXECUTE: Convert chosen images to individual .webp files packed in a .zip file
  const handleCreateZipArchive = async () => {
    const framesToEncode = selectedItems.length > 0 ? selectedItems : items;
    if (framesToEncode.length === 0) return;

    setIsProcessing(true);
    setProgress(5);
    setStatusText(`${t('batch.preparingZip', 'Preparando lote de')} ${framesToEncode.length} ${t('batch.imagesToWebp', 'imágenes a WebP...')}`);

    try {
      const res = await batchConvertToWebpZip(
        framesToEncode.map((it) => ({ file: it.file, name: it.name })),
        {
          quality: quality / 100,
          onProgress: (p, cur, tot) => {
            setProgress(p);
            setStatusText(`${t('batch.convertingImage', 'Convirtiendo imagen')} ${cur} ${t('batch.of', 'de')} ${tot} (${p}%)...`);
          }
        }
      );

      setZipResult(res);

      saveToHistory(
        {
          blob: res.zipBlob,
          url: res.zipUrl,
          fileName: `lote_webp_${framesToEncode.length}_imagenes.zip`,
          originalSize: res.totalOriginalSize,
          newSize: res.totalWebpSize,
          format: 'zip',
          timeTakenMs: 150
        },
        t('batch.historyZipTitle', 'Lote a WebP (.zip)')
      );

      notifyUser({
        title: `✅ ${t('batch.zipCompletedTitle', 'Lote completado')} (${formatFileSize(res.totalWebpSize)})`,
        body: `${framesToEncode.length} ${t('batch.zipCompletedBody', 'archivos WebP empaquetados en 1 archivo .zip.')}`,
        type: 'success'
      });
    } catch (err: any) {
      console.error('Error en conversión por lotes ZIP:', err);
      notifyUser({
        title: t('batch.zipErrorTitle', 'Error en conversión ZIP'),
        body: err?.message || t('batch.zipErrorDesc', 'Fallo durante el empaquetado.'),
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
    a.download = `aiko_animacion_${itemsToProcess.length}_frames.webp`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Download ZIP file
  const downloadZipArchive = () => {
    if (!zipResult) return;
    const a = document.createElement('a');
    a.href = zipResult.zipUrl;
    a.download = `aiko_lote_${itemsToProcess.length}_webp.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  return (
    <div className="w-full bg-[#11131B] border border-[#222736] rounded-2xl p-4 sm:p-6 space-y-6 shadow-2xl font-['Outfit']">
      {/* 1. Device Folders & Files Picker (accept all files to open Android Documents/Files manager) */}
      <input
        ref={folderFilesInputRef}
        type="file"
        multiple
        accept="*/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            addFilesToBatch(Array.from(e.target.files));
            e.target.value = '';
          }
        }}
      />

      {/* 2. Entire Directory / Folder Picker */}
      <input
        ref={directoryInputRef}
        type="file"
        multiple
        // @ts-ignore
        webkitdirectory=""
        directory=""
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            addFilesToBatch(Array.from(e.target.files));
            e.target.value = '';
          }
        }}
      />

      {/* 3. Universal Gallery Photo / Media Picker without 100-item system restriction */}
      <input
        ref={galleryInputRef}
        type="file"
        multiple
        accept="*/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            addFilesToBatch(Array.from(e.target.files));
            e.target.value = '';
          }
        }}
      />

      {/* 4. File input for extracting frames from animated media */}
      <input
        ref={mediaExtractInputRef}
        type="file"
        accept="*/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleExtractFramesFromFile(e.target.files[0]);
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
              {t('tool.batch-webp.name', 'Lote de Imágenes a WebP')}
            </h2>
            <span
              style={{ backgroundColor: `${theme.primary}15`, color: theme.primary, borderColor: `${theme.primary}40` }}
              className="px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold"
            >
              {t('batch.proEngine', 'PRO ENGINE • HASTA 1000 FOTOS')}
            </span>
          </div>
          <p className="text-xs text-stone-400">
            {t(
              'batch.subtitle',
              'Elige o extrae fotogramas desde archivos y une hasta 1000 imágenes en 1 solo archivo WebP animado o en ZIP.'
            )}
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
            <span>{t('batch.animatedMode', '1 Archivo WebP Animado (.webp)')}</span>
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
            <span>{t('batch.zipMode', 'Paquete de WebP (.zip)')}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Upload & Images Tray vs Settings & Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Image Management & List (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Action Bar: Count, Add More, Choose Frames, Extract, Demo, Clear */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#090A0F] border border-[#1E2333] p-3 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white font-mono">
                {items.length} / {MAX_BATCH_ITEMS}{' '}
                {items.length === 1 ? t('batch.imageCountSingle', 'imagen') : t('batch.imagesCount', 'imágenes')}
              </span>
              {items.length > 0 && (
                <span className="text-[11px] text-emerald-400 font-mono font-semibold">
                  ({selectedItems.length} {t('batch.selectedFramesLabel', 'elegidas')})
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {/* Button: Entrar a carpetas del dispositivo (Abre explorador de archivos completo) */}
              <button
                type="button"
                onClick={() => folderFilesInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/40 text-xs font-bold text-amber-300 hover:text-white transition-all cursor-pointer shadow-xs"
                title={t('batch.chooseFoldersTitle', 'Abre el explorador de archivos para entrar a Descargas, almacenamiento interno y carpetas del dispositivo (hasta 1000 fotos)')}
              >
                <FolderOpen className="h-3.5 w-3.5 text-amber-400" />
                <span>{t('batch.chooseFolders', 'Carpetas (hasta 1000)')}</span>
              </button>

              {/* Button: Carpeta completa */}
              <button
                type="button"
                onClick={handleOpenDirectoryPicker}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-950/40 hover:bg-sky-900/50 border border-sky-500/40 text-xs font-bold text-sky-300 hover:text-white transition-all cursor-pointer shadow-xs"
                title={t('batch.chooseDirectoryTitle', 'Carga todos los fotogramas de una carpeta seleccionada')}
              >
                <FolderArchive className="h-3.5 w-3.5 text-sky-400" />
                <span className="hidden sm:inline">{t('batch.chooseDirectory', 'Carpeta')}</span>
              </button>

              {/* Button: Galería de fotos */}
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#181D2C] hover:bg-[#22293E] border border-[#2B334D] text-xs font-bold text-stone-300 hover:text-white transition-all cursor-pointer shadow-xs"
                title={t('batch.chooseGalleryTitle', 'Abrir selector de medios')}
              >
                <ImageIcon className="h-3.5 w-3.5 text-rose-400" />
                <span className="hidden sm:inline">{t('batch.chooseGallery', 'Galería')}</span>
              </button>

              {/* Button: Extraer fotogramas de GIF/WebP */}
              <button
                type="button"
                onClick={() => mediaExtractInputRef.current?.click()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/40 text-xs font-bold text-emerald-300 transition-all cursor-pointer"
                title={t('batch.extractFramesTitle', 'Extrae todos los fotogramas individuales de un GIF, WebP animado o video')}
              >
                <Film className="h-3.5 w-3.5 text-emerald-400" />
                <span className="hidden sm:inline">{t('batch.extractFrames', 'Extraer fotogramas')}</span>
              </button>

              {items.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => sortItemsByName(true)}
                    title={t('batch.sortAZTitle', 'Ordenar por nombre A-Z')}
                    className="p-1.5 rounded-lg bg-[#141722] hover:bg-[#1E2333] border border-[#242A3D] text-stone-300 hover:text-white text-xs transition-colors cursor-pointer"
                  >
                    A-Z
                  </button>
                  <button
                    type="button"
                    onClick={reverseOrder}
                    title={t('batch.reverseOrderTitle', 'Invertir orden de fotogramas')}
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
                  <span>{t('batch.demoBtn', 'Demo 12 fotos')}</span>
                </button>
              )}

              {items.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="p-1.5 rounded-lg bg-red-950/30 hover:bg-red-900/40 border border-red-500/30 text-red-400 text-xs transition-colors cursor-pointer"
                  title={t('batch.clearAllTitle', 'Eliminar todas las imágenes')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Capacity and multi-batch notice */}
          {items.length > 0 && items.length < MAX_BATCH_ITEMS && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-sky-950/25 border border-sky-500/30 text-xs text-sky-200">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-sky-400 shrink-0" />
                <span>
                  {t('batch.capacityProgress', 'Cargadas {count} de 1000 imágenes. Puedes seguir sumando más fotos:').replace('{count}', String(items.length))}
                </span>
              </div>
              <button
                type="button"
                onClick={() => folderFilesInputRef.current?.click()}
                className="px-3 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-white font-bold text-xs transition-all shrink-0 cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t('batch.addMorePhotos', '+ Añadir más (hasta 1000)')}</span>
              </button>
            </div>
          )}

          {/* Selection Filter Bar (Select All / None / Invert / Evens / Odds / Keep Selected) */}
          {items.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[#0C0E16] border border-[#1E2333] text-xs">
              <div className="flex items-center gap-1 text-stone-300 font-semibold">
                <Filter className="h-3.5 w-3.5 text-sky-400" />
                <span>{t('batch.filterFrames', 'Elegir:')}</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={selectAll}
                  className="px-2 py-1 rounded bg-[#161B29] hover:bg-[#20273A] text-stone-300 hover:text-white border border-[#263047] font-mono cursor-pointer"
                >
                  {t('batch.selectAll', 'Todos')} ({items.length})
                </button>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="px-2 py-1 rounded bg-[#161B29] hover:bg-[#20273A] text-stone-300 hover:text-white border border-[#263047] font-mono cursor-pointer"
                >
                  {t('batch.deselectAll', 'Ninguno')}
                </button>
                <button
                  type="button"
                  onClick={invertSelection}
                  className="px-2 py-1 rounded bg-[#161B29] hover:bg-[#20273A] text-stone-300 hover:text-white border border-[#263047] font-mono cursor-pointer"
                >
                  {t('batch.invertSelection', 'Invertir')}
                </button>
                <button
                  type="button"
                  onClick={selectEven}
                  title={t('batch.evenTitle', 'Selecciona fotogramas pares (2, 4, 6...) para reducir velocidad a la mitad')}
                  className="px-2 py-1 rounded bg-[#161B29] hover:bg-[#20273A] text-stone-300 hover:text-white border border-[#263047] font-mono cursor-pointer"
                >
                  {t('batch.evenFrames', 'Pares')}
                </button>
                <button
                  type="button"
                  onClick={selectOdd}
                  title={t('batch.oddTitle', 'Selecciona fotogramas impares (1, 3, 5...)')}
                  className="px-2 py-1 rounded bg-[#161B29] hover:bg-[#20273A] text-stone-300 hover:text-white border border-[#263047] font-mono cursor-pointer"
                >
                  {t('batch.oddFrames', 'Impares')}
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                {selectedItems.length > 0 && selectedItems.length < items.length && (
                  <button
                    type="button"
                    onClick={keepOnlySelected}
                    className="px-2 py-1 rounded bg-sky-950/40 hover:bg-sky-900/50 text-sky-300 border border-sky-500/40 font-semibold cursor-pointer"
                    title={t('batch.keepSelectedTitle', 'Eliminar los no elegidos y conservar únicamente los seleccionados')}
                  >
                    {t('batch.keepSelected', 'Conservar elegidos')}
                  </button>
                )}
                {selectedItems.length > 0 && (
                  <button
                    type="button"
                    onClick={deleteSelected}
                    className="px-2 py-1 rounded bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-500/40 font-semibold cursor-pointer"
                    title={t('batch.deleteSelectedTitle', 'Eliminar del lote los fotogramas seleccionados')}
                  >
                    {t('batch.removeSelected', 'Eliminar')} ({selectedItems.length})
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Empty Upload State: Clear selection methods for folders, directory, gallery, media */}
          {items.length === 0 ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-[#262D42] rounded-2xl p-5 sm:p-8 text-center bg-[#0C0E15] transition-all space-y-6"
            >
              <div className="h-14 w-14 mx-auto rounded-2xl bg-gradient-to-tr from-amber-950/70 to-[#141A29] border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-xl">
                <FolderOpen className="h-7 w-7 animate-pulse" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {t('batch.selectMethodTitle', 'Elige cómo deseas añadir fotogramas (hasta 1000)')}
                </h3>
                <p className="text-xs text-stone-400 max-w-lg mx-auto">
                  {t(
                    'batch.selectMethodSubtitle',
                    'Puedes entrar a las carpetas de tu dispositivo, elegir una carpeta completa, abrir la galería o extraer fotogramas de un archivo existente.'
                  )}
                </p>
              </div>

              {/* Grid of Clear Action Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto text-left">
                {/* Option 1: Carpetas del dispositivo (Explorador) */}
                <button
                  type="button"
                  onClick={() => folderFilesInputRef.current?.click()}
                  className="group p-3.5 rounded-xl bg-[#141824] hover:bg-[#1A2030] border border-amber-500/40 hover:border-amber-400 transition-all cursor-pointer flex items-start gap-3 shadow-md"
                >
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 group-hover:scale-105 transition-transform shrink-0">
                    <FolderOpen className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                      <span>{t('batch.foldersOption', 'Carpetas del dispositivo (Explorador)')}</span>
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">{t('batch.upTo1000Badge', 'HASTA 1000 FOTOS')}</span>
                    </div>
                    <p className="text-[11px] text-stone-400 leading-snug">
                      {t('batch.foldersOptionDesc', 'Navega por Descargas, DCIM o carpetas sin el límite de 100 fotos del selector de Google Fotos.')}
                    </p>
                  </div>
                </button>

                {/* Option 2: Carpeta completa */}
                <button
                  type="button"
                  onClick={handleOpenDirectoryPicker}
                  className="group p-3.5 rounded-xl bg-[#141824] hover:bg-[#1A2030] border border-sky-500/30 hover:border-sky-400 transition-all cursor-pointer flex items-start gap-3 shadow-md"
                >
                  <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 group-hover:scale-105 transition-transform shrink-0">
                    <FolderArchive className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="text-xs font-bold text-white">
                      {t('batch.directoryOption', 'Cargar carpeta completa')}
                    </div>
                    <p className="text-[11px] text-stone-400 leading-snug">
                      {t('batch.directoryOptionDesc', 'Importa todas las imágenes contenidas dentro de una carpeta en un solo paso.')}
                    </p>
                  </div>
                </button>

                {/* Option 3: Galería de fotos */}
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="group p-3.5 rounded-xl bg-[#141824] hover:bg-[#1A2030] border border-rose-500/30 hover:border-rose-400 transition-all cursor-pointer flex items-start gap-3 shadow-md"
                >
                  <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 group-hover:scale-105 transition-transform shrink-0">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="text-xs font-bold text-white">
                      {t('batch.galleryOption', 'Galería de fotos')}
                    </div>
                    <p className="text-[11px] text-stone-400 leading-snug">
                      {t('batch.galleryOptionDesc', 'Selector de medios. Si te limita a 100 fotos, usa "Carpetas" o pulsa ⋮ > Examinar.')}
                    </p>
                  </div>
                </button>

                {/* Option 4: Extraer de GIF / Video */}
                <button
                  type="button"
                  onClick={() => mediaExtractInputRef.current?.click()}
                  className="group p-3.5 rounded-xl bg-[#141824] hover:bg-[#1A2030] border border-emerald-500/30 hover:border-emerald-400 transition-all cursor-pointer flex items-start gap-3 shadow-md"
                >
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                    <Film className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="text-xs font-bold text-white">
                      {t('batch.extractOption', 'Extraer de GIF / WebP / Video')}
                    </div>
                    <p className="text-[11px] text-stone-400 leading-snug">
                      {t('batch.extractOptionDesc', 'Desglosa automáticamente todos los fotogramas de una animación existente.')}
                    </p>
                  </div>
                </button>
              </div>

              {/* Android Photo Picker 100-limit guidance box */}
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/35 text-left max-w-2xl mx-auto flex items-start gap-3">
                <Info className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1.5 text-xs">
                  <div className="font-bold text-amber-300">
                    {t('batch.android100LimitTitle', '¿Por qué Android dice "Elige 100 elementos como máximo"?')}
                  </div>
                  <p className="text-stone-300 text-[11px] leading-relaxed">
                    {t(
                      'batch.android100LimitDesc',
                      'Ese límite de 100 es una restricción exclusiva del selector de fotos de Google Fotos en Android. Para subir hasta 1000 imágenes: pulsa en "Carpetas del dispositivo (Explorador)", o dentro de Google Fotos toca el menú de tres puntos (⋮) en la esquina superior y pulsa "Examinar". También puedes pulsar "Listo", cargar esas 100 y luego tocar "+ Añadir más" sucesivamente hasta alcanzar 1000 fotos.'
                    )}
                  </p>
                </div>
              </div>

              {/* Quick sample demo button */}
              <div className="pt-1 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => handleLoadDemo(12)}
                  className="px-4 py-2 rounded-xl bg-[#141824] hover:bg-[#1F2538] text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span>{t('batch.demoBtn', 'Probar con 12 imágenes demo')}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Pagination controls if items > pageSize */}
              {items.length > pageSize && (
                <div className="flex items-center justify-between px-2 py-1.5 bg-[#090A0F] border border-[#1E2333] rounded-xl text-xs text-stone-300">
                  <div className="flex items-center gap-2 font-mono">
                    <span>
                      {t('batch.showing', 'Mostrando')} {(currentPage - 1) * pageSize + 1} -{' '}
                      {Math.min(currentPage * pageSize, items.length)} {t('batch.of', 'de')} {items.length}
                    </span>
                    <span className="text-stone-500">|</span>
                    <span className="text-sky-400 font-bold">
                      {t('batch.page', 'Pág.')} {currentPage} / {totalPages}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(1)}
                      className="p-1 rounded bg-[#141722] hover:bg-[#1E2333] disabled:opacity-30 border border-[#242A3D] cursor-pointer"
                      title={t('batch.firstPage', 'Primera página')}
                    >
                      <ChevronsLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="p-1 rounded bg-[#141722] hover:bg-[#1E2333] disabled:opacity-30 border border-[#242A3D] cursor-pointer"
                      title={t('batch.prevPage', 'Página anterior')}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="p-1 rounded bg-[#141722] hover:bg-[#1E2333] disabled:opacity-30 border border-[#242A3D] cursor-pointer"
                      title={t('batch.nextPage', 'Página siguiente')}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(totalPages)}
                      className="p-1 rounded bg-[#141722] hover:bg-[#1E2333] disabled:opacity-30 border border-[#242A3D] cursor-pointer"
                      title={t('batch.lastPage', 'Última página')}
                    >
                      <ChevronsRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Scrollable Grid of Uploaded Images */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[440px] overflow-y-auto pr-1">
                {paginatedItems.map((item, localIdx) => {
                  const globalIdx = (currentPage - 1) * pageSize + localIdx;
                  const isSelected = selectedIds.has(item.id);

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedPreviewIndex(globalIdx)}
                      className={`relative group rounded-xl p-2 bg-[#090A0F] border transition-all cursor-pointer flex flex-col justify-between ${
                        selectedPreviewIndex === globalIdx
                          ? 'border-red-500 ring-1 ring-red-500 shadow-lg'
                          : isSelected
                          ? 'border-[#1E2333] hover:border-emerald-500/50'
                          : 'border-[#1A1D27] opacity-60 hover:opacity-100'
                      }`}
                    >
                      {/* Checkbox Selector */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelect(item.id);
                        }}
                        className={`absolute top-3 left-3 z-10 p-1 rounded-md transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'bg-black/80 text-stone-400 hover:text-white border border-white/20'
                        }`}
                        title={isSelected ? t('batch.deselectFrame', 'Deseleccionar fotograma') : t('batch.selectFrame', 'Elegir fotograma')}
                      >
                        {isSelected ? <Check className="h-3 w-3 stroke-[3]" /> : <Square className="h-3 w-3" />}
                      </button>

                      {/* Index Badge */}
                      <div className="absolute top-3 right-8 z-10 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md text-[10px] font-mono font-bold text-white border border-white/10">
                        #{globalIdx + 1}
                      </div>

                      {/* Quick remove button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeItem(globalIdx);
                        }}
                        className="absolute top-3 right-3 z-10 p-1 rounded-md bg-black/70 hover:bg-red-600 text-stone-300 hover:text-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                        title={t('batch.removeImage', 'Quitar imagen')}
                      >
                        <X className="h-3 w-3" />
                      </button>

                      {/* Image Thumbnail Container */}
                      <div className="w-full aspect-square rounded-lg bg-[#141722] overflow-hidden flex items-center justify-center border border-white/5 mt-5">
                        <img
                          src={item.previewUrl}
                          alt={item.name}
                          className={`w-full h-full object-contain transition-all ${
                            isSelected ? '' : 'grayscale contrast-75'
                          }`}
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
                          disabled={globalIdx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveItem(globalIdx, 'up');
                          }}
                          className="p-1 rounded hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                          title={t('batch.moveUp', 'Mover antes')}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <span className="text-[9px] uppercase tracking-wider text-stone-400">
                          {isSelected ? t('batch.chosen', 'Elegido') : t('batch.excluded', 'Excluido')}
                        </span>
                        <button
                          type="button"
                          disabled={globalIdx === items.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveItem(globalIdx, 'down');
                          }}
                          className="p-1 rounded hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                          title={t('batch.moveDown', 'Mover después')}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add more button footer */}
              <div className="flex items-center justify-between text-xs text-stone-400 px-1 pt-1">
                <span>
                  {t(
                    'batch.tipAddMore',
                    'Tip: Puedes elegir o arrastrar más fotogramas en cualquier momento (hasta 1000).'
                  )}
                </span>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => mediaExtractInputRef.current?.click()}
                    className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                    title={t('batch.extractFramesTitle', 'Extrae fotogramas de GIF, WebP o video')}
                  >
                    <Film className="h-3.5 w-3.5" />
                    <span>{t('batch.extractFrames', 'Extraer')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 cursor-pointer"
                    title={t('batch.chooseGalleryTitle', 'Abrir la galería de fotos')}
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    <span>{t('batch.chooseGallery', 'Galería')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenDirectoryPicker}
                    className="text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 cursor-pointer"
                    title={t('batch.chooseDirectoryTitle', 'Cargar carpeta completa')}
                  >
                    <FolderArchive className="h-3.5 w-3.5" />
                    <span>{t('batch.chooseDirectory', 'Carpeta')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => folderFilesInputRef.current?.click()}
                    className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30"
                    title={t('batch.chooseFoldersTitle', 'Abre el explorador de archivos para entrar a cualquier carpeta del dispositivo')}
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    <span>{t('batch.chooseFolders', 'Carpetas')}</span>
                  </button>
                </div>
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
                    {t('batch.animatedSettings', 'Ajustes de Animación WebP')}
                  </span>
                </div>
                <span className="text-[11px] text-sky-400 font-mono font-bold">
                  {selectedItems.length > 0 ? selectedItems.length : items.length} {t('batch.framesCount', 'fotogramas')}
                </span>
              </div>

              {/* FPS & Duration */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-300 font-semibold flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-stone-400" />
                    {t('batch.fpsLabel', 'Velocidad (FPS / Fotogramas por segundo):')}
                  </span>
                  <span className="font-mono font-bold text-white px-2 py-0.5 rounded bg-[#181D2C] border border-[#2B334D]">
                    {fps} FPS ({delayMs} {t('batch.msPerFrame', 'ms/cuadro')})
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
                    title={t('batch.fpsVyzerTitle', '30 FPS exacto calibrado a 34ms para Vyzer / Discord')}
                  >
                    30 FPS (Vyzer)
                  </button>
                </div>
              </div>

              {/* WebP Quality Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-300 font-semibold">{t('batch.qualityLabel', 'Calidad de Compresión WebP:')}</span>
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
                  <span className="text-stone-300 font-semibold">{t('batch.resolutionLabel', 'Resolución de Salida:')}</span>
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
                    {t('batch.presetOriginal', 'Original')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDimensionPreset('vyzer')}
                    className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer truncate ${
                      dimensionPreset === 'vyzer'
                        ? 'bg-emerald-600 text-white border-emerald-500 font-bold'
                        : 'bg-[#121622] text-emerald-400 border-emerald-900/40 hover:border-emerald-700'
                    }`}
                    title={t('batch.presetVyzerTitle', '1000 x 1000 px para molduras de avatar de Vyzer / Discord')}
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
                    {t('batch.presetSticker', 'Sticker 512px')}
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
                    {t('batch.presetScale50', 'Escala 50%')}
                  </button>
                </div>
              </div>

              {/* Loop Count */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-stone-300 font-semibold">{t('batch.loopLabel', 'Bucle de Reproducción:')}</span>
                <select
                  value={loopCount}
                  onChange={(e) => setLoopCount(parseInt(e.target.value))}
                  className="bg-[#141722] border border-[#242A3D] text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-red-500 cursor-pointer"
                >
                  <option value={0}>{t('batch.loopInfinite', 'Infinito (Bucle continuo)')}</option>
                  <option value={1}>{t('batch.loopOnce', '1 sola vez (Sin bucle)')}</option>
                  <option value={3}>3 {t('batch.loopTimes', 'repeticiones')}</option>
                  <option value={5}>5 {t('batch.loopTimes', 'repeticiones')}</option>
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
                    <span>{statusText || t('batch.processingImages', 'Procesando imágenes...')}</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 fill-white" />
                    <span>
                      {t('batch.convertAnimated', 'Convertir {count} fotogramas elegidos a 1 archivo WebP').replace(
                        '{count}',
                        String(itemsToProcess.length)
                      )}
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
                    {t('batch.zipSettings', 'Ajustes de Lote WebP ZIP')}
                  </span>
                </div>
                <span className="text-[11px] text-emerald-400 font-mono font-bold">
                  {itemsToProcess.length} {t('batch.filesCount', 'archivos')}
                </span>
              </div>

              <p className="text-xs text-stone-400">
                {t(
                  'batch.zipDesc',
                  'Convierte cada una de tus {count} fotos a formato WebP moderno con máxima compresión y las empaqueta en un único archivo descargable .ZIP.'
                ).replace('{count}', String(itemsToProcess.length))}
              </p>

              {/* Quality Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-300 font-semibold">{t('batch.zipQualityLabel', 'Calidad WebP por imagen:')}</span>
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
                    <span>{statusText || t('batch.convertingToWebp', 'Convirtiendo a WebP...')}</span>
                  </>
                ) : (
                  <>
                    <FolderDown className="h-4 w-4" />
                    <span>
                      {t('batch.convertZip', 'Convertir {count} fotos y descargar .ZIP').replace(
                        '{count}',
                        String(itemsToProcess.length)
                      )}
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
                    {t('batch.animatedReady', '¡Archivo WebP Animado Listo!')}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-red-950/60 text-red-400 border border-red-500/40 text-[10px] font-mono font-bold">
                  {animatedResult.frameCount} {t('batch.framesCount', 'FOTOGRAMAS')}
                </span>
              </div>

              {/* Animated WebP Output Screen */}
              <div className="relative w-full aspect-square max-h-[300px] rounded-xl bg-[#05060A] border border-[#222736] overflow-hidden flex items-center justify-center p-2">
                <img
                  src={animatedResult.url}
                  alt={t('batch.resultAlt', 'WebP Animado Resultante')}
                  className="max-w-full max-h-full object-contain"
                />

                <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/80 backdrop-blur-sm text-[10px] font-mono text-stone-300 border border-white/10">
                  {animatedResult.width} x {animatedResult.height} px • {fps} FPS
                </div>
              </div>

              {/* Stats: Original vs Output */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-[#141722] border border-[#23293D] space-y-0.5">
                  <span className="text-[10px] text-stone-400 block">
                    {t('batch.origWeight', 'Total fotos originales:')}
                  </span>
                  <span className="font-bold text-stone-300">{formatFileSize(totalOriginalSize)}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#141722] border border-[#23293D] space-y-0.5">
                  <span className="text-[10px] text-stone-400 block">
                    {t('batch.finalWeight', 'Peso archivo WebP final:')}
                  </span>
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
                  <span>
                    {t('batch.downloadWebp', 'Descargar animacion.webp')} ({formatFileSize(animatedResult.totalSize)})
                  </span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => window.open(animatedResult.url, '_blank')}
                    className="flex-1 py-2 rounded-lg bg-[#151926] hover:bg-[#1E2436] text-stone-300 hover:text-white border border-[#262E44] text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {t('batch.openNewTab', 'Abrir en pestaña nueva')}
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
                      {t('batch.optimizeWeight', 'Optimizar peso')}
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
                    {t('batch.zipReady', '¡Lote ZIP Empaquetado!')}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono font-bold">
                  {zipResult.convertedFiles.length} {t('batch.webpFiles', 'ARCHIVOS WEBP')}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-[#141722] border border-[#23293D] space-y-0.5">
                  <span className="text-[10px] text-stone-400 block">{t('batch.originalSize', 'Tamaño original:')}</span>
                  <span className="font-bold text-stone-300">{formatFileSize(zipResult.totalOriginalSize)}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#141722] border border-[#23293D] space-y-0.5">
                  <span className="text-[10px] text-stone-400 block">{t('batch.zipSize', 'Tamaño archivo .ZIP:')}</span>
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
                <span>
                  {t('batch.zipDownload', 'Descargar archivo .ZIP')} ({formatFileSize(zipResult.zipBlob.size)})
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
