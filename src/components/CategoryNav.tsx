import React from 'react';
import {
  LayoutGrid,
  Sparkles,
  Eraser,
  Pipette,
  RefreshCw,
  Wand2,
  Palette,
  ShieldAlert,
  Clapperboard,
  Film,
  Music,
  Crop,
  Gauge,
  Scissors,
  Type,
  Layers,
  Compass,
  Search
} from 'lucide-react';
import { CATEGORY_PILLS } from '../data/tools';
import { ToolCategory } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface CategoryNavProps {
  activeCategory: ToolCategory;
  onSelectCategory: (category: ToolCategory) => void;
}

export const CategoryNav: React.FC<CategoryNavProps> = ({
  activeCategory,
  onSelectCategory
}) => {
  const { t } = useLanguage();

  const getCategoryIcon = (catId: ToolCategory) => {
    const iconClass = "h-3.5 w-3.5 shrink-0";
    switch (catId) {
      case 'all': return <LayoutGrid className={iconClass} />;
      case 'ai-generator': return <Sparkles className={iconClass} />;
      case 'bg-remover': return <Eraser className={iconClass} />;
      case 'recolor': return <Pipette className={iconClass} />;
      case 'converter': return <RefreshCw className={iconClass} />;
      case 'effects': return <Wand2 className={iconClass} />;
      case 'palette': return <Palette className={iconClass} />;
      case 'watermark': return <ShieldAlert className={iconClass} />;
      case 'gif-maker': return <Clapperboard className={iconClass} />;
      case 'video': return <Film className={iconClass} />;
      case 'audio': return <Music className={iconClass} />;
      case 'transform': return <Crop className={iconClass} />;
      case 'optimize': return <Gauge className={iconClass} />;
      case 'split': return <Scissors className={iconClass} />;
      case 'text': return <Type className={iconClass} />;
      case 'webp': return <Layers className={iconClass} />;
      case 'svg': return <Compass className={iconClass} />;
      case 'analyzer': return <Search className={iconClass} />;
      default: return <Sparkles className={iconClass} />;
    }
  };

  return (
    <div className="w-full overflow-x-auto no-scrollbar py-1">
      <div className="flex items-center gap-2 min-w-max px-0.5">
        {CATEGORY_PILLS.map((pill) => {
          const isActive = activeCategory === pill.id;
          const translatedLabel = t(`cat.${pill.id}`, pill.label);

          return (
            <button
              key={pill.id}
              id={`cat-pill-${pill.id}`}
              onClick={() => onSelectCategory(pill.id)}
              style={{
                boxShadow: isActive ? `0 0 14px ${pill.accentColor}50` : undefined,
                borderColor: isActive ? pill.accentColor : undefined
              }}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-all duration-150 focus:outline-none select-none min-h-[38px] cursor-pointer ${
                isActive
                  ? `bg-gradient-to-r ${pill.activeGradient} text-white border font-bold shadow-md`
                  : 'bg-[#141724] border border-[#242A3E] text-stone-300 hover:text-white hover:border-stone-500 hover:bg-[#1A1F30]'
              }`}
            >
              {getCategoryIcon(pill.id)}
              <span>{translatedLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
