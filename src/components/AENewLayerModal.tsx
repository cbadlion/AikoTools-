import React, { useState, useRef } from 'react';
import { AELayer, LayerType, ShapeType, Composition } from '../types/ae';
import {
  X,
  Type,
  Square,
  Sliders,
  Sparkles,
  Palette,
  Plus,
  Star,
  Circle,
  Triangle,
  Image as ImageIcon,
  Upload,
  Globe,
  Check,
} from 'lucide-react';

interface AENewLayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  composition: Composition;
  onAddLayer: (newLayer: AELayer) => void;
}

const SAMPLE_IMAGES = [
  {
    id: 'cyberpunk',
    name: 'Ciudad Cyberpunk Neón',
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'hologram',
    name: 'Esfera Neón Holográfica',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'synthwave',
    name: 'Horizonte Synthwave 80s',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'anime',
    name: 'Estética Anime Cyber',
    url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'galaxy',
    name: 'Nebulosa Cósmica',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'liquid',
    name: 'Líquido Abstracto Neón',
    url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=800&auto=format&fit=crop',
  },
];

export const AENewLayerModal: React.FC<AENewLayerModalProps> = ({
  isOpen,
  onClose,
  composition,
  onAddLayer,
}) => {
  const [selectedType, setSelectedType] = useState<LayerType>('image');
  const [name, setName] = useState('');
  const [textContent, setTextContent] = useState('NUEVO TÍTULO');
  const [shapeType, setShapeType] = useState<ShapeType>('rect');
  const [color, setColor] = useState('#9D95FF');

  // Image State
  const [imageUrl, setImageUrl] = useState(SAMPLE_IMAGES[0].url);
  const [imageName, setImageName] = useState(SAMPLE_IMAGES[0].name);
  const [imageDims, setImageDims] = useState<{ width: number; height: number }>({ width: 600, height: 400 });
  const [imageInputMode, setImageInputMode] = useState<'presets' | 'upload' | 'url'>('presets');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (result) {
        const img = new Image();
        img.onload = () => {
          setImageUrl(result);
          setImageName(file.name.replace(/\.[^.]+$/, ''));
          setImageDims({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.src = result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = (preset: typeof SAMPLE_IMAGES[0]) => {
    setImageUrl(preset.url);
    setImageName(preset.name);
    const img = new Image();
    img.onload = () => {
      setImageDims({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = preset.url;
  };

  const handleCreate = () => {
    const id = `layer_${Date.now()}`;
    const cx = composition.width / 2;
    const cy = composition.height / 2;

    const baseTransform = {
      position: {
        value: [cx, cy, 0] as [number, number, number],
        isAnimated: false,
        keyframes: [],
      },
      scale: {
        value: [100, 100] as [number, number],
        isAnimated: false,
        keyframes: [],
      },
      scaleLocked: true,
      rotation: {
        value: 0,
        isAnimated: false,
        keyframes: [],
      },
      opacity: {
        value: 100,
        isAnimated: false,
        keyframes: [],
      },
      anchorPoint: {
        value: [0, 0] as [number, number],
        isAnimated: false,
        keyframes: [],
      },
    };

    let newLayer: AELayer;

    switch (selectedType) {
      case 'image':
        newLayer = {
          id,
          name: name || imageName || 'Capa de Imagen',
          type: 'image',
          colorLabel: '#06B6D4',
          visible: true,
          locked: false,
          solo: false,
          motionBlur: true,
          is3D: false,
          inFrame: 0,
          outFrame: composition.durationFrames,
          blendMode: 'normal',
          transform: baseTransform,
          mediaUrl: imageUrl,
          imageData: {
            url: imageUrl,
            naturalWidth: imageDims.width,
            naturalHeight: imageDims.height,
            fit: 'contain',
          },
          effects: [],
        };
        break;

      case 'text':
        newLayer = {
          id,
          name: name || textContent,
          type: 'text',
          colorLabel: '#9D95FF',
          visible: true,
          locked: false,
          solo: false,
          motionBlur: true,
          is3D: false,
          inFrame: 0,
          outFrame: composition.durationFrames,
          blendMode: 'normal',
          transform: baseTransform,
          textData: {
            text: textContent || 'NUEVO TEXTO',
            fontSize: 48,
            fontFamily: 'Plus Jakarta Sans',
            color: color || '#FFFFFF',
            letterSpacing: 4,
            lineHeight: 1.2,
            align: 'center',
            isBold: true,
            isItalic: false,
            shadowBlur: 15,
            shadowColor: color || '#9D95FF',
          },
          effects: [],
        };
        break;

      case 'shape':
        newLayer = {
          id,
          name: name || `Forma: ${shapeType.toUpperCase()}`,
          type: 'shape',
          colorLabel: '#38BDF8',
          visible: true,
          locked: false,
          solo: false,
          motionBlur: true,
          is3D: false,
          inFrame: 0,
          outFrame: composition.durationFrames,
          blendMode: 'normal',
          transform: baseTransform,
          shapeData: {
            shapeType,
            fillColor: color,
            strokeColor: '#FFFFFF',
            strokeWidth: 0,
            cornerRadius: 16,
            starPoints: 5,
            width: 200,
            height: 200,
          },
          effects: [],
        };
        break;

      case 'solid':
        newLayer = {
          id,
          name: name || 'Sólido de Composición',
          type: 'solid',
          colorLabel: '#6366F1',
          visible: true,
          locked: false,
          solo: false,
          motionBlur: false,
          is3D: false,
          inFrame: 0,
          outFrame: composition.durationFrames,
          blendMode: 'normal',
          transform: baseTransform,
          solidColor: color,
          effects: [],
        };
        break;

      case 'null':
        newLayer = {
          id,
          name: name || 'Objeto Nulo 1',
          type: 'null',
          colorLabel: '#EF4444',
          visible: true,
          locked: false,
          solo: false,
          motionBlur: false,
          is3D: false,
          inFrame: 0,
          outFrame: composition.durationFrames,
          blendMode: 'normal',
          transform: baseTransform,
          effects: [],
        };
        break;

      case 'adjustment':
        newLayer = {
          id,
          name: name || 'Capa de Ajuste 1',
          type: 'adjustment',
          colorLabel: '#F59E0B',
          visible: true,
          locked: false,
          solo: false,
          motionBlur: false,
          is3D: false,
          inFrame: 0,
          outFrame: composition.durationFrames,
          blendMode: 'normal',
          transform: baseTransform,
          effects: [
            {
              id: `eff_${Date.now()}`,
              type: 'vignette',
              name: 'Cinematic Vignette',
              enabled: true,
              params: { amount: 0.65, midpoint: 40 },
            },
          ],
        };
        break;

      default:
        return;
    }

    onAddLayer(newLayer);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-fade-in select-none">
      <div className="bg-[#151520] border border-[#2B2B3E] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#252536] bg-[#12121A]">
          <div className="flex items-center gap-2">
            <Plus size={18} className="text-[#38BDF8]" />
            <span className="font-bold text-sm text-zinc-100">Crear Nueva Capa</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-[#252538]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto no-scrollbar">
          {/* Layer Type Grid */}
          <div>
            <label className="text-xs font-semibold text-zinc-400 block mb-2">
              Tipo de Capa After Effects:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { type: 'image' as LayerType, label: 'Imagen / Foto', icon: <ImageIcon size={16} className="text-cyan-400" /> },
                { type: 'text' as LayerType, label: 'Texto', icon: <Type size={16} className="text-purple-400" /> },
                { type: 'shape' as LayerType, label: 'Forma Geométrica', icon: <Square size={16} className="text-sky-400" /> },
                { type: 'solid' as LayerType, label: 'Sólido de Color', icon: <Palette size={16} className="text-indigo-400" /> },
                { type: 'null' as LayerType, label: 'Objeto Nulo', icon: <Sliders size={16} className="text-red-400" /> },
                { type: 'adjustment' as LayerType, label: 'Capa de Ajuste', icon: <Sparkles size={16} className="text-amber-400" /> },
              ].map((item) => (
                <button
                  key={item.type}
                  onClick={() => setSelectedType(item.type)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    selectedType === item.type
                      ? 'bg-[#2E284A] border-[#9D95FF] text-[#9D95FF] shadow-md shadow-indigo-950/40'
                      : 'bg-[#1C1C28] border-[#2A2A3C] text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Conditional Options: IMAGE */}
          {selectedType === 'image' && (
            <div className="space-y-3 bg-[#13131C] p-3 rounded-xl border border-[#262638]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300">Origen de la Imagen:</span>
                <div className="flex items-center gap-1 bg-[#1C1C28] p-0.5 rounded-lg border border-[#2B2B3C]">
                  <button
                    type="button"
                    onClick={() => setImageInputMode('presets')}
                    className={`px-2 py-1 text-[11px] font-bold rounded ${
                      imageInputMode === 'presets' ? 'bg-[#9D95FF] text-[#0E0E14]' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Galería Neón
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageInputMode('upload')}
                    className={`px-2 py-1 text-[11px] font-bold rounded flex items-center gap-1 ${
                      imageInputMode === 'upload' ? 'bg-[#9D95FF] text-[#0E0E14]' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Upload size={12} />
                    <span>Subir</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageInputMode('url')}
                    className={`px-2 py-1 text-[11px] font-bold rounded flex items-center gap-1 ${
                      imageInputMode === 'url' ? 'bg-[#9D95FF] text-[#0E0E14]' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Globe size={12} />
                    <span>URL</span>
                  </button>
                </div>
              </div>

              {/* Mode: Presets */}
              {imageInputMode === 'presets' && (
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {SAMPLE_IMAGES.map((preset) => (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      className={`relative rounded-lg overflow-hidden border cursor-pointer group aspect-video transition-all ${
                        imageUrl === preset.url
                          ? 'border-[#9D95FF] ring-2 ring-[#9D95FF]/50 scale-[1.02]'
                          : 'border-[#2D2D40] opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1">
                        <span className="text-[9px] font-bold text-white truncate w-full">
                          {preset.name}
                        </span>
                      </div>
                      {imageUrl === preset.url && (
                        <div className="absolute top-1 right-1 bg-[#9D95FF] text-[#0E0E14] rounded-full p-0.5">
                          <Check size={10} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Mode: Upload */}
              {imageInputMode === 'upload' && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#3D3D58] hover:border-[#9D95FF] bg-[#1A1A28] rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors text-center"
                >
                  <Upload size={24} className="text-[#9D95FF] mb-2" />
                  <span className="text-xs font-bold text-zinc-200">
                    Toca para seleccionar una imagen
                  </span>
                  <span className="text-[10px] text-zinc-400 mt-0.5">
                    Soporta PNG, JPG, WebP, SVG y GIF
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              )}

              {/* Mode: URL */}
              {imageInputMode === 'url' && (
                <div className="space-y-1.5">
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://ejemplo.com/mi-imagen.png"
                    className="w-full bg-[#1C1C28] border border-[#2E2E44] px-3 py-2 rounded-lg text-xs text-zinc-100 font-mono focus:outline-none focus:border-[#9D95FF]"
                  />
                  <span className="text-[10px] text-zinc-500 block">
                    Pega cualquier enlace directo a imagen (HTTPS).
                  </span>
                </div>
              )}

              {/* Preview banner */}
              {imageUrl && (
                <div className="flex items-center gap-3 p-2 rounded-lg bg-[#181826] border border-[#2A2A3E]">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-14 h-12 object-cover rounded border border-zinc-700 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-zinc-200 block truncate">
                      {imageName || 'Imagen Seleccionada'}
                    </span>
                    <span className="text-[10px] text-cyan-400 font-mono">
                      Resolución: {imageDims.width} × {imageDims.height} px
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Conditional Options: TEXT */}
          {selectedType === 'text' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 block">Contenido del Texto</label>
              <input
                type="text"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Escribe tu texto..."
                className="w-full bg-[#1C1C28] border border-[#2E2E44] px-3 py-2 rounded-lg text-sm text-zinc-100 font-semibold focus:outline-none focus:border-[#9D95FF]"
              />
            </div>
          )}

          {/* Conditional Options: SHAPE */}
          {selectedType === 'shape' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 block">Forma</label>
              <div className="flex items-center gap-2">
                {[
                  { id: 'rect' as ShapeType, label: 'Rectángulo', icon: <Square size={14} /> },
                  { id: 'circle' as ShapeType, label: 'Círculo', icon: <Circle size={14} /> },
                  { id: 'star' as ShapeType, label: 'Estrella', icon: <Star size={14} /> },
                  { id: 'triangle' as ShapeType, label: 'Triángulo', icon: <Triangle size={14} /> },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setShapeType(s.id)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border ${
                      shapeType === s.id
                        ? 'bg-[#9D95FF] border-[#9D95FF] text-[#0E0E14]'
                        : 'bg-[#1C1C28] border-[#2A2A3C] text-zinc-400'
                    }`}
                  >
                    {s.icon}
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color Picker for shapes, text, solid */}
          {['text', 'shape', 'solid'].includes(selectedType) && (
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-zinc-400">Color Principal:</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-8 h-8 rounded border border-zinc-700 bg-transparent cursor-pointer"
                />
                <span className="text-xs font-mono text-zinc-300 uppercase">{color}</span>
              </div>
            </div>
          )}

          {/* Custom Layer Name (Optional) */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-400 block">
              Nombre de la Capa (Opcional):
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={selectedType === 'image' ? (imageName || 'Mi Imagen') : 'Nombre personalizado...'}
              className="w-full bg-[#1C1C28] border border-[#2E2E44] px-3 py-1.5 rounded-lg text-xs text-zinc-200 font-semibold focus:outline-none focus:border-[#9D95FF]"
            />
          </div>

          {/* Action Button */}
          <button
            onClick={handleCreate}
            className="w-full py-2.5 bg-gradient-to-r from-[#9D95FF] to-[#6366F1] hover:from-[#ADA6FF] hover:to-[#7577F8] text-[#0E0E14] font-black text-xs rounded-xl shadow-lg shadow-indigo-950/60 transition-transform active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Plus size={16} />
            <span>Añadir a la Composición</span>
          </button>
        </div>
      </div>
    </div>
  );
};
