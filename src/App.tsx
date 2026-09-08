import React, { useState, useMemo, useEffect } from 'react';
import { Header } from './components/Header';
import { CategoryNav } from './components/CategoryNav';
import { ToolGrid } from './components/ToolGrid';
import { UploadZone } from './components/UploadZone';
import { ActiveToolWorkspace } from './components/ActiveToolWorkspace';
import { BatchWebPWorkspace } from './components/BatchWebPWorkspace';
import { LeftToolsDrawer } from './components/LeftToolsDrawer';
import { SubtoolsBar } from './components/SubtoolsBar';
import { HistoryDrawer } from './components/HistoryDrawer';
import { AiAssistantModal } from './components/AiAssistantModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { Footer } from './components/Footer';
import { TOOLS } from './data/tools';
import { ToolCategory, ToolDefinition, MediaFileInfo } from './types';
import { Zap, Shield, Sparkles, Search, X, SlidersHorizontal, Keyboard, Flame, Cpu, Lock, Wand2 } from 'lucide-react';
import { AikoHamsterLogo } from './components/AikoHamsterLogo';
import { cleanExpiredHistory } from './utils/historyStorage';
import { useLanguage } from './context/LanguageContext';
import { useTheme } from './context/ThemeContext';

export function App() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [activeCategory, setActiveCategory] = useState<ToolCategory>('all');
  const [selectedTool, setSelectedTool] = useState<ToolDefinition | null>(TOOLS[0]);
  const [activeFile, setActiveFile] = useState<MediaFileInfo | null>(null);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Auto clean expired history items every 30 seconds
  useEffect(() => {
    cleanExpiredHistory();
    const interval = setInterval(() => {
      cleanExpiredHistory();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter tools based on category and search term
  const filteredTools = useMemo(() => {
    return TOOLS.filter((tool) => {
      const matchesCategory =
        activeCategory === 'all' || tool.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const translatedName = t(`tool.${tool.id}.name`, tool.name).toLowerCase();
      const translatedSub = t(`tool.${tool.id}.sub`, tool.subtitle).toLowerCase();
      const translatedDesc = t(`tool.${tool.id}.desc`, tool.description).toLowerCase();
      const matchesSearch =
        !q ||
        tool.name.toLowerCase().includes(q) ||
        tool.subtitle.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        translatedName.includes(q) ||
        translatedSub.includes(q) ||
        translatedDesc.includes(q) ||
        tool.category.toLowerCase().includes(q) ||
        (tool.subtools && tool.subtools.some((s) => s.toLowerCase().includes(q)));
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery, t]);

  const handleFileSelected = (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    const newFileInfo: MediaFileInfo = {
      file,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      previewUrl
    };

    if (isImage) {
      const img = new Image();
      img.onload = () => {
        setActiveFile({
          ...newFileInfo,
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      };
      img.onerror = () => {
        setActiveFile(newFileInfo);
      };
      img.src = previewUrl;
    } else if (isVideo) {
      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        setActiveFile({
          ...newFileInfo,
          width: video.videoWidth,
          height: video.videoHeight,
          duration: video.duration
        });
      };
      video.onerror = () => {
        setActiveFile(newFileInfo);
      };
      video.src = previewUrl;
    } else {
      setActiveFile(newFileInfo);
    }
  };

  const handleClearFile = () => {
    if (activeFile?.previewUrl) {
      URL.revokeObjectURL(activeFile.previewUrl);
    }
    setActiveFile(null);
    setBatchFiles([]);
  };

  const handleBatchFilesSelected = (files: File[]) => {
    setBatchFiles(files);
    const target = TOOLS.find((t) => t.id === 'batch-webp');
    if (target) {
      setSelectedTool(target);
    }
    const dropzone = document.getElementById('workspace-container');
    if (dropzone) {
      dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleSelectTool = (tool: ToolDefinition) => {
    setSelectedTool(tool);
    const dropzone = document.getElementById('dropzone-area') || document.getElementById('workspace-container');
    if (dropzone) {
      dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleSelectToolById = (toolId: string) => {
    const target = TOOLS.find((t) => t.id === toolId);
    if (target) {
      setSelectedTool(target);
    }
  };

  const handleSelectResultForWorkspace = (file: File, toolId: string) => {
    handleFileSelected(file);
    const target = TOOLS.find((t) => t.id === toolId) || TOOLS[0];
    setSelectedTool(target);
    const dropzone = document.getElementById('workspace-container');
    if (dropzone) {
      dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleResetHome = () => {
    handleClearFile();
    setActiveCategory('all');
    setSearchQuery('');
    setSelectedTool(TOOLS[0]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Global keyboard shortcuts (Ctrl+O to open file, Esc to close drawers, Ctrl+/ for shortcuts)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) fileInput.click();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsDrawerOpen(false);
        setIsHistoryOpen(false);
        setIsAiAssistantOpen(false);
        setIsShortcutsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-[#090A0F] text-[#F3F4F6] flex flex-col font-['Outfit'] antialiased">
      {/* Slide-out Left Drawer for Quick Tool Access & Search */}
      <LeftToolsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        tools={TOOLS}
        selectedTool={selectedTool}
        onSelectTool={handleSelectTool}
      />

      {/* History Drawer with auto-deletion in 1 hour */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

      {/* Autonomous AI Media Assistant Modal */}
      <AiAssistantModal
        isOpen={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
        initialFile={activeFile?.file || null}
        onSelectResultForWorkspace={handleSelectResultForWorkspace}
      />

      {/* Keyboard Shortcuts Modal */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Top App Header with Theme Switcher, AI, Language, Notification & History buttons */}
      <Header
        onReset={handleResetHome}
        onOpenToolsDrawer={() => setIsDrawerOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      {/* Main Content View */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-6">
        {/* Brand Banner: Aiko Neon Logo + AikoTools Title & Studio Status */}
        <section className="pt-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <button
            onClick={handleResetHome}
            id="btn-brand-header"
            className="group flex items-center gap-3.5 text-left focus:outline-none transition-transform hover:scale-[1.01] active:scale-98 cursor-pointer"
          >
            <div
              style={{
                borderColor: `${theme.primary}40`,
                boxShadow: `0 0 20px ${theme.primaryGlow}`
              }}
              className="relative flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-[#181114] to-[#0E0B0D] border p-2 transition-all group-hover:scale-105"
            >
              <AikoHamsterLogo size={36} color="#FFFFFF" accentColor={theme.primary} showText={false} glow />
              <span
                style={{ backgroundColor: theme.primary, boxShadow: `0 0 6px ${theme.primary}` }}
                className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 rounded-full border-2 border-[#090A0F]"
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-['Syne'] text-2xl sm:text-[28px] font-black tracking-tight text-white leading-none">
                  Aiko<span style={{ color: theme.primary }}>Tools</span>
                </span>
                <span
                  style={{ color: theme.primary, backgroundColor: `${theme.primary}18`, borderColor: `${theme.primary}40` }}
                  className="px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold"
                >
                  PRO STUDIO v3.1
                </span>
              </div>
              <p className="text-xs text-stone-400 font-medium tracking-tight mt-0.5">
                {t('hero.eyebrow', 'Suite multimedia profesional en tu navegador, sin límites ni telemetría')}
              </p>
            </div>
          </button>

          {/* Quick Engine Status Chip */}
          <div className="hidden sm:flex items-center gap-3 bg-[#11131B] border border-[#222736] px-3.5 py-2 rounded-xl text-[11px] font-mono text-stone-300 shadow-sm">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: theme.primary }} />
              <span className="font-bold" style={{ color: theme.primary }}>{t('app.localEngine', 'Motor Local RedPro')}</span>
            </div>
            <span className="text-stone-700">|</span>
            <div className="flex items-center gap-1 text-stone-300">
              <Cpu className="h-3.5 w-3.5 text-stone-400" />
              <span>Canvas GPU</span>
            </div>
            <span className="text-stone-700">|</span>
            <button
              onClick={() => setIsShortcutsOpen(true)}
              className="flex items-center gap-1 text-stone-400 hover:text-white transition-colors cursor-pointer"
            >
              <Keyboard className="h-3 w-3" />
              <span>Ctrl + /</span>
            </button>
          </div>
        </section>

        {/* Subtools Horizontal Quick Bar (Ezgif style navigation) */}
        <section>
          <SubtoolsBar
            selectedTool={selectedTool}
            onSelectToolById={handleSelectToolById}
          />
        </section>

        {/* HERO SECTION */}
        <section className="space-y-4 text-left pt-1">
          {/* Eyebrow */}
          <div className="flex items-center gap-2">
            <span
              style={{ backgroundColor: theme.primary, boxShadow: `0 0 8px ${theme.primary}` }}
              className="h-[2px] w-6 inline-block rounded-full"
            />
            <span
              style={{ color: theme.primary }}
              className="text-[11px] font-extrabold tracking-widest uppercase font-mono"
            >
              {t('hero.eyebrow', 'Tu suite multimedia profesional, privada y ultra-rápida')}
            </span>
          </div>

          {/* Headline with Mascot Avatar */}
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-[32px] sm:text-[42px] lg:text-[48px] font-black leading-[1.04] tracking-tight text-white flex-1 font-['Syne']">
              {t('hero.title1', 'Hazlo pequeño.')} <br />
              <span
                style={{
                  color: theme.primary,
                  textShadow: `0 0 25px ${theme.primary}40`
                }}
              >
                {t('hero.title2', 'Sin perder calidad.')}
              </span>
            </h1>

            {/* Mascot Vector Badge */}
            <button
              onClick={() => setIsAiAssistantOpen(true)}
              className="relative shrink-0 -mt-1 group cursor-pointer focus:outline-none"
              title={t('header.aiAssistant', 'Asistente IA Multimedia')}
            >
              <div
                style={{
                  borderColor: `${theme.primary}40`,
                  boxShadow: `0 0 24px ${theme.primaryGlow}`
                }}
                className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-[#151013] border-2 shadow-xl p-1 flex items-center justify-center transition-all duration-300 group-hover:scale-105"
              >
                <AikoHamsterLogo size={52} color="#FFFFFF" accentColor={theme.primary} showText={false} glow />
              </div>
            </button>
          </div>

          {/* Description */}
          <p className="text-xs sm:text-sm md:text-base text-stone-300 leading-relaxed font-normal max-w-3xl">
            {t('hero.description', 'Una suite completa y profesional para optimizar, convertir y editar tus archivos multimedia. Todo el renderizado y compresión ocurre directamente en tu navegador, garantizando máxima velocidad y total privacidad.')}
          </p>

          {/* Professional Perks Cards with Red/Dark Accent */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs sm:text-sm font-semibold text-stone-200">
            <div className="flex items-center gap-2.5 bg-[#11131B] border border-[#222736] p-3 rounded-xl">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-950/50 border border-red-500/40 text-red-400">
                <Flame className="h-4 w-4 fill-red-400" />
              </div>
              <span>{t('hero.bullet1', 'Procesamiento en memoria ultra-rápido')}</span>
            </div>

            <div className="flex items-center gap-2.5 bg-[#11131B] border border-[#222736] p-3 rounded-xl">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-950/50 border border-red-500/40 text-red-400">
                <Lock className="h-4 w-4 text-red-400" />
              </div>
              <span>{t('hero.bullet2', '100% privado y sin límites de uso')}</span>
            </div>

            <div className="flex items-center gap-2.5 bg-[#11131B] border border-[#222736] p-3 rounded-xl">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-950/50 border border-amber-500/40 text-amber-400">
                <Sparkles className="h-4 w-4 fill-amber-400" />
              </div>
              <span>{t('hero.bullet3', 'IA Generativa, Eliminar Fondo, Filtros y GIF')}</span>
            </div>
          </div>
        </section>

        {/* UPLOAD ZONE / ACTIVE PROCESSING WORKSPACE */}
        <section id="workspace-container">
          {selectedTool?.id === 'batch-webp' ? (
            <BatchWebPWorkspace
              initialFiles={batchFiles}
              onClear={() => {
                setBatchFiles([]);
                handleClearFile();
              }}
              onChainResult={handleSelectResultForWorkspace}
            />
          ) : activeFile && selectedTool ? (
            <ActiveToolWorkspace
              tool={selectedTool}
              fileInfo={activeFile}
              onClearFile={handleClearFile}
              onChangeTool={(t) => setSelectedTool(t)}
              onChainResult={handleSelectResultForWorkspace}
            />
          ) : (
            <UploadZone
              onFileSelected={handleFileSelected}
              onFilesSelected={handleBatchFilesSelected}
              selectedTool={selectedTool}
            />
          )}
        </section>

        {/* TOOLBOX SECTION WITH SEARCH BAR */}
        <section className="space-y-4 pt-2">
          {/* Eyebrow and Title */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  style={{ backgroundColor: theme.primary }}
                  className="h-[2px] w-6 inline-block rounded-full shadow-xs"
                />
                <span
                  style={{ color: theme.primary }}
                  className="text-[11px] font-extrabold tracking-widest uppercase font-mono"
                >
                  {t('tools.allTitle', 'Todas las herramientas')}
                </span>
              </div>

              <button
                onClick={() => setIsDrawerOpen(true)}
                style={{ color: theme.primary }}
                className="text-xs font-bold hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>{t('tools.viewDrawer', 'Ver panel lateral')}</span>
              </button>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight font-['Syne']">
              {t('tools.suiteTitle', 'Suite profesional,')} <span style={{ color: theme.primary }}>{t('tools.suiteStyle', 'al estilo Ezgif.')}</span>
            </h2>
          </div>

          {/* Search Bar for Tools */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
            <input
              type="text"
              id="main-tool-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('tools.searchPlaceholder', 'Buscar herramienta (Eliminar fondo, Conversor, Filtros, GIF...)')}
              className="w-full rounded-xl bg-[#11131B] border border-[#222736] pl-10 pr-9 py-3 text-xs sm:text-sm text-white placeholder:text-stone-500 focus:border-red-500 focus:outline-none shadow-md transition-all"
            />
            {searchQuery && (
                <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white p-1 cursor-pointer"
                title={t('tools.clearSearch', 'Limpiar búsqueda')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <CategoryNav
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
          />

          {/* Tools Grid or Empty State */}
          {filteredTools.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-[#11131B] border border-[#222736] space-y-2">
              <Search className="h-6 w-6 mx-auto text-stone-400 opacity-60" />
              <p className="text-sm font-bold text-stone-200">
                {t('tools.noResults', 'Sin resultados para')} "{searchQuery}"
              </p>
              <p className="text-xs text-stone-400">
                {t('tools.tryAnother', 'Intenta buscar por "Fondo", "Conversor", "Filtros", "Video" o limpia la búsqueda.')}
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                }}
                className="mt-2 text-xs font-bold text-red-400 hover:underline cursor-pointer"
              >
                {t('tools.showAll', 'Mostrar todas las herramientas')}
              </button>
            </div>
          ) : (
            <ToolGrid
              tools={filteredTools}
              selectedTool={selectedTool}
              onSelectTool={handleSelectTool}
            />
          )}
        </section>
      </main>

      {/* Editorial Footer */}
      <Footer />
    </div>
  );
}

export default App;
