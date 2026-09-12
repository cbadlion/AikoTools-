import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Composition, AELayer, ActiveTool } from '../types/ae';
import { renderCompositionFrame, computeWorldTransform } from '../utils/canvasRenderer';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface AECanvasProps {
  composition: Composition;
  layers: AELayer[];
  currentFrame: number;
  selectedLayerId: string | null;
  onSelectLayer: (layerId: string | null) => void;
  onUpdateLayerTransform: (layerId: string, updates: any) => void;
  activeTool: ActiveTool;
  showGuides: boolean;
}

export const AECanvas: React.FC<AECanvasProps> = ({
  composition,
  layers,
  currentFrame,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayerTransform,
  activeTool,
  showGuides,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Pan & Zoom state
  const [zoom, setZoom] = useState<number>(0.5);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialTransform, setInitialTransform] = useState<{ posX: number; posY: number; rot: number; anchorX: number; anchorY: number } | null>(null);

  // Auto-fit composition inside container on initial load and resize
  const autoFit = useCallback(() => {
    if (!containerRef.current) return;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    if (cw <= 0 || ch <= 0) return;

    // Leave a small margin
    const margin = 24;
    const scaleX = (cw - margin) / composition.width;
    const scaleY = (ch - margin) / composition.height;
    const fitScale = Math.min(scaleX, scaleY, 1.2);

    setZoom(Number(fitScale.toFixed(3)));
    setPan({ x: 0, y: 0 });
  }, [composition.width, composition.height]);

  useEffect(() => {
    autoFit();
    const handleResize = () => autoFit();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [autoFit]);

  // Main render loop triggered whenever frame, layers or comp changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderCompositionFrame(ctx, composition, layers, currentFrame, {
      showGuides,
      selectedLayerId,
    });
  }, [composition, layers, currentFrame, selectedLayerId, showGuides]);

  // Handle pointer down (drag / select / transform)
  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clientX = e.clientX;
    const clientY = e.clientY;

    setIsDragging(true);
    setDragStart({ x: clientX, y: clientY });

    // If Hand tool, pan canvas
    if (activeTool === 'hand') return;

    // Convert screen coordinates to composition canvas coordinates
    const scale = zoom;
    const canvasX = (clientX - (rect.left + rect.width / 2)) / scale + composition.width / 2;
    const canvasY = (clientY - (rect.top + rect.height / 2)) / scale + composition.height / 2;

    // Check if clicked an existing layer (from top to bottom)
    const activeLayers = [...layers].filter(
      (l) => l.visible && currentFrame >= l.inFrame && currentFrame <= l.outFrame
    );

    // If we have a selected layer, record its transform for dragging
    const selectedLayer = layers.find((l) => l.id === selectedLayerId);
    if (selectedLayer) {
      const tf = computeWorldTransform(selectedLayer, layers, currentFrame, composition.fps);
      setInitialTransform({
        posX: tf.posX,
        posY: tf.posY,
        rot: tf.rotation,
        anchorX: tf.anchorX,
        anchorY: tf.anchorY,
      });
    } else {
      // Find clicked layer if none selected
      for (const l of activeLayers) {
        const tf = computeWorldTransform(l, layers, currentFrame, composition.fps);
        const dist = Math.hypot(canvasX - tf.posX, canvasY - tf.posY);
        if (dist < 120) {
          onSelectLayer(l.id);
          setInitialTransform({
            posX: tf.posX,
            posY: tf.posY,
            rot: tf.rotation,
            anchorX: tf.anchorX,
            anchorY: tf.anchorY,
          });
          break;
        }
      }
    }
  };

  // Handle pointer move
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    if (activeTool === 'hand') {
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (!selectedLayerId || !initialTransform) return;

    const selectedLayer = layers.find((l) => l.id === selectedLayerId);
    if (!selectedLayer || selectedLayer.locked) return;

    const compDx = dx / zoom;
    const compDy = dy / zoom;

    if (activeTool === 'select') {
      // Move layer position
      const newX = Math.round(initialTransform.posX + compDx);
      const newY = Math.round(initialTransform.posY + compDy);

      onUpdateLayerTransform(selectedLayerId, {
        position: {
          ...selectedLayer.transform.position,
          value: [newX, newY, selectedLayer.transform.position.value[2] || 0],
        },
      });
    } else if (activeTool === 'rotate') {
      // Rotate layer
      const angleDelta = Math.round(compDx * 0.8);
      onUpdateLayerTransform(selectedLayerId, {
        rotation: {
          ...selectedLayer.transform.rotation,
          value: (initialTransform.rot + angleDelta) % 360,
        },
      });
    } else if (activeTool === 'anchor') {
      // Move Anchor Point
      const newAx = Math.round(initialTransform.anchorX + compDx);
      const newAy = Math.round(initialTransform.anchorY + compDy);
      onUpdateLayerTransform(selectedLayerId, {
        anchorPoint: {
          ...selectedLayer.transform.anchorPoint,
          value: [newAx, newAy],
        },
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    setInitialTransform(null);
  };

  return (
    <div
      ref={containerRef}
      className="relative flex-1 w-full bg-[#0A0A0F] overflow-hidden flex items-center justify-center select-none touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ cursor: activeTool === 'hand' ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
    >
      {/* Checkerboard Pattern for transparent canvas */}
      <div
        className="absolute transition-transform duration-75 shadow-2xl rounded-sm overflow-hidden"
        style={{
          width: `${composition.width}px`,
          height: `${composition.height}px`,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          backgroundImage: `
            linear-gradient(45deg, #181822 25%, transparent 25%),
            linear-gradient(-45deg, #181822 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #181822 75%),
            linear-gradient(-45deg, transparent 75%, #181822 75%)
          `,
          backgroundSize: '24px 24px',
          backgroundPosition: '0 0, 0 12px, 12px -12px, -12px 0px',
          backgroundColor: '#111118',
        }}
      >
        <canvas
          ref={canvasRef}
          width={composition.width}
          height={composition.height}
          className="w-full h-full block"
        />
      </div>

      {/* Floating Zoom Controls & Fit */}
      <div className="absolute top-3 right-3 flex items-center gap-1 bg-[#161622]/90 backdrop-blur-md px-2 py-1 rounded-lg border border-[#2B2B3E] shadow-lg text-zinc-300 z-10">
        <button
          onClick={() => setZoom((z) => Math.max(0.15, Number((z - 0.1).toFixed(2))))}
          className="p-1 hover:text-white rounded hover:bg-[#252538]"
          title="Alejar Zoom (-)"
        >
          <ZoomOut size={13} />
        </button>

        <span className="text-[11px] font-mono px-1 font-semibold text-[#9D95FF]">
          {Math.round(zoom * 100)}%
        </span>

        <button
          onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.1).toFixed(2))))}
          className="p-1 hover:text-white rounded hover:bg-[#252538]"
          title="Acercar Zoom (+)"
        >
          <ZoomIn size={13} />
        </button>

        <div className="h-3 w-px bg-zinc-700 mx-0.5" />

        <button
          onClick={autoFit}
          className="p-1 hover:text-[#9D95FF] rounded hover:bg-[#252538]"
          title="Ajustar Composición a Pantalla"
        >
          <Maximize2 size={13} />
        </button>
      </div>

      {/* Touch tool hint for mobile */}
      <div className="absolute bottom-2 left-2 text-[10px] bg-[#12121A]/80 backdrop-blur-sm text-zinc-400 px-2 py-0.5 rounded border border-[#222232] pointer-events-none">
        {activeTool === 'select' && 'Arrastra capa para mover'}
        {activeTool === 'rotate' && 'Arrastra para rotar'}
        {activeTool === 'anchor' && 'Arrastra para mover punto de anclaje'}
        {activeTool === 'hand' && 'Arrastra para encuadrar'}
        {activeTool === 'shape' && 'Herramienta de forma activa'}
        {activeTool === 'text' && 'Herramienta de texto activa'}
      </div>
    </div>
  );
};
