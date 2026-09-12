import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { SubtoolsBar } from './components/SubtoolsBar';
import { CategoryNav } from './components/CategoryNav';
import { ToolGrid } from './components/ToolGrid';
import { UploadZone } from './components/UploadZone';
import { FeatureBar } from './components/FeatureBar';
import { Footer } from './components/Footer';
import { LeftToolsDrawer } from './components/LeftToolsDrawer';
import { HistoryDrawer } from './components/HistoryDrawer';
import { AiAssistantModal } from './components/AiAssistantModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { ActiveToolWorkspace } from './components/ActiveToolWorkspace';
import { BatchWebPWorkspace } from './components/BatchWebPWorkspace';
import { Mp3ToUrlConverter } from './components/Mp3ToUrlConverter';
import { AikoHamsterLogo } from './components/AikoHamsterLogo';
import { TOOLS } from './data/tools';
import { ToolDefinition, ToolCategory, MediaFileInfo } from './types';
import { useLanguage } from './context/LanguageContext';
import { useTheme } from './context/ThemeContext';
import { generateSampleImage } from './utils/sampleMedia';
import { Flame, Lock, Sparkles, ArrowLeft, Layers, Music } from 'lucide-react';

export function App() {
  const { t } = useLanguage();
  const { theme } = useTheme();

  // Selected tool & category state
  const [selectedTool, setSelectedTool] = useState<ToolDefinition | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory>('all');

  // Active file for single-file tools workspace
  const [activeFileInfo, setActiveFileInfo] = useState<MediaFileInfo | null>(null);

  // Batch files for batch-webp workspace
  const [batchFiles, setBatchFiles] = useState<File[] | null>(null);

  // Drawers & Modals state
  const [isToolsDrawerOpen, setIsToolsDrawerOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid triggering when typing in inputs or textareas
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsToolsDrawerOpen(false);
        setIsHistoryOpen(false);
        setIsAiAssistantOpen(false);
        setIsShortcutsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter tools based on category
  const filteredTools = useMemo(() => {
    if (selectedCategory === 'all') return TOOLS;
    return TOOLS.filter((tool) => tool.category === selectedCategory);
  }, [selectedCategory]);

  // Construct MediaFileInfo helper
  const createMediaFileInfo = useCallback((file: File): Promise<MediaFileInfo> => {
    return new Promise((resolve) => {
      const previewUrl = URL.createObjectURL(file);
      const info: MediaFileInfo = {
        file,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        previewUrl
      };

      if (file.type.startsWith('image/')) {
        const img = new Image();
        img.onload = () => {
          info.width = img.naturalWidth;
          info.height = img.naturalHeight;
          resolve(info);
        };
        img.onerror = () => resolve(info);
        img.src = previewUrl;
      } else if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          info.width = video.videoWidth;
          info.height = video.videoHeight;
          info.duration = video.duration;
          resolve(info);
        };
        video.onerror = () => resolve(info);
        video.src = previewUrl;
      } else {
        resolve(info);
      }
    });
  }, []);

  // Handle single file upload
  const handleFileSelected = async (file: File) => {
    // If selected tool is mp3-to-url, open that tool directly
    if (selectedTool?.id === 'mp3-to-url' || (file.type.startsWith('audio/') && !selectedTool)) {
      const mp3Tool = TOOLS.find((t) => t.id === 'mp3-to-url') || null;
      setSelectedTool(mp3Tool);
      return;
    }

    // Determine fallback tool if none is actively selected
    let currentTool = selectedTool;
    if (!currentTool) {
      if (file.type.startsWith('video/')) {
        currentTool = TOOLS.find((t) => t.id === 'video-tools') || TOOLS[0];
      } else {
        currentTool = TOOLS.find((t) => t.id === 'bg-remover') || TOOLS[0];
      }
      setSelectedTool(currentTool);
    }

    const fileInfo = await createMediaFileInfo(file);
    setActiveFileInfo(fileInfo);
  };

  // Handle batch files selection (e.g. for batch WebP)
  const handleBatchFilesSelected = (files: File[]) => {
    setBatchFiles(files);
    const batchTool = TOOLS.find((t) => t.id === 'batch-webp') || null;
    setSelectedTool(batchTool);
  };

  // Handle tool selection
  const handleSelectTool = async (tool: ToolDefinition) => {
    setSelectedTool(tool);

    if (tool.id === 'mp3-to-url') {
      return;
    }

    if (tool.id === 'batch-webp') {
      return;
    }

    // Tools that can run directly without user providing a file first (like AI generator)
    if (tool.id === 'ai-image-generator' && !activeFileInfo) {
      const sample = await generateSampleImage('portrait');
      const fileInfo = await createMediaFileInfo(sample);
      setActiveFileInfo(fileInfo);
    }
  };

  // Select tool by ID (from subtools bar or drawers)
  const handleSelectToolById = (toolId: string) => {
    const found = TOOLS.find((t) => t.id === toolId);
    if (found) {
      handleSelectTool(found);
    }
  };

  // Reset to home view
  const handleResetHome = () => {
    setSelectedTool(null);
    setActiveFileInfo(null);
    setBatchFiles(null);
    setSelectedCategory('all');
  };

  // Chain result from assistant or other tools
  const handleSelectResultForWorkspace = async (file: File, toolId: string) => {
    const targetTool = TOOLS.find((t) => t.id === toolId) || TOOLS[0];
    setSelectedTool(targetTool);
    const fileInfo = await createMediaFileInfo(file);
    setActiveFileInfo(fileInfo);
    setIsAiAssistantOpen(false);
  };

  // Render Batch WebP Workspace
  if (selectedTool?.id === 'batch-webp' && batchFiles && batchFiles.length > 0) {
    return (
      <div className="min-h-screen bg-[#07090E] text-stone-100 flex flex-col font-['Outfit']">
        <Header
          onReset={handleResetHome}
          onOpenToolsDrawer={() => setIsToolsDrawerOpen(true)}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
        />

        <div className="w-full bg-[#0E111C] border-b border-[#1E2536] px-4 py-2.5">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <button
              onClick={handleResetHome}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#141828] border border-[#232B3E] hover:border-red-500/40 text-stone-300 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" style={{ color: theme.primary }} />
              <span>{t('workspace.backToTools', '← Volver a AikoTools')}</span>
            </button>
            <span className="text-xs font-medium text-stone-400">
              Lote WebP • {batchFiles.length} archivos
            </span>
          </div>
        </div>

        <div className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-5 py-6">
          <BatchWebPWorkspace
            initialFiles={batchFiles}
            onClear={handleResetHome}
            onChainResult={(file, toolId) => handleSelectResultForWorkspace(file, toolId)}
          />
        </div>

        <LeftToolsDrawer
          isOpen={isToolsDrawerOpen}
          onClose={() => setIsToolsDrawerOpen(false)}
          tools={TOOLS}
          selectedTool={selectedTool}
          onSelectTool={handleSelectTool}
        />
        <HistoryDrawer isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
        <AiAssistantModal
          isOpen={isAiAssistantOpen}
          onClose={() => setIsAiAssistantOpen(false)}
          onSelectResultForWorkspace={handleSelectResultForWorkspace}
        />
        <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
      </div>
    );
  }

  // Render Active Single-Tool Workspace
  if (activeFileInfo && selectedTool) {
    return (
      <div className="min-h-screen bg-[#07090E] text-stone-100 flex flex-col font-['Outfit']">
        <Header
          onReset={handleResetHome}
          onOpenToolsDrawer={() => setIsToolsDrawerOpen(true)}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
        />

        <div className="flex-1">
          <ActiveToolWorkspace
            tool={selectedTool}
            fileInfo={activeFileInfo}
            onClearFile={() => setActiveFileInfo(null)}
            onChangeTool={(toolId) => handleSelectToolById(toolId)}
            onChainResult={(file, toolId) => handleSelectResultForWorkspace(file, toolId)}
          />
        </div>

        <LeftToolsDrawer
          isOpen={isToolsDrawerOpen}
          onClose={() => setIsToolsDrawerOpen(false)}
          tools={TOOLS}
          selectedTool={selectedTool}
          onSelectTool={handleSelectTool}
        />
        <HistoryDrawer isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
        <AiAssistantModal
          isOpen={isAiAssistantOpen}
          onClose={() => setIsAiAssistantOpen(false)}
          onSelectResultForWorkspace={handleSelectResultForWorkspace}
        />
        <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
      </div>
    );
  }

  // Primary Default View: Exact AikoTools PRO STUDIO v3.1 Layout from user screenshot
  return (
    <div className="min-h-screen bg-[#07090E] text-stone-100 flex flex-col font-['Outfit'] antialiased">
      {/* Top Header Navigation */}
      <Header
        onReset={handleResetHome}
        onOpenToolsDrawer={() => setIsToolsDrawerOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      {/* Main Studio Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-5 py-4 space-y-5">
        {/* Brand Banner with Aiko Hamster Logo + PRO STUDIO v3.1 badge */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-3">
            {/* Red logo container */}
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#121522] border border-[#232B3E] shadow-[0_0_20px_rgba(239,68,68,0.25)] p-2">
              <AikoHamsterLogo size={36} color="#FFFFFF" accentColor={theme.primary} showText={false} glow />
              {/* Live status dot */}
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-[#0D0D14]"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-['Syne']">
                  Aiko<span style={{ color: theme.primary }}>Tools</span>
                </h1>
                <div className="rounded-lg border border-red-500/30 bg-red-950/40 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-red-400 font-mono">
                  PRO STUDIO <span className="opacity-70">v3.1</span>
                </div>
              </div>
              <p className="text-xs text-stone-400 font-medium mt-0.5">
                {t('hero.eyebrow', 'Tu suite multimedia, 100% libre y sin datos')}
              </p>
            </div>
          </div>
        </div>

        {/* Subtools Horizontal Quick Scroll Bar */}
        <SubtoolsBar
          selectedTool={selectedTool}
          onSelectToolById={handleSelectToolById}
        />

        {/* If MP3 to URL Tool is active: seamlessly embedded right inside the AikoTools page */}
        {selectedTool?.id === 'mp3-to-url' ? (
          <div className="space-y-4">
            {/* Integrated Navigation Bar */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#111422] border border-[#1E2538] shadow-md">
              <button
                onClick={handleResetHome}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#141828] border border-[#232B3E] hover:border-red-500/40 text-stone-300 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <ArrowLeft className="h-4 w-4" style={{ color: theme.primary }} />
                <span>{t('workspace.backToTools', '← Volver al Catálogo / Cerrar Herramienta')}</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-medium text-stone-400">
                  Herramienta Activa: <strong className="text-stone-200">Convertidor MP3 a URL</strong>
                </span>
              </div>
            </div>

            {/* Embedded MP3 to URL Converter with AikoTools unified design */}
            <div className="rounded-3xl overflow-hidden border border-[#1E2538] shadow-2xl bg-[#0A0C14]">
              <Mp3ToUrlConverter onClose={handleResetHome} />
            </div>
          </div>
        ) : (
          <>
            {/* Main Hero Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#111422] to-[#0A0C14] border border-[#1E2538] p-5 sm:p-7 shadow-xl">
              {/* Ambient Glows */}
              <div className="pointer-events-none absolute -top-12 -left-12 h-64 w-64 rounded-full bg-red-600/10 blur-3xl"></div>
              <div className="pointer-events-none absolute -bottom-12 -right-12 h-64 w-64 rounded-full bg-rose-600/10 blur-3xl"></div>

              <div className="relative z-10 space-y-4">
                {/* Small eyebrow with red dash */}
                <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider text-red-400 uppercase font-mono">
                  <span className="h-0.5 w-5 bg-red-500 rounded-full"></span>
                  <span>{t('hero.eyebrow', 'TU SUITE MULTIMEDIA, 100% LIBRE Y SIN DATOS')}</span>
                </div>

                {/* Big Title with glowing Logo badge to the right */}
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white font-['Outfit'] leading-[1.1]">
                    {t('hero.title1', 'Hazlo pequeño.')} <br />
                    <span style={{ color: theme.primary }}>{t('hero.title2', 'Sin perder calidad.')}</span>
                  </h2>
                  <div className="shrink-0 h-14 w-14 sm:h-20 sm:w-20 rounded-2xl bg-[#141726] border border-red-500/30 p-2.5 sm:p-3 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.25)]">
                    <AikoHamsterLogo size="100%" color="#FFFFFF" accentColor={theme.primary} showText={false} glow />
                  </div>
                </div>

                {/* Description Paragraph */}
                <p className="text-xs sm:text-sm text-stone-300 max-w-2xl leading-relaxed">
                  {t(
                    'hero.description',
                    'Una suite completa y profesional para optimizar, convertir y editar tus archivos multimedia. Todo el renderizado y compresión ocurre directamente en tu navegador, garantizando máxima velocidad y total privacidad.'
                  )}
                </p>

                {/* 3 Highlighting Feature Boxes */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                  {/* Feature 1 */}
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#141828]/80 border border-[#222A40]">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-950/50 border border-red-500/30 text-red-400">
                      <Flame className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold text-stone-200">
                      {t('hero.bullet1', 'Procesamiento en memoria ultra-rápido')}
                    </span>
                  </div>

                  {/* Feature 2 */}
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#141828]/80 border border-[#222A40]">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold text-stone-200">
                      {t('hero.bullet2', '100% privado y sin límites de uso')}
                    </span>
                  </div>

                  {/* Feature 3 */}
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#141828]/80 border border-[#222A40]">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-950/50 border border-amber-500/30 text-amber-400">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold text-stone-200">
                      {t('hero.bullet3', 'IA Generativa, Eliminar Fondo, Filtros y GIF')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Upload Zone / Dropzone */}
            <UploadZone
              onFileSelected={handleFileSelected}
              onFilesSelected={handleBatchFilesSelected}
              selectedTool={selectedTool}
            />

            {/* Category Navigation Pills */}
            <div className="space-y-3 pt-2">
              <CategoryNav
                activeCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />

              {/* Full Tools Grid */}
              <ToolGrid
                tools={filteredTools}
                selectedTool={selectedTool}
                onSelectTool={handleSelectTool}
              />
            </div>

            {/* Local Processing Feature Bar */}
            <FeatureBar />
          </>
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Floating Modals & Drawers */}
      <LeftToolsDrawer
        isOpen={isToolsDrawerOpen}
        onClose={() => setIsToolsDrawerOpen(false)}
        tools={TOOLS}
        selectedTool={selectedTool}
        onSelectTool={handleSelectTool}
      />

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

      <AiAssistantModal
        isOpen={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
        onSelectResultForWorkspace={handleSelectResultForWorkspace}
      />

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}

export default App;
