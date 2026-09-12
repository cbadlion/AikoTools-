import { AELayer, Composition, BlendMode, LayerEffect } from '../types/ae';
import { interpolateValue, evaluateExpressionOffset } from './interpolation';

// Cache for loaded images
const imageCache = new Map<string, HTMLImageElement>();

export function getCachedImage(url: string): HTMLImageElement | null {
  if (imageCache.has(url)) {
    const img = imageCache.get(url)!;
    return img.complete && img.naturalWidth > 0 ? img : null;
  }
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ae-image-loaded', { detail: { url } }));
    }
  };
  img.src = url;
  imageCache.set(url, img);
  return img.complete && img.naturalWidth > 0 ? img : null;
}

// Compute world transform by combining layer with parent hierarchy
export function computeWorldTransform(
  layer: AELayer,
  allLayers: AELayer[],
  frame: number,
  fps: number
): {
  posX: number;
  posY: number;
  posZ: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  opacity: number;
  anchorX: number;
  anchorY: number;
} {
  // 1. Interpolate local transform
  const pos = interpolateValue(layer.transform.position, frame);
  const scale = interpolateValue(layer.transform.scale, frame);
  const rot = interpolateValue(layer.transform.rotation, frame);
  const op = interpolateValue(layer.transform.opacity, frame);
  const anchor = interpolateValue(layer.transform.anchorPoint, frame);

  // 2. Add expression offsets (wiggle, spin, pulse)
  const exprOffset = evaluateExpressionOffset(layer.expression, frame, fps, parseInt(layer.id.replace(/\D/g, '') || '42', 10));

  let posX = pos[0] + exprOffset.x;
  let posY = pos[1] + exprOffset.y;
  let posZ = pos[2] || 0;
  let scaleX = (scale[0] + exprOffset.scale) / 100;
  let scaleY = (scale[1] + exprOffset.scale) / 100;
  let rotation = rot + exprOffset.rot;
  let opacity = Math.max(0, Math.min(100, op)) / 100;
  const anchorX = anchor[0];
  const anchorY = anchor[1];

  // 3. Parent hierarchy chain
  if (layer.parentId) {
    const parent = allLayers.find((l) => l.id === layer.parentId);
    if (parent) {
      const pTransform = computeWorldTransform(parent, allLayers, frame, fps);
      // Rotate local offset around parent
      const rad = (pTransform.rotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      const offsetX = posX * pTransform.scaleX;
      const offsetY = posY * pTransform.scaleY;

      posX = pTransform.posX + (offsetX * cos - offsetY * sin);
      posY = pTransform.posY + (offsetX * sin + offsetY * cos);
      posZ += pTransform.posZ;
      scaleX *= pTransform.scaleX;
      scaleY *= pTransform.scaleY;
      rotation += pTransform.rotation;
      opacity *= pTransform.opacity;
    }
  }

  return { posX, posY, posZ, scaleX, scaleY, rotation, opacity, anchorX, anchorY };
}

// Convert After Effects blend mode to HTML5 Canvas globalCompositeOperation
function getCanvasCompositeOp(mode: BlendMode): GlobalCompositeOperation {
  switch (mode) {
    case 'screen':
      return 'screen';
    case 'multiply':
      return 'multiply';
    case 'overlay':
      return 'overlay';
    case 'lighter':
      return 'lighter';
    case 'color-dodge':
      return 'color-dodge';
    case 'darken':
      return 'darken';
    case 'lighten':
      return 'lighten';
    case 'difference':
      return 'difference';
    case 'exclusion':
      return 'exclusion';
    case 'normal':
    default:
      return 'source-over';
  }
}

// Draw Star helper
function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, points: number, outerR: number, innerR: number) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / points;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < points; i++) {
    x = cx + Math.cos(rot) * outerR;
    y = cy + Math.sin(rot) * outerR;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerR;
    y = cy + Math.sin(rot) * innerR;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerR);
  ctx.closePath();
}

// Draw Polygon helper
function drawPolygon(ctx: CanvasRenderingContext2D, cx: number, cy: number, sides: number, radius: number) {
  if (sides < 3) return;
  const step = (Math.PI * 2) / sides;
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const angle = i * step - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// Main render frame function
export function renderCompositionFrame(
  ctx: CanvasRenderingContext2D,
  comp: Composition,
  layers: AELayer[],
  frame: number,
  options?: {
    showGuides?: boolean;
    selectedLayerId?: string | null;
  }
) {
  const { width, height, fps } = comp;

  // Clear canvas
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // Background
  if (comp.bgColor && comp.bgColor !== 'transparent') {
    ctx.fillStyle = comp.bgColor;
    ctx.fillRect(0, 0, width, height);
  }

  // Check solo layers
  const hasSolo = layers.some((l) => l.solo && l.visible);

  // Layers are rendered in stack order: bottom layer first (reverse array if index 0 is top)
  // Let's assume layers[0] is top layer (standard After Effects timeline), so render in reverse:
  const renderStack = [...layers].reverse();

  for (const layer of renderStack) {
    if (!layer.visible) continue;
    if (hasSolo && !layer.solo) continue;
    if (frame < layer.inFrame || frame > layer.outFrame) continue;

    // Handle Adjustment Layer: apply filter to the whole composition rendered below
    if (layer.type === 'adjustment') {
      applyAdjustmentEffects(ctx, comp, layer.effects);
      continue;
    }

    ctx.save();

    // 1. Composite & Opacity
    ctx.globalCompositeOperation = getCanvasCompositeOp(layer.blendMode);

    // 2. World transform calculation
    const tf = computeWorldTransform(layer, layers, frame, fps);
    ctx.globalAlpha = tf.opacity;

    // 3. Apply 2D/3D matrix
    ctx.translate(tf.posX, tf.posY);
    ctx.rotate((tf.rotation * Math.PI) / 180);
    ctx.scale(tf.scaleX, tf.scaleY);

    // Account for Anchor Point
    ctx.translate(-tf.anchorX, -tf.anchorY);

    // 4. Layer Content Render with Effects Pipeline
    renderLayerWithEffects(ctx, layer, comp, frame);

    ctx.restore();
  }

  // Draw composition guides / safe margins if requested
  if (options?.showGuides) {
    drawSafeGuides(ctx, width, height);
  }

  // Draw selection bounding box and anchor crosshair for active layer
  if (options?.selectedLayerId) {
    const selLayer = layers.find((l) => l.id === options.selectedLayerId);
    if (selLayer && selLayer.visible && frame >= selLayer.inFrame && frame <= selLayer.outFrame) {
      drawLayerSelectionGizmo(ctx, selLayer, layers, frame, fps);
    }
  }

  ctx.restore();
}

function renderLayerContent(
  ctx: CanvasRenderingContext2D,
  layer: AELayer,
  comp: Composition,
  frame: number
) {
  switch (layer.type) {
    case 'text': {
      const data = layer.textData || {
        text: 'After Effects',
        fontSize: 48,
        fontFamily: 'Plus Jakarta Sans',
        color: '#FFFFFF',
        letterSpacing: 2,
        lineHeight: 1.2,
        align: 'center' as const,
        isBold: true,
        isItalic: false,
      };

      ctx.save();
      ctx.textAlign = data.align || 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${data.isItalic ? 'italic ' : ''}${data.isBold ? 'bold ' : '600 '}${data.fontSize}px "${data.fontFamily || 'Plus Jakarta Sans'}", sans-serif`;

      if (data.shadowBlur && data.shadowBlur > 0) {
        ctx.shadowColor = data.shadowColor || 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = data.shadowBlur;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;
      }

      const lines = data.text.split('\n');
      const totalH = (lines.length - 1) * data.fontSize * (data.lineHeight || 1.2);
      const startY = -totalH / 2;

      lines.forEach((line, i) => {
        const lineY = startY + i * data.fontSize * (data.lineHeight || 1.2);

        // Tracking / Letter spacing
        if (data.letterSpacing && data.letterSpacing !== 0) {
          drawSpacedText(ctx, line, 0, lineY, data.letterSpacing, data.color, data.strokeColor, data.strokeWidth);
        } else {
          if (data.strokeWidth && data.strokeWidth > 0 && data.strokeColor) {
            ctx.strokeStyle = data.strokeColor;
            ctx.lineWidth = data.strokeWidth;
            ctx.strokeText(line, 0, lineY);
          }
          ctx.fillStyle = data.color;
          ctx.fillText(line, 0, lineY);
        }
      });

      ctx.restore();
      break;
    }

    case 'shape': {
      const shape = layer.shapeData || {
        shapeType: 'rect' as const,
        fillColor: '#6366F1',
        strokeColor: '#FFFFFF',
        strokeWidth: 0,
        cornerRadius: 16,
        starPoints: 5,
        width: 200,
        height: 200,
      };

      const w = shape.width || 200;
      const h = shape.height || 200;

      ctx.save();
      ctx.fillStyle = shape.fillColor || 'transparent';
      ctx.strokeStyle = shape.strokeColor || '#FFFFFF';
      ctx.lineWidth = shape.strokeWidth || 0;

      ctx.beginPath();
      switch (shape.shapeType) {
        case 'circle':
          ctx.arc(0, 0, Math.min(w, h) / 2, 0, Math.PI * 2);
          break;
        case 'star':
          drawStar(ctx, 0, 0, shape.starPoints || 5, Math.min(w, h) / 2, Math.min(w, h) / 4);
          break;
        case 'polygon':
          drawPolygon(ctx, 0, 0, 6, Math.min(w, h) / 2);
          break;
        case 'triangle':
          drawPolygon(ctx, 0, 0, 3, Math.min(w, h) / 2);
          break;
        case 'rounded_rect': {
          const r = shape.cornerRadius || 16;
          const x = -w / 2;
          const y = -h / 2;
          ctx.roundRect(x, y, w, h, r);
          break;
        }
        case 'rect':
        default: {
          const x = -w / 2;
          const y = -h / 2;
          ctx.rect(x, y, w, h);
          break;
        }
      }

      if (shape.fillColor && shape.fillColor !== 'transparent') {
        ctx.fill();
      }
      if (shape.strokeWidth && shape.strokeWidth > 0) {
        ctx.stroke();
      }
      ctx.restore();
      break;
    }

    case 'solid': {
      const color = layer.solidColor || '#3B82F6';
      ctx.save();
      ctx.fillStyle = color;
      ctx.fillRect(-comp.width / 2, -comp.height / 2, comp.width, comp.height);
      ctx.restore();
      break;
    }

    case 'image': {
      const url = layer.imageData?.url || layer.mediaUrl;
      if (url) {
        const img = getCachedImage(url);
        if (img) {
          let iw = layer.imageData?.naturalWidth || img.naturalWidth || 400;
          let ih = layer.imageData?.naturalHeight || img.naturalHeight || 400;
          // Scale to reasonable bounds if very large
          const maxBound = Math.max(comp.width, comp.height) * 0.8;
          if (iw > maxBound || ih > maxBound) {
            const ratio = Math.min(maxBound / iw, maxBound / ih);
            iw = Math.round(iw * ratio);
            ih = Math.round(ih * ratio);
          }
          ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
        } else {
          // Placeholder card with loading indicator
          ctx.save();
          ctx.fillStyle = '#161622';
          ctx.strokeStyle = '#2B2B3E';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(-150, -100, 300, 200, 16);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#9D95FF';
          ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('Cargando Imagen...', 0, 0);
          ctx.restore();
        }
      } else {
        // Built-in procedural motion badge
        drawProceduralGraphic(ctx, frame);
      }
      break;
    }

    case 'null': {
      // Null object is invisible during render, only shows guide in editor
      break;
    }

    default:
      break;
  }
}

// Procedural graphic for default media
function drawProceduralGraphic(ctx: CanvasRenderingContext2D, frame: number) {
  ctx.save();
  const grad = ctx.createLinearGradient(-150, -150, 150, 150);
  grad.addColorStop(0, '#9D95FF');
  grad.addColorStop(0.5, '#6366F1');
  grad.addColorStop(1, '#38BDF8');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(-140, -140, 280, 280, 32);
  ctx.fill();

  // Glow ring
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 70, 0, Math.PI * 2);
  ctx.stroke();

  // Center After Effects mobile icon
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 54px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Ae', 0, 0);
  ctx.restore();
}

// Letter spacing text helper
function drawSpacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
  fillColor: string,
  strokeColor?: string,
  strokeWidth?: number
) {
  const chars = text.split('');
  let totalWidth = 0;
  for (let i = 0; i < chars.length; i++) {
    totalWidth += ctx.measureText(chars[i]).width + (i < chars.length - 1 ? spacing : 0);
  }

  let curX = x - totalWidth / 2;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const w = ctx.measureText(ch).width;
    if (strokeWidth && strokeWidth > 0 && strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.strokeText(ch, curX + w / 2, y);
    }
    ctx.fillStyle = fillColor;
    ctx.fillText(ch, curX + w / 2, y);
    curX += w + spacing;
  }
}

// Unified Render Function for Layer with VFX Effects Pipeline
function renderLayerWithEffects(
  ctx: CanvasRenderingContext2D,
  layer: AELayer,
  comp: Composition,
  frame: number
) {
  const activeEffects = layer.effects?.filter((e) => e.enabled) || [];

  if (activeEffects.length === 0) {
    renderLayerContent(ctx, layer, comp, frame);
    return;
  }

  // 1. Check Filters: Gaussian Blur, Glow, Tint
  let filters: string[] = [];

  const blurEff = activeEffects.find((e) => e.type === 'gaussian_blur');
  if (blurEff) {
    const radius = Number(blurEff.params.radius ?? 15);
    if (radius > 0) filters.push(`blur(${radius}px)`);
  }

  const glowEff = activeEffects.find((e) => e.type === 'glow');
  if (glowEff) {
    const radius = Number(glowEff.params.radius ?? 20);
    const intensity = Number(glowEff.params.intensity ?? 1.8);
    const color = String(glowEff.params.color ?? '#9D95FF');
    filters.push(`drop-shadow(0 0 ${Math.round(radius * 0.4)}px ${color})`);
    filters.push(`drop-shadow(0 0 ${Math.round(radius)}px ${color})`);
    if (intensity > 1) {
      filters.push(`brightness(${Number((1 + (intensity - 1) * 0.3).toFixed(2))})`);
    }
  }

  const tintEff = activeEffects.find((e) => e.type === 'color_tint');
  if (tintEff) {
    const amount = Number(tintEff.params.amount ?? 0.7);
    filters.push(`saturate(${Math.round(100 + amount * 80)}%)`);
  }

  // Set composite filter if any
  const previousFilter = ctx.filter;
  if (filters.length > 0) {
    ctx.filter = filters.join(' ');
  }

  // 2. Directional Motion Blur check
  const mbEff = activeEffects.find((e) => e.type === 'motion_blur');
  if (mbEff) {
    const blurAmount = Number(mbEff.params.blurAmount ?? 16);
    const angle = Number(mbEff.params.angle ?? 45);
    const rad = (angle * Math.PI) / 180;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);

    for (let s = -2; s <= 2; s++) {
      if (s === 0) continue;
      ctx.save();
      ctx.translate(dx * s * (blurAmount / 4), dy * s * (blurAmount / 4));
      ctx.globalAlpha = 0.25;
      renderLayerContent(ctx, layer, comp, frame);
      ctx.restore();
    }
  }

  // 3. Glitch / RGB Split effect check
  const glitchEff = activeEffects.find((e) => e.type === 'glitch');
  if (glitchEff) {
    const offset = Number(glitchEff.params.offset ?? 12);
    const speed = Number(glitchEff.params.twitchSpeed ?? 3);
    const twitch = Math.sin(frame * speed * 0.4);
    const curOffset = Math.abs(twitch) > 0.25 ? offset * (twitch > 0 ? 1 : -0.8) : offset * 0.35;

    // Red Channel Pass Shifted Left
    ctx.save();
    ctx.translate(-curOffset, 0);
    ctx.globalCompositeOperation = 'screen';
    ctx.filter = 'contrast(200%) hue-rotate(300deg) saturate(300%)';
    ctx.globalAlpha = 0.7;
    renderLayerContent(ctx, layer, comp, frame);
    ctx.restore();

    // Cyan Channel Pass Shifted Right
    ctx.save();
    ctx.translate(curOffset, 0);
    ctx.globalCompositeOperation = 'screen';
    ctx.filter = 'contrast(200%) hue-rotate(170deg) saturate(300%)';
    ctx.globalAlpha = 0.7;
    renderLayerContent(ctx, layer, comp, frame);
    ctx.restore();
  }

  // 4. Wave Warp check
  const waveEff = activeEffects.find((e) => e.type === 'wave_warp');
  if (waveEff) {
    const height = Number(waveEff.params.height ?? 14);
    const width = Number(waveEff.params.width ?? 35);
    const speed = Number(waveEff.params.speed ?? 2);
    const waveOffset = Math.sin((frame * speed * 0.2) + Math.PI) * height;

    ctx.save();
    ctx.translate(waveOffset, 0);
    renderLayerContent(ctx, layer, comp, frame);
    ctx.restore();
  } else {
    // Standard Base Layer Content Render
    renderLayerContent(ctx, layer, comp, frame);
  }

  // 5. Glow Bloom Second Pass (for high intensity glow)
  if (glowEff && Number(glowEff.params.intensity ?? 1.8) >= 1.5) {
    const radius = Number(glowEff.params.radius ?? 20);
    const color = String(glowEff.params.color ?? '#9D95FF');
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = radius * 1.5;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.6;
    renderLayerContent(ctx, layer, comp, frame);
    ctx.restore();
  }

  // 6. Glitch Cyber Scanlines
  if (glitchEff) {
    const speed = Number(glitchEff.params.twitchSpeed ?? 3);
    const twitch = Math.sin(frame * speed * 0.4);
    if (Math.abs(twitch) > 0.3) {
      ctx.save();
      const lineY = ((frame * 17) % 200) - 100;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.fillRect(-200, lineY, 400, 3);
      ctx.fillStyle = 'rgba(236, 72, 153, 0.4)';
      ctx.fillRect(-200, lineY + 8, 400, 2);
      ctx.restore();
    }
  }

  // 7. Film Grain & Noise
  const grainEff = activeEffects.find((e) => e.type === 'film_grain');
  if (grainEff) {
    const amount = Number(grainEff.params.amount ?? 20);
    drawGrainNoise(ctx, 400, 300, amount, frame);
  }

  // Reset filter
  ctx.filter = previousFilter || 'none';
}

// Procedural film grain noise generator
function drawGrainNoise(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  amount: number,
  frame: number
) {
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  const count = Math.min(250, Math.round(amount * 8));
  // Deterministic noise using frame seed
  for (let i = 0; i < count; i++) {
    const nx = Math.sin(i * 12.9898 + frame * 0.3) * (w / 2);
    const ny = Math.cos(i * 78.233 + frame * 0.3) * (h / 2);
    const sz = (Math.abs(Math.sin(i * 3.14)) > 0.8 ? 2 : 1);
    ctx.fillRect(nx, ny, sz, sz);
  }
  ctx.restore();
}

// Apply Adjustment Layer effects
function applyAdjustmentEffects(
  ctx: CanvasRenderingContext2D,
  comp: Composition,
  effects: LayerEffect[]
) {
  for (const eff of effects) {
    if (!eff.enabled) continue;

    if (eff.type === 'vignette') {
      const amount = Number(eff.params.amount ?? 0.6);
      ctx.save();
      const r = Math.max(comp.width, comp.height) / 2;
      const grad = ctx.createRadialGradient(
        comp.width / 2,
        comp.height / 2,
        r * 0.4,
        comp.width / 2,
        comp.height / 2,
        r
      );
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, `rgba(0,0,0,${amount})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, comp.width, comp.height);
      ctx.restore();
    } else if (eff.type === 'color_tint') {
      const color = String(eff.params.tintColor ?? 'rgba(157, 149, 255, 0.2)');
      ctx.save();
      ctx.globalCompositeOperation = 'color';
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, comp.width, comp.height);
      ctx.restore();
    } else if (eff.type === 'film_grain') {
      const amount = Number(eff.params.amount ?? 25);
      ctx.save();
      ctx.translate(comp.width / 2, comp.height / 2);
      drawGrainNoise(ctx, comp.width, comp.height, amount, Date.now() % 100);
      ctx.restore();
    }
  }
}

// Draw Safe Margins and Rule of Thirds
function drawSafeGuides(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  // Center cross
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w / 2, h);
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();

  // Rule of thirds
  ctx.beginPath();
  ctx.moveTo(w / 3, 0);
  ctx.lineTo(w / 3, h);
  ctx.moveTo((w * 2) / 3, 0);
  ctx.lineTo((w * 2) / 3, h);
  ctx.moveTo(0, h / 3);
  ctx.lineTo(w, h / 3);
  ctx.moveTo(0, (h * 2) / 3);
  ctx.lineTo(w, (h * 2) / 3);
  ctx.stroke();

  // Safe area border (90% action safe, 80% title safe)
  ctx.strokeStyle = 'rgba(157, 149, 255, 0.4)';
  ctx.strokeRect(w * 0.05, h * 0.05, w * 0.9, h * 0.9);
  ctx.strokeRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8);

  ctx.restore();
}

// Draw selection box, handles, and anchor point crosshair
function drawLayerSelectionGizmo(
  ctx: CanvasRenderingContext2D,
  layer: AELayer,
  allLayers: AELayer[],
  frame: number,
  fps: number
) {
  const tf = computeWorldTransform(layer, allLayers, frame, fps);

  ctx.save();
  ctx.translate(tf.posX, tf.posY);
  ctx.rotate((tf.rotation * Math.PI) / 180);
  ctx.scale(tf.scaleX, tf.scaleY);

  // Estimate bounds based on layer type
  let bw = 240;
  let bh = 140;

  if (layer.type === 'shape' && layer.shapeData) {
    bw = (layer.shapeData.width || 200) + 20;
    bh = (layer.shapeData.height || 200) + 20;
  } else if (layer.type === 'text' && layer.textData) {
    bw = Math.max(160, layer.textData.text.length * layer.textData.fontSize * 0.6);
    bh = layer.textData.fontSize * 1.8;
  } else if (layer.type === 'image') {
    const url = layer.imageData?.url || layer.mediaUrl;
    if (url) {
      const img = getCachedImage(url);
      if (img && img.naturalWidth) {
        bw = layer.imageData?.naturalWidth || img.naturalWidth;
        bh = layer.imageData?.naturalHeight || img.naturalHeight;
        const maxBound = Math.max(800, 1200) * 0.8;
        if (bw > maxBound || bh > maxBound) {
          const ratio = Math.min(maxBound / bw, maxBound / bh);
          bw = Math.round(bw * ratio);
          bh = Math.round(bh * ratio);
        }
      } else {
        bw = 300;
        bh = 220;
      }
    } else {
      bw = 280;
      bh = 280;
    }
  }

  // Box centered around anchor point
  const bx = -tf.anchorX - bw / 2;
  const by = -tf.anchorY - bh / 2;

  // Bounding rect
  ctx.strokeStyle = '#9D95FF';
  ctx.lineWidth = 2 / Math.max(0.1, Math.abs(tf.scaleX));
  ctx.strokeRect(bx, by, bw, bh);

  // Corner and edge handles
  const handleSize = 8 / Math.max(0.1, Math.abs(tf.scaleX));
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#6366F1';
  ctx.lineWidth = 1.5;

  const points = [
    [bx, by],
    [bx + bw / 2, by],
    [bx + bw, by],
    [bx + bw, by + bh / 2],
    [bx + bw, by + bh],
    [bx + bw / 2, by + bh],
    [bx, by + bh],
    [bx, by + bh / 2],
  ];

  points.forEach(([px, py]) => {
    ctx.fillRect(px - handleSize / 2, py - handleSize / 2, handleSize, handleSize);
    ctx.strokeRect(px - handleSize / 2, py - handleSize / 2, handleSize, handleSize);
  });

  // Center Anchor Point Crosshair ⨁
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.moveTo(-14, 0);
  ctx.lineTo(14, 0);
  ctx.moveTo(0, -14);
  ctx.lineTo(0, 14);
  ctx.stroke();

  ctx.restore();
}
