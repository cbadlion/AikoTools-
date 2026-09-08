import JSZip from 'jszip';

export interface WebPAnimationOptions {
  width?: number;
  height?: number;
  fps?: number; // e.g. 10 fps
  delayMs?: number; // duration per frame in ms (overrides fps if provided)
  quality?: number; // 0.1 to 1.0 (default 0.85)
  loopCount?: number; // 0 = infinite loop
  fit?: 'contain' | 'cover' | 'fill' | 'original';
  backgroundColor?: string;
  onProgress?: (progress: number, current: number, total: number) => void;
}

export interface BatchImageItem {
  id: string;
  file: File;
  name: string;
  size: number;
  previewUrl: string;
  width?: number;
  height?: number;
}

export interface MuxResult {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  frameCount: number;
  durationMs: number;
  totalSize: number;
}

/**
 * Parses a single-frame WebP buffer and extracts ALPH, VP8, or VP8L subchunks.
 * Standard WebP from canvas toBlob produces either:
 * - VP8  (lossy, no alpha)
 * - VP8L (lossless)
 * - VP8X + ALPH + VP8  (lossy with alpha)
 */
export function extractWebPFrameSubchunks(webpBuffer: ArrayBuffer): {
  subchunks: Uint8Array[];
  hasAlpha: boolean;
} {
  const bytes = new Uint8Array(webpBuffer);
  if (bytes.length < 12) {
    throw new Error('El buffer WebP es demasiado corto');
  }

  const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  const webp = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
  if (riff !== 'RIFF' || webp !== 'WEBP') {
    throw new Error('El archivo no es un formato RIFF WebP válido');
  }

  const subchunks: Uint8Array[] = [];
  let hasAlpha = false;
  let offset = 12;

  while (offset + 8 <= bytes.length) {
    const fourCC = String.fromCharCode(
      bytes[offset],
      bytes[offset + 1],
      bytes[offset + 2],
      bytes[offset + 3]
    );

    const chunkSize =
      bytes[offset + 4] |
      (bytes[offset + 5] << 8) |
      (bytes[offset + 6] << 16) |
      (bytes[offset + 7] << 24);

    // RIFF chunk payload must be padded to even number of bytes
    const paddedChunkSize = 8 + chunkSize + (chunkSize % 2 !== 0 ? 1 : 0);
    const end = Math.min(offset + paddedChunkSize, bytes.length);

    if (fourCC === 'ALPH') {
      hasAlpha = true;
      subchunks.push(bytes.slice(offset, end));
    } else if (fourCC === 'VP8 ' || fourCC === 'VP8L') {
      subchunks.push(bytes.slice(offset, end));
    }

    offset += paddedChunkSize;
  }

  if (subchunks.length === 0) {
    throw new Error('No se encontraron fotogramas VP8/VP8L válidos en el fotograma WebP');
  }

  return { subchunks, hasAlpha };
}

/**
 * Creates an ANMF (Animation Frame) chunk per RFC 9649
 */
function createANMFChunk(
  width: number,
  height: number,
  durationMs: number,
  subchunks: Uint8Array[]
): Uint8Array {
  let subchunksLength = 0;
  for (const s of subchunks) {
    subchunksLength += s.length;
  }

  // ANMF payload: 16 bytes header + subchunks
  const payloadSize = 16 + subchunksLength;
  const isOdd = payloadSize % 2 !== 0;
  const totalChunkSize = 8 + payloadSize + (isOdd ? 1 : 0);

  const buffer = new Uint8Array(totalChunkSize);

  // FourCC: 'ANMF'
  buffer[0] = 0x41; // 'A'
  buffer[1] = 0x4E; // 'N'
  buffer[2] = 0x4D; // 'M'
  buffer[3] = 0x46; // 'F'

  // Chunk size (uint32 LE, payload only)
  buffer[4] = payloadSize & 0xff;
  buffer[5] = (payloadSize >> 8) & 0xff;
  buffer[6] = (payloadSize >> 16) & 0xff;
  buffer[7] = (payloadSize >> 24) & 0xff;

  // Frame X (3 bytes LE) = 0
  buffer[8] = 0;
  buffer[9] = 0;
  buffer[10] = 0;

  // Frame Y (3 bytes LE) = 0
  buffer[11] = 0;
  buffer[12] = 0;
  buffer[13] = 0;

  // Frame Width - 1 (3 bytes LE)
  const wMinusOne = Math.max(0, width - 1);
  buffer[14] = wMinusOne & 0xff;
  buffer[15] = (wMinusOne >> 8) & 0xff;
  buffer[16] = (wMinusOne >> 16) & 0xff;

  // Frame Height - 1 (3 bytes LE)
  const hMinusOne = Math.max(0, height - 1);
  buffer[17] = hMinusOne & 0xff;
  buffer[18] = (hMinusOne >> 8) & 0xff;
  buffer[19] = (hMinusOne >> 16) & 0xff;

  // Frame Duration (3 bytes LE in ms)
  const dur = Math.max(1, Math.round(durationMs));
  buffer[20] = dur & 0xff;
  buffer[21] = (dur >> 8) & 0xff;
  buffer[22] = (dur >> 16) & 0xff;

  // Flags: bit 1 = do not blend (1 = replace/overwrite), bit 0 = do not dispose (0)
  // 0x02 prevents ghosting and keeps colors crisp
  buffer[23] = 0x02;

  // Write subchunks
  let writeOffset = 24;
  for (const s of subchunks) {
    buffer.set(s, writeOffset);
    writeOffset += s.length;
  }

  // RIFF pad byte if payload is odd
  if (isOdd) {
    buffer[writeOffset] = 0;
  }

  return buffer;
}

/**
 * Creates the complete RIFF WEBP container with VP8X and ANIM chunks
 */
function createAnimatedWebPContainer(
  canvasWidth: number,
  canvasHeight: number,
  loopCount: number,
  hasAlpha: boolean,
  anmfChunks: Uint8Array[]
): Blob {
  // VP8X Chunk (18 bytes total: 8 bytes header + 10 bytes payload)
  const vp8x = new Uint8Array(18);
  // 'VP8X'
  vp8x[0] = 0x56;
  vp8x[1] = 0x50;
  vp8x[2] = 0x38;
  vp8x[3] = 0x58;
  // Size = 10 (LE)
  vp8x[4] = 10;
  vp8x[5] = 0;
  vp8x[6] = 0;
  vp8x[7] = 0;
  // Flags: Animation flag (bit 1 = 0x02) | Alpha flag (bit 4 = 0x10)
  vp8x[8] = 0x02 | (hasAlpha ? 0x10 : 0x00);
  // Reserved (3 bytes)
  vp8x[9] = 0;
  vp8x[10] = 0;
  vp8x[11] = 0;
  // Canvas Width - 1 (3 bytes LE)
  const wMinusOne = Math.max(0, canvasWidth - 1);
  vp8x[12] = wMinusOne & 0xff;
  vp8x[13] = (wMinusOne >> 8) & 0xff;
  vp8x[14] = (wMinusOne >> 16) & 0xff;
  // Canvas Height - 1 (3 bytes LE)
  const hMinusOne = Math.max(0, canvasHeight - 1);
  vp8x[15] = hMinusOne & 0xff;
  vp8x[16] = (hMinusOne >> 8) & 0xff;
  vp8x[17] = (hMinusOne >> 16) & 0xff;

  // ANIM Chunk (14 bytes total: 8 bytes header + 6 bytes payload)
  const anim = new Uint8Array(14);
  // 'ANIM'
  anim[0] = 0x41;
  anim[1] = 0x4E;
  anim[2] = 0x49;
  anim[3] = 0x4D;
  // Size = 6 (LE)
  anim[4] = 6;
  anim[5] = 0;
  anim[6] = 0;
  anim[7] = 0;
  // Background color = 0x00000000 (transparent / black)
  anim[8] = 0;
  anim[9] = 0;
  anim[10] = 0;
  anim[11] = 0;
  // Loop count (uint16 LE, 0 = infinite loop)
  anim[12] = loopCount & 0xff;
  anim[13] = (loopCount >> 8) & 0xff;

  // Total size after RIFF header
  let totalPayloadSize = 4 + vp8x.length + anim.length;
  for (const chunk of anmfChunks) {
    totalPayloadSize += chunk.length;
  }

  // RIFF Header (12 bytes)
  const riffHeader = new Uint8Array(12);
  // 'RIFF'
  riffHeader[0] = 0x52;
  riffHeader[1] = 0x49;
  riffHeader[2] = 0x46;
  riffHeader[3] = 0x46;
  // File size - 8 = totalPayloadSize
  riffHeader[4] = totalPayloadSize & 0xff;
  riffHeader[5] = (totalPayloadSize >> 8) & 0xff;
  riffHeader[6] = (totalPayloadSize >> 16) & 0xff;
  riffHeader[7] = (totalPayloadSize >> 24) & 0xff;
  // 'WEBP'
  riffHeader[8] = 0x57;
  riffHeader[9] = 0x45;
  riffHeader[10] = 0x42;
  riffHeader[11] = 0x50;

  return new Blob([riffHeader, vp8x, anim, ...anmfChunks], { type: 'image/webp' });
}

/**
 * Loads an image from a URL or File with natural dimensions
 */
export function loadImageElement(source: string | File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    let url = '';
    if (typeof source === 'string') {
      url = source;
    } else {
      url = URL.createObjectURL(source);
    }

    img.onload = () => {
      if (typeof source !== 'string') {
        URL.revokeObjectURL(url);
      }
      resolve(img);
    };

    img.onerror = (err) => {
      if (typeof source !== 'string') {
        URL.revokeObjectURL(url);
      }
      reject(err);
    };

    img.src = url;
  });
}

/**
 * Converts multiple images (e.g. 50 images) into a single animated WebP file!
 */
export async function createAnimatedWebPFromImages(
  images: (File | Blob | string)[],
  options: WebPAnimationOptions = {}
): Promise<MuxResult> {
  if (!images || images.length === 0) {
    throw new Error('Se requiere al menos una imagen para crear el WebP');
  }

  const fps = options.fps || 10;
  // If fps is 30, use 34ms (1000/34 = 29.41 FPS) to guarantee strict compliance with <= 30.0 FPS limits in Vyzer / Discord
  const frameDurationMs = options.delayMs || (fps === 30 ? 34 : Math.max(10, Math.ceil(1000 / fps)));
  const quality = Math.max(0.05, Math.min(1.0, options.quality ?? 0.85));
  const loopCount = options.loopCount ?? 0; // 0 = infinite

  // 1. Preload first image or compute canvas dimensions
  const firstImg = await loadImageElement(images[0]);
  let targetWidth = options.width || firstImg.naturalWidth || 800;
  let targetHeight = options.height || firstImg.naturalHeight || 800;

  // Clamp dimensions to sensible maximum for canvas performance
  const maxDim = 2560;
  if (targetWidth > maxDim || targetHeight > maxDim) {
    const ratio = Math.min(maxDim / targetWidth, maxDim / targetHeight);
    targetWidth = Math.round(targetWidth * ratio);
    targetHeight = Math.round(targetHeight * ratio);
  }

  // WebP dimensions must be even
  targetWidth = targetWidth % 2 === 0 ? targetWidth : targetWidth + 1;
  targetHeight = targetHeight % 2 === 0 ? targetHeight : targetHeight + 1;

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: false });

  if (!ctx) {
    throw new Error('No se pudo inicializar el contexto 2D de Canvas');
  }

  const anmfChunks: Uint8Array[] = [];
  let anyAlpha = false;

  // Process frames incrementally to avoid freezing browser UI
  for (let i = 0; i < images.length; i++) {
    if (options.onProgress) {
      options.onProgress(Math.round(((i + 0.1) / images.length) * 100), i + 1, images.length);
    }

    // Let the main thread breathe for smooth 60fps UI
    await new Promise((r) => setTimeout(r, 0));

    const img = i === 0 ? firstImg : await loadImageElement(images[i]);

    // Clear canvas
    ctx.clearRect(0, 0, targetWidth, targetHeight);
    if (options.backgroundColor && options.backgroundColor !== 'transparent') {
      ctx.fillStyle = options.backgroundColor;
      ctx.fillRect(0, 0, targetWidth, targetHeight);
    }

    // Draw image according to fit mode
    const fit = options.fit || 'contain';
    if (fit === 'original' || fit === 'contain') {
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const canvasRatio = targetWidth / targetHeight;
      let drawW = targetWidth;
      let drawH = targetHeight;
      let drawX = 0;
      let drawY = 0;

      if (imgRatio > canvasRatio) {
        drawW = targetWidth;
        drawH = targetWidth / imgRatio;
        drawY = (targetHeight - drawH) / 2;
      } else {
        drawH = targetHeight;
        drawW = targetHeight * imgRatio;
        drawX = (targetWidth - drawW) / 2;
      }
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    } else if (fit === 'cover') {
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const canvasRatio = targetWidth / targetHeight;
      let drawW = targetWidth;
      let drawH = targetHeight;
      let drawX = 0;
      let drawY = 0;

      if (imgRatio > canvasRatio) {
        drawH = targetHeight;
        drawW = targetHeight * imgRatio;
        drawX = (targetWidth - drawW) / 2;
      } else {
        drawW = targetWidth;
        drawH = targetWidth / imgRatio;
        drawY = (targetHeight - drawH) / 2;
      }
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    } else {
      // fill / stretch
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    }

    // Convert frame to WebP Blob via Canvas
    const frameBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (b) => resolve(b),
        'image/webp',
        quality
      );
    });

    if (!frameBlob) {
      throw new Error(`Error al exportar el fotograma ${i + 1} a WebP`);
    }

    const frameBuffer = await frameBlob.arrayBuffer();
    const { subchunks, hasAlpha } = extractWebPFrameSubchunks(frameBuffer);
    if (hasAlpha) anyAlpha = true;

    const anmfChunk = createANMFChunk(targetWidth, targetHeight, frameDurationMs, subchunks);
    anmfChunks.push(anmfChunk);

    if (options.onProgress) {
      options.onProgress(Math.round(((i + 1) / images.length) * 100), i + 1, images.length);
    }
  }

  // Assemble the final animated WebP blob
  const animatedBlob = createAnimatedWebPContainer(
    targetWidth,
    targetHeight,
    loopCount,
    anyAlpha,
    anmfChunks
  );

  const url = URL.createObjectURL(animatedBlob);

  return {
    blob: animatedBlob,
    url,
    width: targetWidth,
    height: targetHeight,
    frameCount: images.length,
    durationMs: images.length * frameDurationMs,
    totalSize: animatedBlob.size
  };
}

/**
 * Batch converts multiple images to individual WebP files and packs them into a single .ZIP archive
 */
export async function batchConvertToWebpZip(
  items: { file: File | Blob; name: string }[],
  options: {
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
    onProgress?: (progress: number, current: number, total: number) => void;
  } = {}
): Promise<{
  zipBlob: Blob;
  zipUrl: string;
  totalOriginalSize: number;
  totalWebpSize: number;
  convertedFiles: { name: string; blob: Blob; url: string; originalSize: number; newSize: number }[];
}> {
  const zip = new JSZip();
  const quality = Math.max(0.05, Math.min(1.0, options.quality ?? 0.85));
  let totalOriginalSize = 0;
  let totalWebpSize = 0;
  const convertedFiles: { name: string; blob: Blob; url: string; originalSize: number; newSize: number }[] = [];

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    totalOriginalSize += item.file.size;

    if (options.onProgress) {
      options.onProgress(Math.round(((i + 0.2) / items.length) * 100), i + 1, items.length);
    }

    await new Promise((r) => setTimeout(r, 0));

    const img = await loadImageElement(item.file);
    let targetW = img.naturalWidth;
    let targetH = img.naturalHeight;

    if (options.maxWidth && targetW > options.maxWidth) {
      targetH = Math.round(targetH * (options.maxWidth / targetW));
      targetW = options.maxWidth;
    }
    if (options.maxHeight && targetH > options.maxHeight) {
      targetW = Math.round(targetW * (options.maxHeight / targetH));
      targetH = options.maxHeight;
    }

    canvas.width = targetW;
    canvas.height = targetH;
    ctx?.clearRect(0, 0, targetW, targetH);
    ctx?.drawImage(img, 0, 0, targetW, targetH);

    const webpBlob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b || new Blob()), 'image/webp', quality);
    });

    totalWebpSize += webpBlob.size;

    // Clean filename and replace extension with .webp
    const baseName = item.name.replace(/\.[^/.]+$/, '');
    const webpFileName = `${baseName}.webp`;

    zip.file(webpFileName, webpBlob);

    convertedFiles.push({
      name: webpFileName,
      blob: webpBlob,
      url: URL.createObjectURL(webpBlob),
      originalSize: item.file.size,
      newSize: webpBlob.size
    });

    if (options.onProgress) {
      options.onProgress(Math.round(((i + 1) / items.length) * 100), i + 1, items.length);
    }
  }

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  const zipUrl = URL.createObjectURL(zipBlob);

  return {
    zipBlob,
    zipUrl,
    totalOriginalSize,
    totalWebpSize,
    convertedFiles
  };
}
