import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Upload, Film, Image as ImageIcon, Sparkles, X, Layers, Music, Zap, FileText, CheckCircle2, ShieldCheck, Flame, FolderOpen } from 'lucide-react';
import { ToolDefinition } from '../types';
import { formatFileSize } from '../utils/mediaEngine';
import { notifyUser } from '../utils/notifications';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { generateSampleImage, generateSampleBatchImages } from '../utils/sampleMedia';

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  onFilesSelected?: (files: File[]) => void;
  selectedTool?: ToolDefinition | null;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onFileSelected, onFilesSelected, selectedTool }) => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const progressTimerRef = useRef<any>(null);

  const acceptedFormats = selectedTool ? selectedTool.acceptedMime : 'image/*,video/*,.gif,.webp';
  const toolColor = selectedTool?.accentHex || theme.primary;

  const startUploadSimulation = (file: File) => {
    setPendingFile(file);
    setIsUploading(true);
    setUploadProgress(15);

    let progress = 15;
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);

    progressTimerRef.current = setInterval(() => {
      progress += Math.floor(Math.random() * 25) + 18;
      if (progress >= 100) {
        progress = 100;
        setUploadProgress(100);
        clearInterval(progressTimerRef.current);

        notifyUser({
          title: `⚡ ${file.name}`,
          body: `${t('upload.readyToProcess', 'Listo para procesar con')} ${selectedTool ? t(`tool.${selectedTool.id}.name`, selectedTool.name) : 'AikoTools Studio'}.`,
          type: 'success'
        });

        setTimeout(() => {
          setIsUploading(false);
          setPendingFile(null);
          onFileSelected(file);
        }, 200);
      } else {
        setUploadProgress(progress);
      }
    }, 70);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (e.dataTransfer.files.length > 1 && onFilesSelected) {
        onFilesSelected(Array.from(e.dataTransfer.files));
      } else {
        const file = e.dataTransfer.files[0];
        startUploadSimulation(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (e.target.files.length > 1 && onFilesSelected) {
        onFilesSelected(Array.from(e.target.files));
      } else {
        const file = e.target.files[0];
        startUploadSimulation(file);
      }
    }
  };

  const handleCancelUpload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    setIsUploading(false);
    setPendingFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        startUploadSimulation(file);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  const getFileIcon = (mime: string) => {
    if (mime.startsWith('video/')) return <Film className="h-6 w-6 text-red-400" />;
    if (mime.includes('gif')) return <Sparkles className="h-6 w-6 text-amber-400" />;
    if (mime.startsWith('audio/')) return <Music className="h-6 w-6 text-emerald-400" />;
    return <ImageIcon className="h-6 w-6 text-red-400" />;
  };

  return (
    <div className="w-full space-y-3 font-['Outfit']">
      <div
        id="dropzone-area"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          borderColor: isDragging ? theme.primary : '#222736',
          boxShadow: isDragging ? `0 0 30px ${theme.primaryGlow}` : '0 10px 30px -10px rgba(0,0,0,0.5)'
        }}
        className={`relative overflow-hidden rounded-2xl bg-[#0F1118] border transition-all duration-300 ${
          isDragging ? 'scale-[1.01] border-red-500' : ''
        }`}
      >
        {/* Dynamic Glowing Progress Perimeter Line */}
        <div
          style={{
            backgroundColor: toolColor,
            boxShadow: `0 0 14px ${toolColor}`,
            width: isUploading ? `${uploadProgress}%` : '100%'
          }}
          className={`absolute top-0 left-0 h-1 transition-all duration-150 ease-out z-20 ${
            isUploading ? 'opacity-100' : 'opacity-40'
          }`}
        />

        <input
          ref={fileInputRef}
          id="file-input"
          type="file"
          multiple
          accept={acceptedFormats}
          onChange={handleFileChange}
          className="hidden"
        />

        <input
          ref={folderInputRef}
          id="folder-files-input"
          type="file"
          multiple
          accept="*/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Inner Frame */}
        <div className="p-6 sm:p-8 flex flex-col items-center justify-center text-center">
          {isUploading && pendingFile ? (
            <div className="w-full max-w-md py-4 space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between gap-3 bg-[#151822] p-4 rounded-xl border border-[#262C3E]">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#1C2130] border border-[#2E364E]">
                    {getFileIcon(pendingFile.type)}
                  </div>
                  <div className="text-left truncate">
                    <p className="text-sm font-bold text-white truncate max-w-[200px]">
                      {pendingFile.name}
                    </p>
                    <p className="text-xs text-stone-400 font-mono">
                      {formatFileSize(pendingFile.size)} · {pendingFile.type.split('/')[1]?.toUpperCase() || 'ARCHIVO'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCancelUpload}
                  className="p-2 rounded-lg text-stone-400 hover:text-white hover:bg-[#252C3E] transition-colors cursor-pointer"
                  title={t('upload.cancel', 'Cancelar')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2 text-left">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-stone-300 flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full animate-ping"
                      style={{ backgroundColor: toolColor }}
                    />
                    {uploadProgress < 100 ? t('upload.buffering', 'Procesando en búfer de memoria...') : t('upload.readyCanvas', '¡Listo! Inicializando canvas')}
                  </span>
                  <span
                    style={{ color: toolColor }}
                    className="font-mono font-bold text-sm"
                  >
                    {uploadProgress}%
                  </span>
                </div>

                <div className="h-2.5 w-full bg-[#090A0E] rounded-full overflow-hidden p-0.5 border border-[#1E2333]">
                  <div
                    style={{
                      width: `${uploadProgress}%`,
                      backgroundColor: toolColor,
                      boxShadow: `0 0 12px ${toolColor}`
                    }}
                    className="h-full rounded-full transition-all duration-150 ease-out"
                  />
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-stone-400 font-medium pt-1">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>{t('upload.privateLocal', 'Procesamiento 100% privado en navegador')}</span>
              </div>
            </div>
          ) : (
            <>
              {/* Center Upload Icon with Red Neon styling */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  boxShadow: `0 0 25px ${toolColor}35`,
                  borderColor: `${toolColor}40`
                }}
                className="group cursor-pointer flex h-16 w-16 items-center justify-center rounded-2xl bg-[#171922] text-white shadow-lg transition-all active:scale-95 hover:scale-105 mb-4 border"
              >
                <ArrowUp className="h-7 w-7 stroke-[2.5]" style={{ color: toolColor }} />
              </div>

              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {t('upload.title', 'Toca o arrastra tus archivos aquí')}
              </h3>
              <p className="text-xs sm:text-sm text-stone-400 mt-1 mb-6 max-w-md">
                {t('upload.subtitle', 'Formatos soportados: PNG, JPG, WebP, GIF, MP4, WebM, SVG, AVIF')}
              </p>

              {/* Main Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  id="btn-select-file"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    backgroundColor: toolColor,
                    boxShadow: `0 0 20px ${toolColor}40`
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl active:scale-95 px-6 py-3 text-sm font-bold text-white border border-white/20 transition-all min-h-[46px] tracking-wide cursor-pointer hover:brightness-110"
                >
                  <Upload className="h-4 w-4 stroke-[2.5]" />
                  <span>{t('upload.selectBtn', 'Elegir archivo')}</span>
                </button>

                <button
                  type="button"
                  id="btn-select-folder-files"
                  onClick={() => folderInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 rounded-xl active:scale-95 px-5 py-3 text-sm font-bold text-amber-300 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/40 transition-all min-h-[46px] cursor-pointer shadow-xs hover:border-amber-400"
                  title={t('upload.foldersBtnTitle', 'Abrir explorador de archivos para entrar a cualquier carpeta del dispositivo')}
                >
                  <FolderOpen className="h-4 w-4 text-amber-400" />
                  <span>{t('upload.foldersBtn', 'Carpetas del dispositivo')}</span>
                </button>

                <div className="hidden sm:flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#141720] border border-[#242938] text-xs font-mono text-stone-300">
                  <span className="font-bold text-stone-400">Ctrl + V</span>
                  <span>{t('upload.pasteClipboard', 'pega desde portapapeles')}</span>
                </div>
              </div>

              {/* Sample Files Quick Loader */}
              <div className="mt-7 pt-5 border-t border-[#1C202E] w-full max-w-xl">
                <div className="flex items-center justify-between text-xs text-stone-400 font-semibold mb-3">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    <span>{t('upload.noFileSample', '¿Sin archivo a mano? Carga una muestra rápida:')}</span>
                  </span>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-stone-400">{t('upload.instantDemo', 'Demo Instantánea')}</span>
                </div>

                <div className={`grid gap-2 ${selectedTool?.id === 'batch-webp' ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'}`}>
                  {selectedTool?.id === 'batch-webp' && (
                    <button
                      type="button"
                      onClick={async () => {
                        const batch = await generateSampleBatchImages(12);
                        if (onFilesSelected) {
                          onFilesSelected(batch);
                        } else if (batch.length > 0) {
                          startUploadSimulation(batch[0]);
                        }
                      }}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-sky-950/50 hover:bg-sky-900/60 border border-sky-500/50 text-xs font-bold text-sky-300 hover:text-white transition-all cursor-pointer shadow-xs col-span-2 sm:col-span-1"
                    >
                      <span>🗂️ 12 Fotos Demo</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={async () => {
                      const sample = await generateSampleImage('portrait');
                      startUploadSimulation(sample);
                    }}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#141722] hover:bg-[#1C202E] border border-[#222736] hover:border-red-500/50 text-xs font-semibold text-stone-200 hover:text-white transition-all cursor-pointer shadow-xs"
                  >
                    <span>{t('upload.sampleAvatar', '👤 Avatar HD')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const sample = await generateSampleImage('icon');
                      startUploadSimulation(sample);
                    }}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#141722] hover:bg-[#1C202E] border border-[#222736] hover:border-amber-500/50 text-xs font-semibold text-stone-200 hover:text-white transition-all cursor-pointer shadow-xs"
                  >
                    <span>{t('upload.sampleLogo', '⚡ Logo Vector')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const sample = await generateSampleImage('landscape');
                      startUploadSimulation(sample);
                    }}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#141722] hover:bg-[#1C202E] border border-[#222736] hover:border-cyan-500/50 text-xs font-semibold text-stone-200 hover:text-white transition-all cursor-pointer shadow-xs"
                  >
                    <span>{t('upload.sampleLandscape', '🌄 Paisaje 4K')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const sample = await generateSampleImage('sticker');
                      startUploadSimulation(sample);
                    }}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#141722] hover:bg-[#1C202E] border border-[#222736] hover:border-rose-500/50 text-xs font-semibold text-stone-200 hover:text-white transition-all cursor-pointer shadow-xs"
                  >
                    <span>{t('upload.sampleSticker', '✨ Sticker Alpha')}</span>
                  </button>
                </div>
              </div>

              {/* Supported Format Badges */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-5 text-[11px] font-mono">
                <span className="px-2 py-0.5 rounded bg-[#161822] text-stone-300 border border-[#242838]">PNG / JPG</span>
                <span className="px-2 py-0.5 rounded bg-[#161822] text-stone-300 border border-[#242838]">{t('upload.animatedGif', 'GIF ANIMADO')}</span>
                <span className="px-2 py-0.5 rounded bg-[#161822] text-stone-300 border border-[#242838]">WEBP / AVIF</span>
                <span className="px-2 py-0.5 rounded bg-[#161822] text-stone-300 border border-[#242838]">MP4 / WEBM</span>
                <span className="px-2 py-0.5 rounded bg-[#161822] text-stone-300 border border-[#242838]">{t('upload.vectorSvg', 'SVG VECTOR')}</span>
                <span className="px-2 py-0.5 rounded bg-[#161822] text-stone-300 border border-[#242838]">ICO / BMP</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
