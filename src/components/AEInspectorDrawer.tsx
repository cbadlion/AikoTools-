import React, { useState, useRef, useEffect } from 'react';
import { AELayer, InspectorTab, EasingType, BezierHandles, Composition } from '../types/ae';
import {
  Sliders,
  Sparkles,
  TrendingUp,
  Palette,
  Layers,
  Code2,
  Diamond,
  Link2,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Maximize2,
  Type,
  Square,
  RefreshCw,
  Eye,
  Check,
  Image as ImageIcon,
  Upload,
  Globe,
} from 'lucide-react';

interface AEInspectorDrawerProps {
  composition: Composition;
  selectedLayer: AELayer | null;
  currentFrame: number;
  layers: AELayer[];
  onUpdateLayer: (layerId: string, updates: Partial<AELayer>) => void;
  onOpenEffectsModal: () => void;
  onSetFrame: (frame: number) => void;
  className?: string;
}

export const AEInspectorDrawer: React.FC<AEInspectorDrawerProps> = ({
  composition,
  selectedLayer,
  currentFrame,
  layers,
  onUpdateLayer,
  onOpenEffectsModal,
  onSetFrame,
  className,
}) => {
  const [activeTab, setActiveTab] = useState<InspectorTab>('transform');
  const [selectedPropertyKey, setSelectedPropertyKey] = useState<'position' | 'scale' | 'rotation' | 'opacity'>('position');

  if (!selectedLayer) {
    return (
      <div className={className || "h-52 bg-[#12121A] border-t border-[#232332] flex flex-col items-center justify-center text-zinc-500 text-xs select-none p-4"}>
        <Layers size={24} className="mb-2 opacity-40 text-[#9D95FF]" />
        <span className="text-center">Selecciona una capa en la línea de tiempo para editar sus propiedades</span>
      </div>
    );
  }

  // Helper to toggle property animation stopwatch
  const toggleStopwatch = (propName: 'position' | 'scale' | 'rotation' | 'opacity') => {
    const prop = selectedLayer.transform[propName];
    const isNowAnimated = !prop.isAnimated;

    let newKeyframes = [...prop.keyframes];
    if (isNowAnimated && newKeyframes.length === 0) {
      // Add first keyframe at current frame
      newKeyframes.push({
        id: `kf_${Date.now()}`,
        frame: currentFrame,
        value: JSON.parse(JSON.stringify(prop.value)),
        easing: 'easy-ease',
      });
    }

    onUpdateLayer(selectedLayer.id, {
      transform: {
        ...selectedLayer.transform,
        [propName]: {
          ...prop,
          isAnimated: isNowAnimated,
          keyframes: isNowAnimated ? newKeyframes : [],
        },
      },
    });
  };

  // Helper to add/remove keyframe at current playhead for a property
  const toggleKeyframeAtPlayhead = (propName: 'position' | 'scale' | 'rotation' | 'opacity') => {
    const prop = selectedLayer.transform[propName];
    const existingIndex = prop.keyframes.findIndex((k) => k.frame === currentFrame);

    let newKeyframes = [...prop.keyframes];
    if (existingIndex >= 0) {
      // Remove
      newKeyframes.splice(existingIndex, 1);
    } else {
      // Add
      newKeyframes.push({
        id: `kf_${Date.now()}`,
        frame: currentFrame,
        value: JSON.parse(JSON.stringify(prop.value)),
        easing: 'easy-ease',
      });
      newKeyframes.sort((a, b) => a.frame - b.frame);
    }

    onUpdateLayer(selectedLayer.id, {
      transform: {
        ...selectedLayer.transform,
        [propName]: {
          ...prop,
          isAnimated: true,
          keyframes: newKeyframes,
        },
      },
    });
  };

  // Jump to prev / next keyframe
  const jumpKeyframe = (propName: 'position' | 'scale' | 'rotation' | 'opacity', direction: 'prev' | 'next') => {
    const prop = selectedLayer.transform[propName];
    if (!prop.keyframes.length) return;

    const sorted = [...prop.keyframes].sort((a, b) => a.frame - b.frame);
    if (direction === 'prev') {
      const prevs = sorted.filter((k) => k.frame < currentFrame);
      if (prevs.length > 0) {
        onSetFrame(prevs[prevs.length - 1].frame);
      }
    } else {
      const nexts = sorted.filter((k) => k.frame > currentFrame);
      if (nexts.length > 0) {
        onSetFrame(nexts[0].frame);
      }
    }
  };

  // Update property value
  const updateTransformValue = (propName: 'position' | 'scale' | 'rotation' | 'opacity', newValue: any) => {
    const prop = selectedLayer.transform[propName];

    let newKeyframes = [...prop.keyframes];
    if (prop.isAnimated) {
      const existing = newKeyframes.find((k) => k.frame === currentFrame);
      if (existing) {
        existing.value = newValue;
      } else {
        newKeyframes.push({
          id: `kf_${Date.now()}`,
          frame: currentFrame,
          value: newValue,
          easing: 'easy-ease',
        });
        newKeyframes.sort((a, b) => a.frame - b.frame);
      }
    }

    onUpdateLayer(selectedLayer.id, {
      transform: {
        ...selectedLayer.transform,
        [propName]: {
          ...prop,
          value: newValue,
          keyframes: newKeyframes,
        },
      },
    });
  };

  // Apply easing to active keyframe in graph editor
  const applyEasingToActiveKeyframe = (easing: EasingType, bezier?: BezierHandles) => {
    const prop = selectedLayer.transform[selectedPropertyKey];
    if (!prop.keyframes.length) return;

    // Apply to keyframe nearest to current frame or at current frame
    let targetKf = prop.keyframes.find((k) => k.frame === currentFrame);
    if (!targetKf && prop.keyframes.length > 0) {
      targetKf = prop.keyframes[0];
    }

    if (targetKf) {
      const updatedKeyframes = prop.keyframes.map((k) => {
        if (k.id === targetKf!.id) {
          return { ...k, easing, bezier: bezier || k.bezier };
        }
        return k;
      });

      onUpdateLayer(selectedLayer.id, {
        transform: {
          ...selectedLayer.transform,
          [selectedPropertyKey]: {
            ...prop,
            keyframes: updatedKeyframes,
          },
        },
      });
    }
  };

  const tabs: { id: InspectorTab; label: string; icon: React.ReactNode }[] = [
    { id: 'transform', label: 'Transformar', icon: <Sliders size={13} /> },
    { id: 'effects', label: `Efectos (${selectedLayer.effects.length})`, icon: <Sparkles size={13} /> },
    { id: 'graph', label: 'Curvas / Graph', icon: <TrendingUp size={13} /> },
    { id: 'content', label: 'Estilo / Forma', icon: <Palette size={13} /> },
    { id: 'blend', label: 'Fusión y 3D', icon: <Layers size={13} /> },
    { id: 'expression', label: 'Expresiones', icon: <Code2 size={13} /> },
  ];

  return (
    <div className={className || "h-56 sm:h-64 bg-[#14141E] border-t border-[#232332] flex flex-col select-none shrink-0"}>
      {/* 1. Inspector Tab Strip */}
      <div className="flex items-center px-2 py-1 bg-[#101018] border-b border-[#232332] gap-1 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-[#2E284A] text-[#9D95FF] border border-[#9D95FF]/60 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1A1A26]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-3 text-xs text-zinc-200 no-scrollbar">
        {/* TAB: TRANSFORM */}
        {activeTab === 'transform' && (
          <div className="space-y-3 max-w-2xl mx-auto">
            {/* POSITION */}
            <TransformPropertyRow
              label="Posición [X, Y]"
              propName="position"
              prop={selectedLayer.transform.position}
              currentFrame={currentFrame}
              onToggleStopwatch={() => toggleStopwatch('position')}
              onToggleKeyframe={() => toggleKeyframeAtPlayhead('position')}
              onJump={(dir) => jumpKeyframe('position', dir)}
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-[#1E1E2C] px-2 py-1 rounded border border-[#2D2D42]">
                  <span className="text-zinc-500 font-bold">X</span>
                  <input
                    type="number"
                    value={Math.round(selectedLayer.transform.position.value[0])}
                    onChange={(e) =>
                      updateTransformValue('position', [
                        Number(e.target.value),
                        selectedLayer.transform.position.value[1],
                        selectedLayer.transform.position.value[2] || 0,
                      ])
                    }
                    className="w-16 bg-transparent text-right font-mono focus:outline-none text-[#38BDF8]"
                  />
                </div>

                <div className="flex items-center gap-1 bg-[#1E1E2C] px-2 py-1 rounded border border-[#2D2D42]">
                  <span className="text-zinc-500 font-bold">Y</span>
                  <input
                    type="number"
                    value={Math.round(selectedLayer.transform.position.value[1])}
                    onChange={(e) =>
                      updateTransformValue('position', [
                        selectedLayer.transform.position.value[0],
                        Number(e.target.value),
                        selectedLayer.transform.position.value[2] || 0,
                      ])
                    }
                    className="w-16 bg-transparent text-right font-mono focus:outline-none text-[#38BDF8]"
                  />
                </div>
              </div>
            </TransformPropertyRow>

            {/* SCALE */}
            <TransformPropertyRow
              label="Escala [%]"
              propName="scale"
              prop={selectedLayer.transform.scale}
              currentFrame={currentFrame}
              onToggleStopwatch={() => toggleStopwatch('scale')}
              onToggleKeyframe={() => toggleKeyframeAtPlayhead('scale')}
              onJump={(dir) => jumpKeyframe('scale', dir)}
            >
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="300"
                  value={Math.round(selectedLayer.transform.scale.value[0])}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    updateTransformValue('scale', [val, selectedLayer.transform.scaleLocked ? val : selectedLayer.transform.scale.value[1]]);
                  }}
                  className="w-24 sm:w-32 accent-[#9D95FF]"
                />
                <span className="font-mono w-10 text-right text-zinc-300">
                  {Math.round(selectedLayer.transform.scale.value[0])}%
                </span>
                <button
                  onClick={() =>
                    onUpdateLayer(selectedLayer.id, {
                      transform: {
                        ...selectedLayer.transform,
                        scaleLocked: !selectedLayer.transform.scaleLocked,
                      },
                    })
                  }
                  className={`p-1 rounded ${
                    selectedLayer.transform.scaleLocked ? 'text-[#9D95FF] bg-[#2E284A]' : 'text-zinc-500'
                  }`}
                  title="Bloquear proporción"
                >
                  <Link2 size={12} />
                </button>
              </div>
            </TransformPropertyRow>

            {/* ROTATION */}
            <TransformPropertyRow
              label="Rotación [°]"
              propName="rotation"
              prop={selectedLayer.transform.rotation}
              currentFrame={currentFrame}
              onToggleStopwatch={() => toggleStopwatch('rotation')}
              onToggleKeyframe={() => toggleKeyframeAtPlayhead('rotation')}
              onJump={(dir) => jumpKeyframe('rotation', dir)}
            >
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={Math.round(selectedLayer.transform.rotation.value)}
                  onChange={(e) => updateTransformValue('rotation', Number(e.target.value))}
                  className="w-24 sm:w-32 accent-[#38BDF8]"
                />
                <span className="font-mono w-10 text-right text-zinc-300">
                  {Math.round(selectedLayer.transform.rotation.value)}°
                </span>
                <button
                  onClick={() => updateTransformValue('rotation', 0)}
                  className="p-1 text-zinc-500 hover:text-zinc-300"
                  title="Restablecer rotación a 0"
                >
                  <RefreshCw size={11} />
                </button>
              </div>
            </TransformPropertyRow>

            {/* OPACITY */}
            <TransformPropertyRow
              label="Opacidad [%]"
              propName="opacity"
              prop={selectedLayer.transform.opacity}
              currentFrame={currentFrame}
              onToggleStopwatch={() => toggleStopwatch('opacity')}
              onToggleKeyframe={() => toggleKeyframeAtPlayhead('opacity')}
              onJump={(dir) => jumpKeyframe('opacity', dir)}
            >
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(selectedLayer.transform.opacity.value)}
                  onChange={(e) => updateTransformValue('opacity', Number(e.target.value))}
                  className="w-24 sm:w-32 accent-[#10B981]"
                />
                <span className="font-mono w-10 text-right text-zinc-300">
                  {Math.round(selectedLayer.transform.opacity.value)}%
                </span>
              </div>
            </TransformPropertyRow>
          </div>
        )}

        {/* TAB: EFFECTS */}
        {activeTab === 'effects' && (
          <div className="space-y-3 max-w-xl mx-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#232332]">
              <span className="font-bold text-zinc-300 text-xs">Efectos Aplicados</span>
              <button
                onClick={onOpenEffectsModal}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-[#2E284A] text-[#9D95FF] hover:bg-[#3B3360] rounded-md transition-colors"
              >
                <Plus size={13} />
                <span>Añadir Efecto</span>
              </button>
            </div>

            {selectedLayer.effects.length === 0 ? (
              <div className="py-6 text-center text-zinc-500 text-xs">
                No hay efectos en esta capa. Haz clic en "Añadir Efecto" para agregar Deep Glow, Glitch, etc.
              </div>
            ) : (
              selectedLayer.effects.map((eff) => (
                <div
                  key={eff.id}
                  className="bg-[#1B1B26] p-2.5 rounded-lg border border-[#2B2B3C] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const updated = selectedLayer.effects.map((e) =>
                            e.id === eff.id ? { ...e, enabled: !e.enabled } : e
                          );
                          onUpdateLayer(selectedLayer.id, { effects: updated });
                        }}
                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                          eff.enabled ? 'bg-[#9D95FF] border-[#9D95FF] text-[#0E0E14]' : 'border-zinc-600'
                        }`}
                      >
                        {eff.enabled && <Check size={10} strokeWidth={3} />}
                      </button>
                      <span className="font-bold text-zinc-200">{eff.name}</span>
                    </div>

                    <button
                      onClick={() => {
                        const updated = selectedLayer.effects.filter((e) => e.id !== eff.id);
                        onUpdateLayer(selectedLayer.id, { effects: updated });
                      }}
                      className="text-zinc-500 hover:text-red-400 p-1"
                      title="Eliminar Efecto"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Effect sliders and parameter controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                    {Object.entries(eff.params).map(([paramKey, paramVal]) => {
                      // Color parameters
                      if (typeof paramVal === 'string' && (paramKey.toLowerCase().includes('color') || paramVal.startsWith('#') || paramVal.startsWith('rgb'))) {
                        return (
                          <div key={paramKey} className="flex items-center justify-between gap-2 bg-[#14141E] px-2 py-1 rounded">
                            <span className="text-zinc-400 capitalize">{paramKey}</span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="color"
                                value={paramVal.startsWith('#') ? paramVal : '#9D95FF'}
                                onChange={(e) => {
                                  const newParams = { ...eff.params, [paramKey]: e.target.value };
                                  const updated = selectedLayer.effects.map((e) =>
                                    e.id === eff.id ? { ...e, params: newParams } : e
                                  );
                                  onUpdateLayer(selectedLayer.id, { effects: updated });
                                }}
                                className="w-6 h-6 rounded border border-zinc-700 bg-transparent cursor-pointer"
                              />
                              <span className="font-mono text-zinc-300 text-[10px] uppercase">
                                {paramVal.startsWith('#') ? paramVal : 'Color'}
                              </span>
                            </div>
                          </div>
                        );
                      }

                      // Number parameters
                      if (typeof paramVal === 'number') {
                        let min = 0;
                        let max = 100;
                        let step = 1;

                        if (paramKey === 'intensity') {
                          max = 5;
                          step = 0.1;
                        } else if (paramKey === 'amount' && paramVal <= 1) {
                          max = 1;
                          step = 0.05;
                        } else if (paramKey === 'twitchSpeed' || paramKey === 'speed') {
                          max = 10;
                          step = 0.5;
                        } else if (paramKey === 'angle') {
                          max = 360;
                          step = 5;
                        } else if (paramKey === 'radius') {
                          max = 80;
                          step = 1;
                        }

                        return (
                          <div key={paramKey} className="flex items-center justify-between gap-2 bg-[#14141E] px-2 py-1 rounded">
                            <span className="text-zinc-400 capitalize">{paramKey}</span>
                            <input
                              type="range"
                              min={min}
                              max={max}
                              step={step}
                              value={paramVal}
                              onChange={(e) => {
                                const newParams = { ...eff.params, [paramKey]: Number(e.target.value) };
                                const updated = selectedLayer.effects.map((e) =>
                                  e.id === eff.id ? { ...e, params: newParams } : e
                                );
                                onUpdateLayer(selectedLayer.id, { effects: updated });
                              }}
                              className="w-20 accent-[#9D95FF]"
                            />
                            <span className="font-mono text-zinc-300 w-8 text-right">{paramVal}</span>
                          </div>
                        );
                      }

                      // Boolean parameters
                      if (typeof paramVal === 'boolean') {
                        return (
                          <div key={paramKey} className="flex items-center justify-between gap-2 bg-[#14141E] px-2 py-1 rounded">
                            <span className="text-zinc-400 capitalize">{paramKey}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const newParams = { ...eff.params, [paramKey]: !paramVal };
                                const updated = selectedLayer.effects.map((e) =>
                                  e.id === eff.id ? { ...e, params: newParams } : e
                                );
                                onUpdateLayer(selectedLayer.id, { effects: updated });
                              }}
                              className={`w-4 h-4 rounded border flex items-center justify-center ${
                                paramVal ? 'bg-[#9D95FF] border-[#9D95FF] text-[#0E0E14]' : 'border-zinc-600'
                              }`}
                            >
                              {paramVal && <Check size={10} strokeWidth={3} />}
                            </button>
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB: GRAPH EDITOR */}
        {activeTab === 'graph' && (
          <div className="space-y-3 max-w-xl mx-auto">
            {/* Property Selector for Graph */}
            <div className="flex items-center justify-between bg-[#1B1B26] p-1.5 rounded-lg border border-[#2B2B3C]">
              <span className="text-zinc-400 font-semibold text-[11px]">Propiedad en Curva:</span>
              <div className="flex items-center gap-1">
                {(['position', 'scale', 'rotation', 'opacity'] as const).map((pk) => (
                  <button
                    key={pk}
                    onClick={() => setSelectedPropertyKey(pk)}
                    className={`px-2 py-1 text-[10px] font-bold rounded ${
                      selectedPropertyKey === pk ? 'bg-[#9D95FF] text-[#0E0E14]' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {pk}
                  </button>
                ))}
              </div>
            </div>

            {/* Easing Presets (Easy Ease F9, Ease In, Ease Out, Bounce) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              <button
                onClick={() => applyEasingToActiveKeyframe('easy-ease')}
                className="px-2 py-1.5 bg-[#252538] hover:bg-[#32324C] border border-[#3E3E58] rounded text-center text-[11px] font-bold text-[#9D95FF]"
                title="Easy Ease F9: Suavizado armónico"
              >
                Easy Ease (F9)
              </button>

              <button
                onClick={() => applyEasingToActiveKeyframe('ease-out')}
                className="px-2 py-1.5 bg-[#252538] hover:bg-[#32324C] border border-[#3E3E58] rounded text-center text-[11px] font-bold text-zinc-300"
              >
                Ease Out
              </button>

              <button
                onClick={() => applyEasingToActiveKeyframe('ease-in')}
                className="px-2 py-1.5 bg-[#252538] hover:bg-[#32324C] border border-[#3E3E58] rounded text-center text-[11px] font-bold text-zinc-300"
              >
                Ease In
              </button>

              <button
                onClick={() => applyEasingToActiveKeyframe('bounce')}
                className="px-2 py-1.5 bg-[#252538] hover:bg-[#32324C] border border-[#3E3E58] rounded text-center text-[11px] font-bold text-[#38BDF8]"
              >
                Bounce / Elastic
              </button>

              <button
                onClick={() => applyEasingToActiveKeyframe('linear')}
                className="px-2 py-1.5 bg-[#252538] hover:bg-[#32324C] border border-[#3E3E58] rounded text-center text-[11px] font-bold text-zinc-400"
              >
                Linear
              </button>
            </div>

            {/* Visual Bézier Curve Display */}
            <div className="bg-[#0E0E16] p-3 rounded-lg border border-[#2B2B3E] flex flex-col items-center">
              <svg className="w-full h-24 stroke-[#9D95FF]" viewBox="0 0 200 100">
                {/* Grid lines */}
                <line x1="0" y1="50" x2="200" y2="50" stroke="#252538" strokeDasharray="3 3" />
                <line x1="100" y1="0" x2="100" y2="100" stroke="#252538" strokeDasharray="3 3" />
                {/* Easing curve */}
                <path
                  d="M 10 90 C 80 90, 120 10, 190 10"
                  fill="none"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                {/* Control handles */}
                <circle cx="10" cy="90" r="4" fill="#38BDF8" />
                <circle cx="190" cy="10" r="4" fill="#38BDF8" />
                <line x1="10" y1="90" x2="80" y2="90" stroke="#38BDF8" strokeWidth="1" strokeDasharray="2 2" />
                <circle cx="80" cy="90" r="3" fill="#FFFFFF" />
                <line x1="190" y1="10" x2="120" y2="10" stroke="#38BDF8" strokeWidth="1" strokeDasharray="2 2" />
                <circle cx="120" cy="10" r="3" fill="#FFFFFF" />
              </svg>
              <span className="text-[10px] text-zinc-500 mt-1">
                Curva de velocidad Bézier asignada a fotograma clave
              </span>
            </div>
          </div>
        )}

        {/* TAB: CONTENT & STYLE */}
        {activeTab === 'content' && (
          <div className="space-y-3 max-w-xl mx-auto">
            {selectedLayer.type === 'text' && selectedLayer.textData && (
              <div className="space-y-2">
                <div>
                  <label className="text-zinc-400 font-semibold block mb-1">Texto</label>
                  <input
                    type="text"
                    value={selectedLayer.textData.text}
                    onChange={(e) =>
                      onUpdateLayer(selectedLayer.id, {
                        textData: { ...selectedLayer.textData!, text: e.target.value },
                      })
                    }
                    className="w-full bg-[#1E1E2C] border border-[#2E2E44] px-3 py-1.5 rounded-lg text-sm text-zinc-100 font-semibold focus:outline-none focus:border-[#9D95FF]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-zinc-400 font-semibold block mb-1">Tamaño Fuente</label>
                    <input
                      type="number"
                      value={selectedLayer.textData.fontSize}
                      onChange={(e) =>
                        onUpdateLayer(selectedLayer.id, {
                          textData: { ...selectedLayer.textData!, fontSize: Number(e.target.value) },
                        })
                      }
                      className="w-full bg-[#1E1E2C] border border-[#2E2E44] px-2.5 py-1 rounded text-right font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-400 font-semibold block mb-1">Tracking (Espaciado)</label>
                    <input
                      type="number"
                      value={selectedLayer.textData.letterSpacing}
                      onChange={(e) =>
                        onUpdateLayer(selectedLayer.id, {
                          textData: { ...selectedLayer.textData!, letterSpacing: Number(e.target.value) },
                        })
                      }
                      className="w-full bg-[#1E1E2C] border border-[#2E2E44] px-2.5 py-1 rounded text-right font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <div>
                    <label className="text-zinc-400 block mb-1">Color Relleno</label>
                    <input
                      type="color"
                      value={selectedLayer.textData.color}
                      onChange={(e) =>
                        onUpdateLayer(selectedLayer.id, {
                          textData: { ...selectedLayer.textData!, color: e.target.value },
                        })
                      }
                      className="w-10 h-7 rounded border border-zinc-700 bg-transparent cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">Color Trazo</label>
                    <input
                      type="color"
                      value={selectedLayer.textData.strokeColor || '#9D95FF'}
                      onChange={(e) =>
                        onUpdateLayer(selectedLayer.id, {
                          textData: { ...selectedLayer.textData!, strokeColor: e.target.value },
                        })
                      }
                      className="w-10 h-7 rounded border border-zinc-700 bg-transparent cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">Grosor Trazo</label>
                    <input
                      type="number"
                      value={selectedLayer.textData.strokeWidth || 0}
                      onChange={(e) =>
                        onUpdateLayer(selectedLayer.id, {
                          textData: { ...selectedLayer.textData!, strokeWidth: Number(e.target.value) },
                        })
                      }
                      className="w-16 bg-[#1E1E2C] border border-[#2E2E44] px-2 py-1 rounded text-right font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedLayer.type === 'shape' && selectedLayer.shapeData && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-zinc-400 font-semibold">Tipo de Forma:</label>
                  {(['rect', 'rounded_rect', 'circle', 'star', 'polygon'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() =>
                        onUpdateLayer(selectedLayer.id, {
                          shapeData: { ...selectedLayer.shapeData!, shapeType: st },
                        })
                      }
                      className={`px-2 py-1 text-[11px] font-bold rounded ${
                        selectedLayer.shapeData!.shapeType === st
                          ? 'bg-[#9D95FF] text-[#0E0E14]'
                          : 'bg-[#1E1E2C] text-zinc-400'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <div>
                    <label className="text-zinc-400 block mb-1">Color Relleno</label>
                    <input
                      type="color"
                      value={selectedLayer.shapeData.fillColor === 'transparent' ? '#6366F1' : selectedLayer.shapeData.fillColor}
                      onChange={(e) =>
                        onUpdateLayer(selectedLayer.id, {
                          shapeData: { ...selectedLayer.shapeData!, fillColor: e.target.value },
                        })
                      }
                      className="w-10 h-7 rounded border border-zinc-700 bg-transparent cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">Color Trazo</label>
                    <input
                      type="color"
                      value={selectedLayer.shapeData.strokeColor}
                      onChange={(e) =>
                        onUpdateLayer(selectedLayer.id, {
                          shapeData: { ...selectedLayer.shapeData!, strokeColor: e.target.value },
                        })
                      }
                      className="w-10 h-7 rounded border border-zinc-700 bg-transparent cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">Ancho Trazo</label>
                    <input
                      type="number"
                      value={selectedLayer.shapeData.strokeWidth}
                      onChange={(e) =>
                        onUpdateLayer(selectedLayer.id, {
                          shapeData: { ...selectedLayer.shapeData!, strokeWidth: Number(e.target.value) },
                        })
                      }
                      className="w-16 bg-[#1E1E2C] border border-[#2E2E44] px-2 py-1 rounded text-right font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* IMAGE CONTROLS */}
            {selectedLayer.type === 'image' && (
              <div className="space-y-3 bg-[#171724] p-3 rounded-xl border border-[#2B2B3E]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon size={15} className="text-cyan-400" />
                    <span className="font-bold text-zinc-200 text-xs">Propiedades de Imagen</span>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-mono">
                    {selectedLayer.imageData?.naturalWidth || 400} × {selectedLayer.imageData?.naturalHeight || 400} px
                  </span>
                </div>

                {/* Preview Thumbnail and quick upload button */}
                <div className="flex items-center gap-3 bg-[#111118] p-2 rounded-lg border border-[#222232]">
                  <img
                    src={selectedLayer.imageData?.url || selectedLayer.mediaUrl}
                    alt="Preview"
                    className="w-16 h-12 object-cover rounded border border-zinc-700 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 flex flex-col gap-1">
                    <label className="flex items-center justify-center gap-1 px-2 py-1.5 bg-[#252538] hover:bg-[#34344E] text-[#38BDF8] rounded text-xs font-bold cursor-pointer transition-colors text-center border border-[#3E3E58]">
                      <Upload size={13} />
                      <span>Cambiar Imagen</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const result = ev.target?.result as string;
                            if (result) {
                              const img = new Image();
                              img.onload = () => {
                                onUpdateLayer(selectedLayer.id, {
                                  mediaUrl: result,
                                  imageData: {
                                    url: result,
                                    naturalWidth: img.naturalWidth,
                                    naturalHeight: img.naturalHeight,
                                    fit: selectedLayer.imageData?.fit || 'contain',
                                  },
                                });
                              };
                              img.src = result;
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Fit Mode Toggle */}
                <div>
                  <label className="text-[11px] text-zinc-400 font-semibold block mb-1.5">
                    Modo de Ajuste (Fit Mode):
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: 'contain' as const, label: 'Contener' },
                      { id: 'cover' as const, label: 'Cubrir' },
                      { id: 'original' as const, label: 'Original' },
                    ].map((fitOpt) => (
                      <button
                        key={fitOpt.id}
                        type="button"
                        onClick={() =>
                          onUpdateLayer(selectedLayer.id, {
                            imageData: {
                              ...selectedLayer.imageData!,
                              url: selectedLayer.imageData?.url || selectedLayer.mediaUrl || '',
                              naturalWidth: selectedLayer.imageData?.naturalWidth || 400,
                              naturalHeight: selectedLayer.imageData?.naturalHeight || 400,
                              fit: fitOpt.id,
                            },
                          })
                        }
                        className={`py-1 text-[11px] font-bold rounded border transition-colors ${
                          (selectedLayer.imageData?.fit || 'contain') === fitOpt.id
                            ? 'bg-[#9D95FF] border-[#9D95FF] text-[#0E0E14]'
                            : 'bg-[#1C1C28] border-[#2A2A3C] text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {fitOpt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Direct Image URL input */}
                <div>
                  <label className="text-[11px] text-zinc-400 font-semibold block mb-1 flex items-center gap-1">
                    <Globe size={11} />
                    <span>URL Directa de Imagen:</span>
                  </label>
                  <input
                    type="url"
                    value={selectedLayer.imageData?.url || selectedLayer.mediaUrl || ''}
                    onChange={(e) => {
                      const url = e.target.value;
                      const img = new Image();
                      img.onload = () => {
                        onUpdateLayer(selectedLayer.id, {
                          mediaUrl: url,
                          imageData: {
                            url,
                            naturalWidth: img.naturalWidth,
                            naturalHeight: img.naturalHeight,
                            fit: selectedLayer.imageData?.fit || 'contain',
                          },
                        });
                      };
                      img.src = url;
                      onUpdateLayer(selectedLayer.id, {
                        mediaUrl: url,
                        imageData: {
                          url,
                          naturalWidth: selectedLayer.imageData?.naturalWidth || 400,
                          naturalHeight: selectedLayer.imageData?.naturalHeight || 400,
                          fit: selectedLayer.imageData?.fit || 'contain',
                        },
                      });
                    }}
                    placeholder="https://..."
                    className="w-full bg-[#111118] border border-[#2E2E44] px-2.5 py-1.5 rounded-lg text-xs text-zinc-100 font-mono focus:outline-none focus:border-[#9D95FF]"
                  />
                </div>

                {/* Quick Presets swap */}
                <div>
                  <span className="text-[10px] text-zinc-400 font-semibold block mb-1">
                    Cambiar por Preset:
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      {
                        name: 'Cyberpunk',
                        url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=800&auto=format&fit=crop',
                      },
                      {
                        name: 'Holograma',
                        url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop',
                      },
                      {
                        name: 'Synthwave',
                        url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
                      },
                    ].map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => {
                          const img = new Image();
                          img.onload = () => {
                            onUpdateLayer(selectedLayer.id, {
                              mediaUrl: p.url,
                              imageData: {
                                url: p.url,
                                naturalWidth: img.naturalWidth,
                                naturalHeight: img.naturalHeight,
                                fit: selectedLayer.imageData?.fit || 'contain',
                              },
                            });
                          };
                          img.src = p.url;
                        }}
                        className="py-1 px-1.5 bg-[#1B1B28] hover:bg-[#252538] border border-[#2D2D40] rounded text-[10px] font-bold text-zinc-300 hover:text-[#9D95FF] truncate"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: BLEND & 3D */}
        {activeTab === 'blend' && (
          <div className="space-y-3 max-w-xl mx-auto">
            <div>
              <label className="text-zinc-400 font-semibold block mb-1">Modo de Fusión (Blend Mode)</label>
              <select
                value={selectedLayer.blendMode}
                onChange={(e) => onUpdateLayer(selectedLayer.id, { blendMode: e.target.value as any })}
                className="w-full bg-[#1E1E2C] border border-[#2E2E44] px-3 py-2 rounded-lg font-semibold text-zinc-100 focus:outline-none"
              >
                <option value="normal">Normal</option>
                <option value="screen">Pantalla (Screen)</option>
                <option value="lighter">Añadir (Lighter / Add)</option>
                <option value="multiply">Multiplicar (Multiply)</option>
                <option value="overlay">Superponer (Overlay)</option>
                <option value="color-dodge">Sobreexposición de Color</option>
                <option value="darken">Oscurecer</option>
                <option value="lighten">Aclarar</option>
                <option value="difference">Diferencia</option>
              </select>
            </div>

            <div>
              <label className="text-zinc-400 font-semibold block mb-1">Emparentar (Parent & Link)</label>
              <select
                value={selectedLayer.parentId || ''}
                onChange={(e) => onUpdateLayer(selectedLayer.id, { parentId: e.target.value || null })}
                className="w-full bg-[#1E1E2C] border border-[#2E2E44] px-3 py-2 rounded-lg font-semibold text-zinc-100 focus:outline-none"
              >
                <option value="">Ninguno (Sin parent)</option>
                {layers
                  .filter((l) => l.id !== selectedLayer.id)
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        )}

        {/* TAB: EXPRESSIONS */}
        {activeTab === 'expression' && (
          <div className="space-y-3 max-w-xl mx-auto">
            <div className="flex items-center justify-between bg-[#1B1B26] p-2 rounded-lg border border-[#2B2B3C]">
              <div>
                <span className="font-bold text-zinc-200 block">Expresión Wiggle / Animación Continua</span>
                <span className="text-[10px] text-zinc-400">Simula código After Effects wiggle(freq, amp)</span>
              </div>
              <button
                onClick={() =>
                  onUpdateLayer(selectedLayer.id, {
                    expression: {
                      enabled: !selectedLayer.expression?.enabled,
                      type: selectedLayer.expression?.type || 'wiggle',
                      freq: selectedLayer.expression?.freq || 2,
                      amp: selectedLayer.expression?.amp || 10,
                    },
                  })
                }
                className={`px-3 py-1 rounded text-xs font-bold ${
                  selectedLayer.expression?.enabled ? 'bg-[#9D95FF] text-[#0E0E14]' : 'bg-[#2A2A3C] text-zinc-400'
                }`}
              >
                {selectedLayer.expression?.enabled ? 'ACTIVADA' : 'DESACTIVADA'}
              </button>
            </div>

            {selectedLayer.expression?.enabled && (
              <div className="bg-[#1B1B26] p-3 rounded-lg border border-[#2B2B3C] space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-zinc-400 font-semibold">Tipo:</label>
                  {(['wiggle', 'spin', 'pulse'] as const).map((exprType) => (
                    <button
                      key={exprType}
                      onClick={() =>
                        onUpdateLayer(selectedLayer.id, {
                          expression: { ...selectedLayer.expression!, type: exprType },
                        })
                      }
                      className={`px-2 py-1 text-xs font-bold rounded ${
                        selectedLayer.expression?.type === exprType
                          ? 'bg-[#38BDF8] text-[#0E0E14]'
                          : 'bg-[#252538] text-zinc-400'
                      }`}
                    >
                      {exprType.toUpperCase()}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div>
                    <label className="text-zinc-400 block mb-1">Frecuencia (veces/seg)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={selectedLayer.expression.freq}
                      onChange={(e) =>
                        onUpdateLayer(selectedLayer.id, {
                          expression: { ...selectedLayer.expression!, freq: Number(e.target.value) },
                        })
                      }
                      className="w-full bg-[#14141E] border border-[#2D2D40] px-2 py-1 rounded font-mono text-right"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">Amplitud (intensidad)</label>
                    <input
                      type="number"
                      value={selectedLayer.expression.amp}
                      onChange={(e) =>
                        onUpdateLayer(selectedLayer.id, {
                          expression: { ...selectedLayer.expression!, amp: Number(e.target.value) },
                        })
                      }
                      className="w-full bg-[#14141E] border border-[#2D2D40] px-2 py-1 rounded font-mono text-right"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Subcomponent for each animatable transform property row
const TransformPropertyRow: React.FC<{
  label: string;
  propName: string;
  prop: any;
  currentFrame: number;
  onToggleStopwatch: () => void;
  onToggleKeyframe: () => void;
  onJump: (dir: 'prev' | 'next') => void;
  children: React.ReactNode;
}> = ({ label, prop, currentFrame, onToggleStopwatch, onToggleKeyframe, onJump, children }) => {
  const isAnimated = prop.isAnimated;
  const hasKeyframeAtPlayhead = prop.keyframes?.some((k: any) => k.frame === currentFrame);

  return (
    <div className="flex items-center justify-between gap-2 bg-[#1B1B28] px-2.5 py-1.5 rounded-lg border border-[#28283C]">
      {/* Label and Stopwatch Controls */}
      <div className="flex items-center gap-1.5">
        {/* Stopwatch icon */}
        <button
          onClick={onToggleStopwatch}
          className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
            isAnimated ? 'text-[#38BDF8] bg-[#162738]' : 'text-zinc-500 hover:text-zinc-300'
          }`}
          title={isAnimated ? 'Desactivar animación (elimina keyframes)' : 'Activar cronómetro (animar)'}
        >
          <Diamond size={13} fill={isAnimated ? 'currentColor' : 'none'} />
        </button>

        <span className="font-semibold text-zinc-300 text-[11px]">{label}</span>

        {/* Jump prev / Keyframe toggle / Jump next */}
        {isAnimated && (
          <div className="flex items-center gap-0.5 ml-1 bg-[#14141E] p-0.5 rounded border border-[#282838]">
            <button
              onClick={() => onJump('prev')}
              className="p-0.5 text-zinc-400 hover:text-white"
              title="Fotograma clave anterior"
            >
              <ChevronLeft size={12} />
            </button>

            <button
              onClick={onToggleKeyframe}
              className={`p-0.5 ${hasKeyframeAtPlayhead ? 'text-[#38BDF8]' : 'text-zinc-600 hover:text-zinc-300'}`}
              title={hasKeyframeAtPlayhead ? 'Eliminar fotograma clave' : 'Añadir fotograma clave aquí'}
            >
              <Diamond size={10} fill={hasKeyframeAtPlayhead ? 'currentColor' : 'none'} />
            </button>

            <button
              onClick={() => onJump('next')}
              className="p-0.5 text-zinc-400 hover:text-white"
              title="Fotograma clave siguiente"
            >
              <ChevronRight size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Value Controls */}
      <div>{children}</div>
    </div>
  );
};
