import React from 'react';
import { ToolDefinition } from '../types';
import {
  RotateCcw,
  Film,
  Image as ImageIcon,
  Layers,
  Gauge,
  Wand2,
  Scissors,
  Type,
  Sparkles,
  Music,
  Crop,
  FileImage,
  Eye,
  Compass,
  Video,
  Search,
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
  Bot,
  ArrowUpRight,
  Split
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface ToolGridProps {
  tools: ToolDefinition[];
  selectedTool: ToolDefinition | null;
  onSelectTool: (tool: ToolDefinition) => void;
}

export const ToolGrid: React.FC<ToolGridProps> = ({
  tools,
  selectedTool,
  onSelectTool
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const getToolIcon = (iconName: string, toolId?: string) => {
    const iconClass = "h-5 w-5 stroke-[2.2]";
    
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
      case 'Zap': return <Zap className={iconClass} />;
      default: return <Sparkles className={iconClass} />;
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4 font-['Outfit']">
      {tools.map((tool) => {
        const isSelected = selectedTool?.id === tool.id;
        const hex = tool.accentHex || theme.primary;
        const gradient = tool.gradient || 'from-red-600 to-rose-600';

        return (
          <div
            key={tool.id}
            id={`tool-card-${tool.id}`}
            onClick={() => onSelectTool(tool)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectTool(tool);
              }
            }}
            style={{
              borderColor: isSelected ? hex : undefined,
              boxShadow: isSelected ? `0 0 25px ${hex}30, inset 0 1px 0 rgba(255,255,255,0.1)` : undefined
            }}
            className={`group relative flex flex-col justify-between rounded-2xl p-4 sm:p-5 border transition-all duration-200 cursor-pointer select-none text-left min-h-[160px] ${
              isSelected
                ? 'bg-[#150D10] ring-1 ring-red-500/50 shadow-xl scale-[1.01]'
                : 'bg-[#11131A] hover:bg-[#161922] border-[#222736] hover:border-[#38425A] shadow-md hover:-translate-y-0.5'
            }`}
          >
            <div>
              {/* Card Header: Icon + Category Badge + Arrow indicator */}
              <div className="flex items-center justify-between gap-1.5 mb-3.5">
                <div
                  style={{
                    boxShadow: isSelected ? `0 0 16px ${hex}50` : undefined
                  }}
                  className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-all duration-200 group-hover:scale-105 ${
                    isSelected
                      ? `bg-gradient-to-br ${gradient} border-white/20 text-white shadow-lg`
                      : `${tool.iconBg || 'bg-red-950/40 text-red-400 border-red-500/20'} group-hover:text-white group-hover:bg-gradient-to-br group-hover:${gradient} group-hover:border-white/20`
                  }`}
                >
                  {getToolIcon(tool.iconName, tool.id)}
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    style={{
                      color: isSelected ? hex : undefined,
                      borderColor: isSelected ? `${hex}50` : undefined,
                      backgroundColor: isSelected ? `${hex}15` : undefined
                    }}
                    className={`text-[10px] font-bold tracking-wider uppercase font-mono px-2 py-0.5 rounded-md border ${
                      isSelected
                        ? 'shadow-sm'
                        : 'text-stone-400 bg-[#161B28] border-[#242C3E]'
                    }`}
                  >
                    {t(`cat.${tool.category}`, tool.category)}
                  </span>
                  
                  <div className={`p-1 rounded-lg transition-colors ${isSelected ? 'text-white' : 'text-stone-600 group-hover:text-stone-300'}`}>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>

              {/* Title & Subtitle */}
              <h3
                style={{ color: isSelected ? hex : undefined }}
                className={`text-sm sm:text-[15px] font-bold transition-colors leading-snug ${
                  isSelected ? 'font-black' : 'text-white group-hover:text-stone-100'
                }`}
              >
                {t(`tool.${tool.id}.name`, tool.name)}
              </h3>
              <p className="mt-1 text-xs text-stone-400 leading-relaxed line-clamp-2">
                {t(`tool.${tool.id}.subtitle`, tool.subtitle)}
              </p>
            </div>

            {/* Subtool Tags / Quick features */}
            {tool.subtools && tool.subtools.length > 0 && (
              <div className="mt-3.5 pt-2.5 border-t border-[#1C202E] flex flex-wrap items-center gap-1">
                {tool.subtools.slice(0, 2).map((sub, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-[#161924] text-stone-300 border border-[#262C3E] truncate max-w-[130px] font-medium"
                  >
                    {sub}
                  </span>
                ))}
                {tool.subtools.length > 2 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#161924] text-stone-400 font-mono border border-[#262C3E]">
                    +{tool.subtools.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
