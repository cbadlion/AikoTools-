import React, { useState, useMemo } from 'react';
import { ToolDefinition, ToolCategory } from '../types';
import { CATEGORY_PILLS } from '../data/tools';
import {
  Search,
  X,
  RotateCcw,
  Film,
  Image as ImageIcon,
  Layers,
  Gauge,
  Wand2,
  Scissors,
  Type,
  Sparkles,
  ArrowRight,
  Music,
  Crop,
  FileImage,
  Eye,
  Compass,
  Video,
  Eraser,
  RefreshCw,
  ShieldAlert,
  Palette,
  Pipette,
  Sliders,
  Zap,
  Stamp,
  FileCode,
  Clapperboard,
  Radio,
  Volume2,
  Split
} from 'lucide-react';
import { AikoHamsterLogo } from './AikoHamsterLogo';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface LeftToolsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tools: ToolDefinition[];
  selectedTool: ToolDefinition | null;
  onSelectTool: (tool: ToolDefinition) => void;
}

export const LeftToolsDrawer: React.FC<LeftToolsDrawerProps> = ({
  isOpen,
  onClose,
  tools,
  selectedTool,
  onSelectTool
}) => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory>('all');

  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      const matchesCategory =
        selectedCategory === 'all' || tool.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesCategory;

      const translatedName = t(`tool.${tool.id}.name`, tool.name).toLowerCase();
      const translatedSub = t(`tool.${tool.id}.subtitle`, tool.subtitle).toLowerCase();
      const translatedCat = t(`cat.${tool.category}`, tool.category).toLowerCase();

      const matchesSearch =
        tool.name.toLowerCase().includes(q) ||
        tool.subtitle.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.category.toLowerCase().includes(q) ||
        translatedName.includes(q) ||
        translatedSub.includes(q) ||
        translatedCat.includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [tools, selectedCategory, searchQuery, t]);

  const getToolIcon = (iconName: string, toolId?: string) => {
    const iconClass = 'h-4 w-4 stroke-[2.2]';

    if (toolId === 'ai-image-generator') return <Sparkles className={iconClass} />;
    if (toolId === 'bg-remover') return <Eraser className={iconClass} />;
    if (toolId === 'recolor-tools') return <Pipette className={iconClass} />;
    if (toolId === 'converter-tools') return <RefreshCw className={iconClass} />;
    if (toolId === 'effects-tools') return <Wand2 className={iconClass} />;
    if (toolId === 'gif-maker') return <Clapperboard className={iconClass} />;
    if (toolId === 'video-tools') return <Film className={iconClass} />;
    if (toolId === 'audio-tools') return <Music className={iconClass} />;
    if (toolId === 'transform-tools') return <Crop className={iconClass} />;
    if (toolId === 'optimize-tools') return <Gauge className={iconClass} />;
    if (toolId === 'watermark-tools') return <ShieldAlert className={iconClass} />;
    if (toolId === 'palette-tools') return <Palette className={iconClass} />;
    if (toolId === 'split-tools') return <Scissors className={iconClass} />;
    if (toolId === 'text-tools') return <Type className={iconClass} />;
    if (toolId === 'webp-tools') return <Layers className={iconClass} />;
    if (toolId === 'svg-tools') return <Compass className={iconClass} />;
    if (toolId === 'analyzer-tools') return <Search className={iconClass} />;
    if (toolId === 'apng-tools') return <FileImage className={iconClass} />;
    if (toolId === 'avif-tools') return <Eye className={iconClass} />;
    if (toolId === 'jxl-tools') return <FileCode className={iconClass} />;
    if (toolId === 'cut-half-tools') return <Split className={iconClass} />;
    if (toolId === 'enhance-tools') return <Sparkles className={iconClass} />;
    if (toolId === 'smooth-tools') return <Zap className={iconClass} />;
    if (toolId === 'screen-recorder') return <Radio className={iconClass} />;
    if (toolId === 'batch-webp') return <Layers className={iconClass} />;

    switch (iconName) {
      case 'Split': return <Split className={iconClass} />;
      case 'Eraser': return <Eraser className={iconClass} />;
      case 'Pipette': return <Pipette className={iconClass} />;
      case 'RefreshCw': return <RefreshCw className={iconClass} />;
      case 'ShieldAlert': return <ShieldAlert className={iconClass} />;
      case 'Palette': return <Palette className={iconClass} />;
      case 'RotateCcw': return <RotateCcw className={iconClass} />;
      case 'Film': return <Film className={iconClass} />;
      case 'Image': return <ImageIcon className={iconClass} />;
      case 'Layers': return <Layers className={iconClass} />;
      case 'Gauge': return <Gauge className={iconClass} />;
      case 'Wand2': return <Wand2 className={iconClass} />;
      case 'Scissors': return <Scissors className={iconClass} />;
      case 'Type': return <Type className={iconClass} />;
      case 'Music': return <Music className={iconClass} />;
      case 'Crop': return <Crop className={iconClass} />;
      case 'FileImage': return <FileImage className={iconClass} />;
      case 'Eye': return <Eye className={iconClass} />;
      case 'Compass': return <Compass className={iconClass} />;
      case 'Video': return <Video className={iconClass} />;
      case 'Search': return <Search className={iconClass} />;
      case 'Sparkles': return <Sparkles className={iconClass} />;
      default: return <Sparkles className={iconClass} />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex font-['Outfit']">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Slide-out Drawer Panel on Left */}
      <aside
        id="left-tools-drawer"
        className="relative z-10 flex h-full w-[88vw] max-w-sm flex-col bg-[#0E111C] border-r border-[#20273A] shadow-2xl shadow-black/80 animate-slide-right text-[#F3F4F6]"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-[#1E253A] px-4 py-3.5 bg-[#121626]">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#181D30] border border-[#2B3550] p-1 shrink-0 flex items-center justify-center">
              <AikoHamsterLogo size={28} color="#FFFFFF" accentColor={theme.primary} showText={false} glow />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                {t('drawer.toolsAiko', 'Herramientas Aiko')}
              </h2>
              <p className="text-[10px] text-stone-400 font-mono">
                {t('drawer.localDevice', '100% en tu dispositivo')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            id="btn-close-tools-drawer"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#181D30] text-stone-400 hover:text-white hover:bg-[#252E4C] transition-colors cursor-pointer"
            title={t('drawer.close', 'Cerrar')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search Bar Input */}
        <div className="p-3.5 border-b border-[#1E253A] bg-[#0E111C]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
            <input
              type="text"
              id="drawer-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('drawer.searchPlaceholder', 'Buscar herramienta por nombre...')}
              className="w-full rounded-xl bg-[#151929] border border-[#263048] pl-9 pr-8 py-2 text-xs text-white placeholder:text-stone-500 focus:border-stone-400 focus:outline-none shadow-xs"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Category Filters inside Drawer */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2.5">
            {CATEGORY_PILLS.map((pill) => {
              const active = selectedCategory === pill.id;
              return (
                <button
                  key={pill.id}
                  onClick={() => setSelectedCategory(pill.id)}
                  style={{
                    backgroundColor: active ? pill.accentColor : undefined,
                    borderColor: active ? pill.accentColor : undefined,
                    boxShadow: active ? `0 0 10px ${pill.accentColor}40` : undefined
                  }}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? 'text-white border font-bold shadow-xs'
                      : 'bg-[#151929] border border-[#263048] text-stone-400 hover:text-white hover:bg-[#1D2338]'
                  }`}
                >
                  {t(`cat.${pill.id}`, pill.label)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tools List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredTools.length === 0 ? (
            <div className="py-12 text-center text-stone-400 space-y-2">
              <Search className="h-8 w-8 mx-auto text-stone-500 opacity-50" />
              <p className="text-xs font-bold text-stone-200">
                {t('drawer.noResults', 'No se encontraron herramientas')}
              </p>
              <p className="text-[11px] text-stone-400">
                {t('tools.tryAnother', 'Intenta buscar por "Fondo", "Conversor", "Filtros", "Video" o limpia la búsqueda.')}
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="mt-2 text-xs font-bold text-indigo-400 hover:underline cursor-pointer"
              >
                {t('tools.clearSearch', 'Limpiar búsqueda')}
              </button>
            </div>
          ) : (
            filteredTools.map((tool) => {
              const isSelected = selectedTool?.id === tool.id;
              const hex = tool.accentHex || '#6366F1';
              const gradient = tool.gradient || 'from-indigo-500 to-purple-600';

              return (
                <button
                  key={tool.id}
                  id={`drawer-tool-item-${tool.id}`}
                  onClick={() => {
                    onSelectTool(tool);
                    onClose();
                  }}
                  style={{
                    borderColor: isSelected ? hex : undefined,
                    backgroundColor: isSelected ? `${hex}15` : undefined,
                    boxShadow: isSelected ? `0 0 12px ${hex}25` : undefined
                  }}
                  className={`w-full flex items-center justify-between gap-3 p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                    isSelected
                      ? 'border'
                      : 'bg-[#131625] border-[#21283C] text-stone-200 hover:border-stone-500 hover:bg-[#181D2E]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                        isSelected
                          ? `bg-gradient-to-br ${gradient} border-white/20 text-white shadow-md`
                          : `${tool.iconBg || 'bg-indigo-950/40 text-indigo-400 border-indigo-500/20'}`
                      }`}
                    >
                      {getToolIcon(tool.iconName, tool.id)}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span
                          style={{ color: isSelected ? hex : undefined }}
                          className={`text-xs font-bold truncate ${isSelected ? '' : 'text-white'}`}
                        >
                          {t(`tool.${tool.id}.name`, tool.name)}
                        </span>
                        <span
                          style={{
                            color: isSelected ? hex : undefined,
                            borderColor: isSelected ? `${hex}40` : undefined,
                            backgroundColor: isSelected ? `${hex}20` : undefined
                          }}
                          className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${
                            isSelected ? '' : 'text-stone-400 bg-[#161B2B] border-[#252D42]'
                          }`}
                        >
                          {t(`cat.${tool.category}`, tool.category)}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400 truncate mt-0.5">
                        {t(`tool.${tool.id}.subtitle`, tool.subtitle)}
                      </p>
                    </div>
                  </div>

                  <ArrowRight
                    style={{ color: isSelected ? hex : undefined }}
                    className={`h-3.5 w-3.5 shrink-0 ${
                      isSelected ? '' : 'text-stone-500'
                    }`}
                  />
                </button>
              );
            })
          )}
        </div>

        {/* Drawer Footer Info */}
        <div className="border-t border-[#1E253A] p-3 bg-[#121626] text-center">
          <p className="text-[10px] font-mono text-stone-400 uppercase tracking-wider font-semibold">
            {tools.length} {t('drawer.toolsAiko', 'HERRAMIENTAS')} · {t('upload.privateNotice', '100% LOCAL Y PRIVADO')}
          </p>
        </div>
      </aside>
    </div>
  );
};
