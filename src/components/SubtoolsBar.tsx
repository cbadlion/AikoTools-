import React from 'react';
import {
  Compass,
  Sparkles,
  Eraser,
  Pipette,
  RefreshCw,
  Wand2,
  Palette,
  ShieldAlert,
  Clapperboard,
  Film,
  Radio,
  Layers,
  Search
} from 'lucide-react';
import { SUBTOOLS_NAV_ITEMS } from '../data/tools';
import { ToolDefinition } from '../types';
import { useTheme } from '../context/ThemeContext';

interface SubtoolsBarProps {
  selectedTool: ToolDefinition | null;
  onSelectToolById: (toolId: string) => void;
}

export const SubtoolsBar: React.FC<SubtoolsBarProps> = ({
  selectedTool,
  onSelectToolById
}) => {
  const { theme } = useTheme();

  const getSubtoolIcon = (itemId: string) => {
    const iconClass = "h-3.5 w-3.5 shrink-0";
    switch (itemId) {
      case 'ai-image-gen': return <Sparkles className={iconClass} />;
      case 'bg-remover': return <Eraser className={iconClass} />;
      case 'recolor': return <Pipette className={iconClass} />;
      case 'converter': return <RefreshCw className={iconClass} />;
      case 'effects': return <Wand2 className={iconClass} />;
      case 'palette': return <Palette className={iconClass} />;
      case 'watermark': return <ShieldAlert className={iconClass} />;
      case 'gif-maker': return <Clapperboard className={iconClass} />;
      case 'video-to-gif': return <Film className={iconClass} />;
      case 'screen-recorder': return <Radio className={iconClass} />;
      case 'gif-to-mp4': return <Film className={iconClass} />;
      case 'webp-to-gif': return <Layers className={iconClass} />;
      case 'svg-to-gif': return <Compass className={iconClass} />;
      case 'gif-analyzer': return <Search className={iconClass} />;
      default: return <Sparkles className={iconClass} />;
    }
  };

  return (
    <div className="w-full bg-[#10121A] border border-[#202534] rounded-xl p-1.5 shadow-sm font-['Outfit']">
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5 px-0.5">
        {/* Navigation Indicator Icon */}
        <div
          style={{ backgroundColor: theme.primary, boxShadow: `0 0 10px ${theme.primaryGlow}` }}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white"
        >
          <Compass className="h-3.5 w-3.5" />
        </div>

        {SUBTOOLS_NAV_ITEMS.map((item) => {
          const isActive = selectedTool?.id === item.targetToolId;
          const itemColor = item.color || theme.primary;

          return (
            <button
              key={item.id}
              onClick={() => onSelectToolById(item.targetToolId)}
              style={{
                borderColor: isActive ? itemColor : undefined,
                boxShadow: isActive ? `0 0 12px ${itemColor}40` : undefined,
                color: isActive ? '#FFFFFF' : undefined,
                backgroundColor: isActive ? `${itemColor}25` : undefined
              }}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'border font-bold'
                  : 'bg-[#141722] text-stone-300 hover:text-white hover:bg-[#1A1F2E] border border-[#222736]'
              }`}
            >
              <span style={{ color: isActive ? itemColor : undefined }}>
                {getSubtoolIcon(item.id)}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
