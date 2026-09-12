import { ProcessResult } from '../types';

export type LineartStyle =
  | 'anime_pro'     // XDoG + Bilateral Surface Smoothing (Estilo Clip Studio / Manga japonés)
  | 'clean_vector'  // Canny Non-Maximum Suppression (Línea fina continua continua)
  | 'comic_ink'     // Tinta firme cómic con alto contraste
  | 'pencil_sketch' // Boceto a grafito artístico
  | 'minimalist'    // Solo siluetas y contornos exteriores
  | 'colored_ink'   // Conserva colores originales de la línea
  // compatibilidad con anteriores nombres:
  | 'manga'
  | 'ink'
  | 'pencil'
  | 'sobel'
  | 'colored';

export interface LineartOptions {
  style: LineartStyle;
  lineColor: string; // Hex '#000000', '#ffffff', etc. or 'original'
  thickness: number; // 1 to 6
  sensitivity: number; // 5 to 95 (higher = detects more subtle details)
  noiseReduction: number; // 0 to 100 (cleans faint background residue to 0 alpha)
  smoothness: number; // 0 to 5 (anti-aliasing & soft strokes)
  lineOpacity: number; // 10 to 100 (%)
  surfaceBlur: number; // 0 to 10 (Edge-preserving bilateral/surface smoothing to remove texture noise)
  removeSpeckles: boolean; // Cleans isolated stray pixel clusters (< 4px)
  invert: boolean; // Invert detection (e.g. light lines on dark bg)
  outputFormat?: 'png' | 'webp';
  onProgress?: (percent: number) => void;
}

/**
 * Fast Gaussian-like 3-pass separable horizontal and vertical blur
 * Produces true circular/bell distribution without rectangular box-blur artifacts
 */
function gaussianBlurFloat(
  src: Float32Array,
  dst: Float32Array,
  width: number,
  height: number,
  sigma: number
) {
  if (sigma <= 0.2) {
    dst.set(src);
    return;
  }

  // Calculate box sizes for 3-pass box blur that closely approximates Gaussian blur
  const n = 3;
  const wIdeal = Math.sqrt((12 * sigma * sigma) / n + 1);
  let wl = Math.floor(wIdeal);
  if (wl % 2 === 0) wl--;
  const wu = wl + 2;
  const mIdeal = (12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4);
  const m = Math.round(mIdeal);

  const radii = [
    m > 0 ? (wl - 1) / 2 : (wu - 1) / 2,
    m > 1 ? (wl - 1) / 2 : (wu - 1) / 2,
    m > 2 ? (wl - 1) / 2 : (wu - 1) / 2
  ];

  let currentSrc = src;
  let currentDst = dst;
  const temp = new Float32Array(src.length);

  for (let pass = 0; pass < 3; pass++) {
    const r = Math.max(1, Math.round(radii[pass]));
    singleBoxBlurPass(currentSrc, currentDst, temp, width, height, r);
    currentSrc = currentDst;
  }
}

function singleBoxBlurPass(
  src: Float32Array,
  dst: Float32Array,
  temp: Float32Array,
  width: number,
  height: number,
  radius: number
) {
  const winSize = radius * 2 + 1;
  const invWin = 1.0 / winSize;

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    let sum = 0;
    for (let i = -radius; i <= radius; i++) {
      const clampedX = Math.min(Math.max(i, 0), width - 1);
      sum += src[rowOffset + clampedX];
    }
    for (let x = 0; x < width; x++) {
      temp[rowOffset + x] = sum * invWin;
      const leftX = Math.max(x - radius, 0);
      const rightX = Math.min(x + radius + 1, width - 1);
      sum += src[rowOffset + rightX] - src[rowOffset + leftX];
    }
  }

  // Vertical pass
  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let i = -radius; i <= radius; i++) {
      const clampedY = Math.min(Math.max(i, 0), height - 1);
      sum += temp[clampedY * width + x];
    }
    for (let y = 0; y < height; y++) {
      dst[y * width + x] = sum * invWin;
      const topY = Math.max(y - radius, 0);
      const bottomY = Math.min(y + radius + 1, height - 1);
      sum += temp[bottomY * width + x] - temp[topY * width + x];
    }
  }
}

/**
 * Fast Surface Blur / Edge-Preserving Filter (Smart Smoothing)
 * Cleans fabric texture, skin pores, JPEG noise and paper grain without blurring the key outlines!
 */
function applySurfaceBlur(
  src: Float32Array,
  dst: Float32Array,
  width: number,
  height: number,
  radius: number,
  threshold: number // edge tolerance (e.g. 0.12)
) {
  if (radius <= 0) {
    dst.set(src);
    return;
  }

  const r = Math.min(4, Math.max(1, Math.round(radius)));
  const invThreshSq = 1.0 / (threshold * threshold + 0.0001);

  for (let y = 0; y < height; y++) {
    const yMin = Math.max(0, y - r);
    const yMax = Math.min(height - 1, y + r);
    const rowOffset = y * width;

    for (let x = 0; x < width; x++) {
      const centerVal = src[rowOffset + x];
      const xMin = Math.max(0, x - r);
      const xMax = Math.min(width - 1, x + r);

      let weightSum = 0;
      let valSum = 0;

      for (let ny = yMin; ny <= yMax; ny++) {
        const nRow = ny * width;
        for (let nx = xMin; nx <= xMax; nx++) {
          const val = src[nRow + nx];
          const diff = centerVal - val;
          // Spatial distance squared + intensity difference weight
          const intensityWeight = Math.exp(-diff * diff * invThreshSq);
          weightSum += intensityWeight;
          valSum += val * intensityWeight;
        }
      }

      dst[rowOffset + x] = weightSum > 0 ? valSum / weightSum : centerVal;
    }
  }
}

/**
 * Parse Hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16) || 0,
      g: parseInt(clean[1] + clean[1], 16) || 0,
      b: parseInt(clean[2] + clean[2], 16) || 0
    };
  }
  return {
    r: parseInt(clean.substring(0, 2), 16) || 0,
    g: parseInt(clean.substring(2, 4), 16) || 0,
    b: parseInt(clean.substring(4, 6), 16) || 0
  };
}

/**
 * Circular Euclidean morphological dilation with subpixel Anti-Aliasing
 * Replaces ugly blocky square dilation with smooth, organic, rounded strokes!
 */
function circularDilation(
  src: Float32Array,
  dst: Float32Array,
  width: number,
  height: number,
  thickness: number
) {
  if (thickness <= 1) {
    dst.set(src);
    return;
  }

  const radius = (thickness - 0.7) * 0.75;
  const rCeil = Math.ceil(radius);

  // Precompute circular kernel weights
  const kernelSize = rCeil * 2 + 1;
  const kernelWeights = new Float32Array(kernelSize * kernelSize);
  for (let dy = -rCeil; dy <= rCeil; dy++) {
    for (let dx = -rCeil; dx <= rCeil; dx++) {
      const dist = Math.hypot(dx, dy);
      let w = 0;
      if (dist <= radius) {
        w = 1.0;
      } else if (dist <= radius + 0.75) {
        w = 1.0 - (dist - radius) / 0.75;
      }
      kernelWeights[(dy + rCeil) * kernelSize + (dx + rCeil)] = w;
    }
  }

  for (let y = 0; y < height; y++) {
    const yMin = Math.max(0, y - rCeil);
    const yMax = Math.min(height - 1, y + rCeil);
    const rowOffset = y * width;

    for (let x = 0; x < width; x++) {
      const xMin = Math.max(0, x - rCeil);
      const xMax = Math.min(width - 1, x + rCeil);

      let maxVal = 0;
      for (let ny = yMin; ny <= yMax; ny++) {
        const dy = ny - y;
        const nRow = ny * width;
        const kRow = (dy + rCeil) * kernelSize;

        for (let nx = xMin; nx <= xMax; nx++) {
          const dx = nx - x;
          const kw = kernelWeights[kRow + (dx + rCeil)];
          if (kw > 0) {
            const val = src[nRow + nx] * kw;
            if (val > maxVal) maxVal = val;
          }
        }
      }
      dst[rowOffset + x] = maxVal;
    }
  }
}

/**
 * Remove isolated stray noise specks (Despeckle)
 * Removes clusters of < 3 pixels to guarantee completely clean negative space
 */
function removeIsolatedSpeckles(
  buffer: Float32Array,
  width: number,
  height: number,
  threshold: number
) {
  const toClear: number[] = [];

  for (let y = 1; y < height - 1; y++) {
    const row = y * width;
    const rowAbove = (y - 1) * width;
    const rowBelow = (y + 1) * width;

    for (let x = 1; x < width - 1; x++) {
      const idx = row + x;
      if (buffer[idx] > threshold) {
        // Count strong neighbors in 3x3
        let neighbors = 0;
        if (buffer[rowAbove + x - 1] > threshold) neighbors++;
        if (buffer[rowAbove + x] > threshold) neighbors++;
        if (buffer[rowAbove + x + 1] > threshold) neighbors++;
        if (buffer[row + x - 1] > threshold) neighbors++;
        if (buffer[row + x + 1] > threshold) neighbors++;
        if (buffer[rowBelow + x - 1] > threshold) neighbors++;
        if (buffer[rowBelow + x] > threshold) neighbors++;
        if (buffer[rowBelow + x + 1] > threshold) neighbors++;

        // If isolated speck with only 0 or 1 neighbor, eliminate it
        if (neighbors <= 1) {
          toClear.push(idx);
        }
      }
    }
  }

  for (let i = 0; i < toClear.length; i++) {
    buffer[toClear[i]] = 0;
  }
}

/**
 * Apply the transparent lineart algorithm to an ImageData buffer
 */
export function applyLineartToImageData(
  srcData: ImageData,
  dstData: ImageData,
  width: number,
  height: number,
  options: LineartOptions
): void {
  const totalPixels = width * height;
  const src = srcData.data;
  const dst = dstData.data;

  // Normalize style identifier
  let activeStyle = options.style;
  if (activeStyle === 'manga') activeStyle = 'anime_pro';
  if (activeStyle === 'ink') activeStyle = 'comic_ink';
  if (activeStyle === 'pencil') activeStyle = 'pencil_sketch';
  if (activeStyle === 'sobel') activeStyle = 'minimalist';
  if (activeStyle === 'colored') activeStyle = 'colored_ink';

  // 1. Extract grayscale values (normalized 0..1) with alpha-aware paper blend
  const rawGray = new Float32Array(totalPixels);
  for (let i = 0, p = 0; i < src.length; i += 4, p++) {
    const alphaNorm = src[i + 3] / 255;
    if (alphaNorm < 0.05) {
      rawGray[p] = 1.0;
    } else {
      // Perceived luminance (Rec. 709)
      const lum = (0.2126 * src[i] + 0.7152 * src[i + 1] + 0.0722 * src[i + 2]) / 255;
      rawGray[p] = lum * alphaNorm + (1.0 - alphaNorm);
    }
  }

  // 2. Surface Blur / Bilateral Filtering (Edge-preserving pre-smoothing)
  // This is the CRITICAL step that makes lines look clean and eliminates dirty textures!
  const surfaceRadius = options.surfaceBlur !== undefined ? options.surfaceBlur : 2;
  const cleanGray = new Float32Array(totalPixels);
  if (surfaceRadius > 0) {
    applySurfaceBlur(rawGray, cleanGray, width, height, surfaceRadius, 0.15);
  } else {
    cleanGray.set(rawGray);
  }

  // 3. Edge / Line detection array (0 = background, 1 = solid line)
  const lineIntensity = new Float32Array(totalPixels);
  const sens = Math.max(0.05, Math.min(0.98, options.sensitivity / 100));

  // --- STYLE 1: ANIME & MANGA PRO (Extended Difference of Gaussians - XDoG) ---
  if (activeStyle === 'anime_pro') {
    // Sigma 1 = fine edge, Sigma 2 = surround
    const sigma1 = 0.8;
    const sigma2 = 1.5 + (1.0 - sens) * 0.8; // adapts with sensitivity

    const g1 = new Float32Array(totalPixels);
    const g2 = new Float32Array(totalPixels);
    gaussianBlurFloat(cleanGray, g1, width, height, sigma1);
    gaussianBlurFloat(cleanGray, g2, width, height, sigma2);

    // XDoG parameters calibrated for G-Pen manga inking
    const gamma = 0.97 - (1.0 - sens) * 0.06;
    const epsilon = -0.015 * (1.1 - sens * 0.3); // edge threshold
    const phi = 40 + sens * 70; // steepness of ink ramp

    for (let p = 0; p < totalPixels; p++) {
      let diff = (1 + gamma) * g1[p] - gamma * g2[p];
      if (options.invert) diff = 1.0 - diff;

      // XDoG sigmoidal transfer function:
      // T(u) = u >= epsilon ? 1 : 1 + tanh(phi * (u - epsilon))
      const u = diff - 1.0;
      if (u < epsilon) {
        // Tanh curve creates smooth tapered stroke endings!
        const val = 1.0 - (1.0 + Math.tanh(phi * (u - epsilon))) * 0.5;
        lineIntensity[p] = Math.max(0, Math.min(1.0, val * 1.5));
      } else {
        lineIntensity[p] = 0;
      }
    }
  }

  // --- STYLE 2: CLEAN VECTOR / CANNY NON-MAXIMUM SUPPRESSION (Sharp single continuous lines) ---
  else if (activeStyle === 'clean_vector') {
    const smoothed = new Float32Array(totalPixels);
    gaussianBlurFloat(cleanGray, smoothed, width, height, 1.0);

    const gxArr = new Float32Array(totalPixels);
    const gyArr = new Float32Array(totalPixels);
    const magArr = new Float32Array(totalPixels);

    // Sobel gradients
    for (let y = 1; y < height - 1; y++) {
      const rowTop = (y - 1) * width;
      const rowMid = y * width;
      const rowBot = (y + 1) * width;

      for (let x = 1; x < width - 1; x++) {
        const gx =
          -smoothed[rowTop + x - 1] + smoothed[rowTop + x + 1] +
          -2 * smoothed[rowMid + x - 1] + 2 * smoothed[rowMid + x + 1] +
          -smoothed[rowBot + x - 1] + smoothed[rowBot + x + 1];

        const gy =
          -smoothed[rowTop + x - 1] - 2 * smoothed[rowTop + x] - smoothed[rowTop + x + 1] +
          smoothed[rowBot + x - 1] + 2 * smoothed[rowBot + x] + smoothed[rowBot + x + 1];

        const idx = rowMid + x;
        gxArr[idx] = gx;
        gyArr[idx] = gy;
        magArr[idx] = Math.sqrt(gx * gx + gy * gy);
      }
    }

    // Non-Maximum Suppression (thins edges to 1-pixel crest)
    const thresholdHigh = 0.22 - sens * 0.16;
    const thresholdLow = thresholdHigh * 0.4;

    for (let y = 2; y < height - 2; y++) {
      const rowMid = y * width;
      for (let x = 2; x < width - 2; x++) {
        const idx = rowMid + x;
        const mag = magArr[idx];
        if (mag < thresholdLow) {
          lineIntensity[idx] = 0;
          continue;
        }

        // Quantize direction to 0, 45, 90, 135 deg
        const gx = gxArr[idx];
        const gy = gyArr[idx];
        const angle = (Math.atan2(gy, gx) * 180 / Math.PI + 180) % 180;

        let magNeighbor1 = 0;
        let magNeighbor2 = 0;

        if ((angle >= 0 && angle < 22.5) || (angle >= 157.5 && angle <= 180)) {
          magNeighbor1 = magArr[idx - 1];
          magNeighbor2 = magArr[idx + 1];
        } else if (angle >= 22.5 && angle < 67.5) {
          magNeighbor1 = magArr[(y - 1) * width + x + 1];
          magNeighbor2 = magArr[(y + 1) * width + x - 1];
        } else if (angle >= 67.5 && angle < 112.5) {
          magNeighbor1 = magArr[(y - 1) * width + x];
          magNeighbor2 = magArr[(y + 1) * width + x];
        } else {
          magNeighbor1 = magArr[(y - 1) * width + x - 1];
          magNeighbor2 = magArr[(y + 1) * width + x + 1];
        }

        // Only keep peak crest
        if (mag >= magNeighbor1 && mag >= magNeighbor2) {
          const strength = (mag - thresholdLow) / (thresholdHigh - thresholdLow + 0.001);
          lineIntensity[idx] = Math.min(1.0, Math.max(0.4, strength));
        } else {
          lineIntensity[idx] = 0;
        }
      }
    }
  }

  // --- STYLE 3: COMIC INK / FIRM ENKED CONTOURS (High contrast & bold dynamic ink) ---
  else if (activeStyle === 'comic_ink') {
    const smoothed = new Float32Array(totalPixels);
    gaussianBlurFloat(cleanGray, smoothed, width, height, 0.9);

    const thresholdVal = 0.22 - sens * 0.16;
    for (let y = 1; y < height - 1; y++) {
      const rowTop = (y - 1) * width;
      const rowMid = y * width;
      const rowBot = (y + 1) * width;

      for (let x = 1; x < width - 1; x++) {
        const gx =
          -smoothed[rowTop + x - 1] + smoothed[rowTop + x + 1] +
          -2 * smoothed[rowMid + x - 1] + 2 * smoothed[rowMid + x + 1] +
          -smoothed[rowBot + x - 1] + smoothed[rowBot + x + 1];

        const gy =
          -smoothed[rowTop + x - 1] - 2 * smoothed[rowTop + x] - smoothed[rowTop + x + 1] +
          smoothed[rowBot + x - 1] + 2 * smoothed[rowBot + x] + smoothed[rowBot + x + 1];

        const mag = Math.sqrt(gx * gx + gy * gy);
        if (mag > thresholdVal) {
          const norm = (mag - thresholdVal) / (1.0 - thresholdVal + 0.001);
          // S-curve for rich comic book ink
          const val = norm * norm * (3 - 2 * norm);
          lineIntensity[rowMid + x] = Math.min(1.0, val * 1.8);
        } else {
          lineIntensity[rowMid + x] = 0;
        }
      }
    }
  }

  // --- STYLE 4: PENCIL SKETCH (Soft graphite texture) ---
  else if (activeStyle === 'pencil_sketch') {
    const blur = new Float32Array(totalPixels);
    gaussianBlurFloat(cleanGray, blur, width, height, 1.8);

    for (let p = 0; p < totalPixels; p++) {
      const base = cleanGray[p];
      const invBlur = 1.0 - blur[p];
      // Color Dodge blend
      let dodge = 1.0;
      if (invBlur < 0.999) {
        dodge = Math.min(1.0, base / (1.0 - invBlur));
      }
      let stroke = 1.0 - dodge;
      if (options.invert) stroke = 1.0 - stroke;
      stroke = stroke * (1.6 + sens * 3.0);
      lineIntensity[p] = Math.max(0, Math.min(1.0, stroke));
    }
  }

  // --- STYLE 5: MINIMALIST / OUTLINE SILHOUETTE & COLORED INK ---
  else {
    const smoothed = new Float32Array(totalPixels);
    gaussianBlurFloat(cleanGray, smoothed, width, height, 1.2);

    const thresholdVal = 0.28 - sens * 0.22;
    for (let y = 1; y < height - 1; y++) {
      const rowTop = (y - 1) * width;
      const rowMid = y * width;
      const rowBot = (y + 1) * width;

      for (let x = 1; x < width - 1; x++) {
        const gx =
          -smoothed[rowTop + x - 1] + smoothed[rowTop + x + 1] +
          -2 * smoothed[rowMid + x - 1] + 2 * smoothed[rowMid + x + 1] +
          -smoothed[rowBot + x - 1] + smoothed[rowBot + x + 1];

        const gy =
          -smoothed[rowTop + x - 1] - 2 * smoothed[rowTop + x] - smoothed[rowTop + x + 1] +
          smoothed[rowBot + x - 1] + 2 * smoothed[rowBot + x] + smoothed[rowBot + x + 1];

        const mag = Math.sqrt(gx * gx + gy * gy);
        if (mag > thresholdVal) {
          let strength = (mag - thresholdVal) / (1.0 - thresholdVal);
          strength = Math.pow(strength, 0.75);
          lineIntensity[rowMid + x] = Math.min(1.0, strength * (1.3 + sens));
        } else {
          lineIntensity[rowMid + x] = 0;
        }
      }
    }
  }

  // 4. Circular Euclidean Dilation for Smooth Stroke Thickness (> 1)
  let processedIntensity = lineIntensity;
  if (options.thickness > 1) {
    const dilated = new Float32Array(totalPixels);
    circularDilation(lineIntensity, dilated, width, height, options.thickness);
    processedIntensity = dilated;
  }

  // 5. Anti-Aliasing Smoothing
  if (options.smoothness > 0) {
    const smoothed = new Float32Array(totalPixels);
    gaussianBlurFloat(processedIntensity, smoothed, width, height, options.smoothness * 0.55);
    processedIntensity = smoothed;
  }

  // 6. Despeckle: Eliminate orphan noise specks if enabled or high noise reduction
  const shouldDespeckle = options.removeSpeckles ?? (options.noiseReduction > 15);
  if (shouldDespeckle) {
    removeIsolatedSpeckles(processedIntensity, width, height, 0.15);
  }

  // 7. Background Noise Cutoff & Final Alpha Compositing
  const noiseCutoff = (options.noiseReduction / 100) * 0.35;
  const isColored = options.lineColor.toLowerCase() === 'original' || activeStyle === 'colored_ink';
  const targetRgb = isColored ? { r: 0, g: 0, b: 0 } : hexToRgb(options.lineColor);
  const globalOpacity = options.lineOpacity / 100;

  for (let p = 0, i = 0; p < totalPixels; p++, i += 4) {
    const rawVal = processedIntensity[p];

    // Under the threshold, completely transparent alpha
    if (rawVal <= noiseCutoff) {
      dst[i] = 0;
      dst[i + 1] = 0;
      dst[i + 2] = 0;
      dst[i + 3] = 0;
      continue;
    }

    // Remap remaining range smoothly to 0..1
    const finalAlpha = Math.min(1.0, (rawVal - noiseCutoff) / (1.0 - noiseCutoff)) * globalOpacity;
    if (finalAlpha <= 0.01) {
      dst[i] = 0;
      dst[i + 1] = 0;
      dst[i + 2] = 0;
      dst[i + 3] = 0;
      continue;
    }

    if (isColored) {
      dst[i] = src[i];
      dst[i + 1] = src[i + 1];
      dst[i + 2] = src[i + 2];
    } else {
      dst[i] = targetRgb.r;
      dst[i + 1] = targetRgb.g;
      dst[i + 2] = targetRgb.b;
    }

    dst[i + 3] = Math.round(finalAlpha * 255);
  }
}

/**
 * Render lineart from an image element into an HTML5 Canvas
 */
export function renderLineartToCanvas(
  img: HTMLImageElement | HTMLCanvasElement,
  options: LineartOptions,
  maxDimension?: number
): HTMLCanvasElement {
  const origW = (img as HTMLImageElement).naturalWidth || img.width;
  const origH = (img as HTMLImageElement).naturalHeight || img.height;

  let w = origW;
  let h = origH;
  if (maxDimension && (w > maxDimension || h > maxDimension)) {
    const scale = maxDimension / Math.max(w, h);
    w = Math.max(1, Math.round(w * scale));
    h = Math.max(1, Math.round(h * scale));
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('No se pudo inicializar el contexto 2D del lienzo');

  ctx.drawImage(img, 0, 0, w, h);
  const srcData = ctx.getImageData(0, 0, w, h);
  const dstData = ctx.createImageData(w, h);

  applyLineartToImageData(srcData, dstData, w, h, options);
  ctx.putImageData(dstData, 0, 0);

  return canvas;
}

/**
 * Process File or Blob to extract transparent Lineart PNG
 */
export async function extractLineartImage(
  file: File | Blob,
  options: LineartOptions
): Promise<ProcessResult> {
  const startTime = performance.now();
  if (options.onProgress) options.onProgress(10);

  const img = new Image();
  const objectUrl = URL.createObjectURL(file);
  img.crossOrigin = 'anonymous';

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Error al cargar la imagen para extraer lineart.'));
    img.src = objectUrl;
  });

  if (options.onProgress) options.onProgress(35);

  const canvas = renderLineartToCanvas(img, options);
  URL.revokeObjectURL(objectUrl);

  if (options.onProgress) options.onProgress(75);

  const format = options.outputFormat === 'webp' ? 'image/webp' : 'image/png';
  const extension = options.outputFormat === 'webp' ? 'webp' : 'png';

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Error al generar el archivo PNG transparente.'));
    }, format, 1.0);
  });

  if (options.onProgress) options.onProgress(100);

  const originalFileName = (file as File).name || 'imagen';
  const baseName = originalFileName.substring(0, originalFileName.lastIndexOf('.')) || originalFileName;
  const fileName = `lineart_${baseName}.${extension}`;
  const resUrl = URL.createObjectURL(blob);
  const timeTakenMs = Math.round(performance.now() - startTime);

  return {
    blob,
    url: resUrl,
    fileName,
    newSize: blob.size,
    originalSize: file.size,
    width: canvas.width,
    height: canvas.height,
    format: extension.toUpperCase(),
    timeTakenMs,
    extraInfo: `Estilo: ${options.style.toUpperCase()} · Grosor: ${options.thickness}px · Transparente HD`
  };
}
