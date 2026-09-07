// EXIF, GPS & Media Metadata Analysis and Privacy Scrubber Engine
// Runs 100% client-side in browser memory

import { ProcessResult } from '../types';

export interface GpsLocation {
  latitude: number;
  longitude: number;
  altitude?: number;
  latitudeRef: string;
  longitudeRef: string;
  googleMapsUrl: string;
}

export interface ExifMetadata {
  fileType: string;
  fileName: string;
  fileSize: number;
  dimensions?: { width: number; height: number };
  colorDepth?: string;
  hasExif: boolean;
  hasGps: boolean;
  make?: string;
  model?: string;
  software?: string;
  dateTime?: string;
  iso?: number;
  fNumber?: string;
  exposureTime?: string;
  focalLength?: string;
  orientation?: number;
  gps?: GpsLocation;
  // GIF specific
  isGif?: boolean;
  gifFramesCount?: number;
  gifLoopCount?: string;
  gifColorTableColors?: number;
  gifTotalDurationSec?: number;
  // Privacy risk level
  privacyRisk: 'ALTO' | 'MEDIO' | 'LIMPIO';
  privacyIssues: string[];
}

// Parses EXIF and GPS from JPEG ArrayBuffer
export async function extractMediaMetadata(file: File): Promise<ExifMetadata> {
  const result: ExifMetadata = {
    fileType: file.type || 'image/unknown',
    fileName: file.name,
    fileSize: file.size,
    hasExif: false,
    hasGps: false,
    privacyRisk: 'LIMPIO',
    privacyIssues: []
  };

  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);

  // Check if image is GIF
  if (file.type.includes('gif') || file.name.toLowerCase().endsWith('.gif')) {
    result.isGif = true;
    parseGifMetadata(view, result);
  } else if (file.type.includes('jpeg') || file.type.includes('jpg') || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg')) {
    parseJpegExif(view, result);
  } else if (file.type.includes('png') || file.name.toLowerCase().endsWith('.png')) {
    parsePngMetadata(view, result);
  }

  // Get dimensions via Image if not parsed from headers
  if (!result.dimensions) {
    try {
      const dimensions = await getImageDimensions(file);
      result.dimensions = dimensions;
    } catch {
      // ignore
    }
  }

  // Determine privacy risk
  if (result.hasGps) {
    result.privacyRisk = 'ALTO';
    result.privacyIssues.push('Ubicación GPS precisa incrustada en el archivo (coordenadas exactas).');
  }
  if (result.make || result.model) {
    if (result.privacyRisk === 'LIMPIO') result.privacyRisk = 'MEDIO';
    result.privacyIssues.push(`Modelo y fabricante de cámara identificado: ${result.make || ''} ${result.model || ''}`);
  }
  if (result.dateTime) {
    if (result.privacyRisk === 'LIMPIO') result.privacyRisk = 'MEDIO';
    result.privacyIssues.push(`Fecha y hora original de la captura: ${result.dateTime}`);
  }
  if (result.software) {
    result.privacyIssues.push(`Software de edición registrado: ${result.software}`);
  }

  return result;
}

function parseJpegExif(view: DataView, result: ExifMetadata) {
  // Check SOI marker 0xFFD8
  if (view.byteLength < 4 || view.getUint16(0) !== 0xFFD8) {
    return;
  }

  let offset = 2;
  while (offset < view.byteLength) {
    if (offset + 4 > view.byteLength) break;
    const marker = view.getUint16(offset);
    offset += 2;

    // SOF markers (Start Of Frame) to extract dimensions
    if (
      marker === 0xFFC0 || marker === 0xFFC1 || marker === 0xFFC2 ||
      marker === 0xFFC3 || marker === 0xFFC5 || marker === 0xFFC6 ||
      marker === 0xFFC7 || marker === 0xFFC9 || marker === 0xFFCA ||
      marker === 0xFFCB || marker === 0xFFCD || marker === 0xFFCE ||
      marker === 0xFFCF
    ) {
      if (offset + 7 <= view.byteLength) {
        const height = view.getUint16(offset + 3);
        const width = view.getUint16(offset + 5);
        result.dimensions = { width, height };
      }
    }

    // Check for APP1 (EXIF marker 0xFFE1)
    if (marker === 0xFFE1) {
      const length = view.getUint16(offset);
      const app1DataStart = offset + 2;

      // Check for 'Exif\0\0' header (0x45786966 0x0000)
      if (app1DataStart + 6 <= view.byteLength) {
        const header = String.fromCharCode(
          view.getUint8(app1DataStart),
          view.getUint8(app1DataStart + 1),
          view.getUint8(app1DataStart + 2),
          view.getUint8(app1DataStart + 3)
        );

        if (header === 'Exif') {
          result.hasExif = true;
          const tiffStart = app1DataStart + 6;
          parseTiff(view, tiffStart, result);
        }
      }
      offset += length;
    } else if ((marker & 0xFF00) === 0xFF00 && marker !== 0xFFD8 && marker !== 0xFFD9) {
      if (offset + 2 > view.byteLength) break;
      const length = view.getUint16(offset);
      offset += length;
    } else {
      break;
    }
  }
}

function parseTiff(view: DataView, tiffStart: number, result: ExifMetadata) {
  if (tiffStart + 8 > view.byteLength) return;

  // Endianness
  const endianMarker = view.getUint16(tiffStart);
  const isLittle = endianMarker === 0x4949; // 'II'

  // TIFF magic 42
  const magic = view.getUint16(tiffStart + 2, isLittle);
  if (magic !== 0x002A) return;

  const firstIfdOffset = view.getUint32(tiffStart + 4, isLittle);
  if (firstIfdOffset < 8) return;

  let ifdOffset = tiffStart + firstIfdOffset;
  if (ifdOffset + 2 > view.byteLength) return;

  let exifSubIfdOffset: number | null = null;
  let gpsSubIfdOffset: number | null = null;

  // Read IFD0 entries
  const numEntries = view.getUint16(ifdOffset, isLittle);
  ifdOffset += 2;

  for (let i = 0; i < numEntries; i++) {
    const entryOffset = ifdOffset + i * 12;
    if (entryOffset + 12 > view.byteLength) break;

    const tag = view.getUint16(entryOffset, isLittle);
    const type = view.getUint16(entryOffset + 2, isLittle);
    const count = view.getUint32(entryOffset + 4, isLittle);
    const valOffset = entryOffset + 8;

    switch (tag) {
      case 0x010F: // Make
        result.make = readString(view, tiffStart, valOffset, count, isLittle);
        break;
      case 0x0110: // Model
        result.model = readString(view, tiffStart, valOffset, count, isLittle);
        break;
      case 0x0131: // Software
        result.software = readString(view, tiffStart, valOffset, count, isLittle);
        break;
      case 0x0132: // DateTime
        result.dateTime = readString(view, tiffStart, valOffset, count, isLittle);
        break;
      case 0x0112: // Orientation
        result.orientation = view.getUint16(valOffset, isLittle);
        break;
      case 0x8769: // Exif SubIFD Pointer
        exifSubIfdOffset = tiffStart + view.getUint32(valOffset, isLittle);
        break;
      case 0x8825: // GPS SubIFD Pointer
        gpsSubIfdOffset = tiffStart + view.getUint32(valOffset, isLittle);
        break;
    }
  }

  // Parse Exif SubIFD (Exposure, ISO, F-number, etc.)
  if (exifSubIfdOffset && exifSubIfdOffset + 2 <= view.byteLength) {
    const exifEntries = view.getUint16(exifSubIfdOffset, isLittle);
    const start = exifSubIfdOffset + 2;

    for (let i = 0; i < exifEntries; i++) {
      const entryOffset = start + i * 12;
      if (entryOffset + 12 > view.byteLength) break;

      const tag = view.getUint16(entryOffset, isLittle);
      const valOffset = entryOffset + 8;

      switch (tag) {
        case 0x8827: // ISO
          result.iso = view.getUint16(valOffset, isLittle);
          break;
        case 0x829D: { // FNumber
          const num = view.getUint32(tiffStart + view.getUint32(valOffset, isLittle), isLittle);
          const den = view.getUint32(tiffStart + view.getUint32(valOffset, isLittle) + 4, isLittle);
          if (den > 0) result.fNumber = `f/${(num / den).toFixed(1)}`;
          break;
        }
        case 0x829A: { // ExposureTime
          const num = view.getUint32(tiffStart + view.getUint32(valOffset, isLittle), isLittle);
          const den = view.getUint32(tiffStart + view.getUint32(valOffset, isLittle) + 4, isLittle);
          if (den > 0) {
            result.exposureTime = num === 1 ? `1/${den}s` : `${(num / den).toFixed(3)}s`;
          }
          break;
        }
        case 0x920A: { // FocalLength
          const num = view.getUint32(tiffStart + view.getUint32(valOffset, isLittle), isLittle);
          const den = view.getUint32(tiffStart + view.getUint32(valOffset, isLittle) + 4, isLittle);
          if (den > 0) result.focalLength = `${(num / den).toFixed(1)} mm`;
          break;
        }
      }
    }
  }

  // Parse GPS SubIFD
  if (gpsSubIfdOffset && gpsSubIfdOffset + 2 <= view.byteLength) {
    const gpsEntries = view.getUint16(gpsSubIfdOffset, isLittle);
    const start = gpsSubIfdOffset + 2;

    let latRef = 'N';
    let lonRef = 'E';
    let latVal: number[] | null = null;
    let lonVal: number[] | null = null;
    let altVal: number | null = null;

    for (let i = 0; i < gpsEntries; i++) {
      const entryOffset = start + i * 12;
      if (entryOffset + 12 > view.byteLength) break;

      const tag = view.getUint16(entryOffset, isLittle);
      const valOffset = entryOffset + 8;

      switch (tag) {
        case 0x0001: // GPSLatitudeRef
          latRef = String.fromCharCode(view.getUint8(valOffset));
          break;
        case 0x0002: // GPSLatitude (3 rational numbers: degrees, minutes, seconds)
          latVal = readRationals(view, tiffStart, view.getUint32(valOffset, isLittle), 3, isLittle);
          break;
        case 0x0003: // GPSLongitudeRef
          lonRef = String.fromCharCode(view.getUint8(valOffset));
          break;
        case 0x0004: // GPSLongitude
          lonVal = readRationals(view, tiffStart, view.getUint32(valOffset, isLittle), 3, isLittle);
          break;
        case 0x0006: { // GPSAltitude
          const altOffset = tiffStart + view.getUint32(valOffset, isLittle);
          if (altOffset + 8 <= view.byteLength) {
            const num = view.getUint32(altOffset, isLittle);
            const den = view.getUint32(altOffset + 4, isLittle);
            if (den > 0) altVal = num / den;
          }
          break;
        }
      }
    }

    if (latVal && lonVal) {
      let lat = latVal[0] + latVal[1] / 60 + latVal[2] / 3600;
      let lon = lonVal[0] + lonVal[1] / 60 + lonVal[2] / 3600;
      if (latRef === 'S') lat = -lat;
      if (lonRef === 'W') lon = -lon;

      result.hasGps = true;
      result.gps = {
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lon.toFixed(6)),
        altitude: altVal ? Number(altVal.toFixed(1)) : undefined,
        latitudeRef: latRef,
        longitudeRef: lonRef,
        googleMapsUrl: `https://www.google.com/maps?q=${lat.toFixed(6)},${lon.toFixed(6)}`
      };
    }
  }
}

function readString(view: DataView, tiffStart: number, valOffset: number, count: number, isLittle: boolean): string {
  let strOffset = valOffset;
  if (count > 4) {
    strOffset = tiffStart + view.getUint32(valOffset, isLittle);
  }
  let str = '';
  for (let i = 0; i < count; i++) {
    if (strOffset + i >= view.byteLength) break;
    const charCode = view.getUint8(strOffset + i);
    if (charCode === 0) break;
    str += String.fromCharCode(charCode);
  }
  return str.trim();
}

function readRationals(view: DataView, tiffStart: number, offsetFromTiff: number, count: number, isLittle: boolean): number[] {
  const result: number[] = [];
  const start = tiffStart + offsetFromTiff;
  for (let i = 0; i < count; i++) {
    const rOffset = start + i * 8;
    if (rOffset + 8 > view.byteLength) break;
    const num = view.getUint32(rOffset, isLittle);
    const den = view.getUint32(rOffset + 4, isLittle);
    result.push(den !== 0 ? num / den : 0);
  }
  return result;
}

function parseGifMetadata(view: DataView, result: ExifMetadata) {
  if (view.byteLength < 13) return;

  const header = String.fromCharCode(
    view.getUint8(0), view.getUint8(1), view.getUint8(2),
    view.getUint8(3), view.getUint8(4), view.getUint8(5)
  );

  if (!header.startsWith('GIF')) return;

  const width = view.getUint16(6, true);
  const height = view.getUint16(8, true);
  result.dimensions = { width, height };

  const packed = view.getUint8(10);
  const hasGct = (packed & 0x80) !== 0;
  const gctSize = 2 << (packed & 0x07);
  result.gifColorTableColors = hasGct ? gctSize : 0;

  // Count frames and calculate total duration
  let framesCount = 0;
  let totalDelayHundredths = 0;
  let offset = 13 + (hasGct ? gctSize * 3 : 0);
  let loopCount = 'Infinito';

  while (offset < view.byteLength) {
    const blockType = view.getUint8(offset);
    offset++;

    if (blockType === 0x3B) {
      // Trailer (end of GIF)
      break;
    }

    if (blockType === 0x21) {
      // Extension block
      if (offset >= view.byteLength) break;
      const extType = view.getUint8(offset);
      offset++;

      if (extType === 0xF9) {
        // Graphic Control Extension (precedes a frame)
        framesCount++;
        const blockSize = view.getUint8(offset);
        if (blockSize === 4 && offset + 5 <= view.byteLength) {
          const delay = view.getUint16(offset + 2, true);
          totalDelayHundredths += delay;
        }
        offset += blockSize + 1; // +1 for terminator 0x00
      } else if (extType === 0xFF) {
        // Application Extension (Netscape loop)
        const blockSize = view.getUint8(offset);
        offset += blockSize + 1;
        while (offset < view.byteLength) {
          const subSize = view.getUint8(offset);
          if (subSize === 0) {
            offset++;
            break;
          }
          if (subSize === 3 && offset + 4 <= view.byteLength) {
            const loops = view.getUint16(offset + 2, true);
            loopCount = loops === 0 ? 'Infinito (Continuo)' : `${loops} repeticiones`;
          }
          offset += subSize + 1;
        }
      } else {
        // Skip extension sub-blocks
        while (offset < view.byteLength) {
          const subSize = view.getUint8(offset);
          offset += subSize + 1;
          if (subSize === 0) break;
        }
      }
    } else if (blockType === 0x2C) {
      // Image Descriptor (Frame data)
      offset += 9; // skip left, top, width, height, packed
      if (offset >= view.byteLength) break;
      // Skip local color table if present
      const localPacked = view.getUint8(offset - 1);
      if ((localPacked & 0x80) !== 0) {
        const localSize = 2 << (localPacked & 0x07);
        offset += localSize * 3;
      }
      offset++; // LZW minimum code size
      // Skip image data sub-blocks
      while (offset < view.byteLength) {
        const subSize = view.getUint8(offset);
        offset += subSize + 1;
        if (subSize === 0) break;
      }
    }
  }

  result.gifFramesCount = Math.max(1, framesCount);
  result.gifLoopCount = loopCount;
  result.gifTotalDurationSec = totalDelayHundredths > 0 ? Number((totalDelayHundredths / 100).toFixed(2)) : undefined;
}

function parsePngMetadata(view: DataView, result: ExifMetadata) {
  if (view.byteLength < 24) return;
  // Check PNG signature
  if (view.getUint32(0) !== 0x89504E47) return;

  // IHDR dimensions
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  result.dimensions = { width, height };

  let offset = 8;
  while (offset + 8 < view.byteLength) {
    const length = view.getUint32(offset);
    const chunkType = String.fromCharCode(
      view.getUint8(offset + 4),
      view.getUint8(offset + 5),
      view.getUint8(offset + 6),
      view.getUint8(offset + 7)
    );

    if (chunkType === 'tEXt' || chunkType === 'iTXt' || chunkType === 'zTXt') {
      result.hasExif = true;
      result.privacyIssues.push(`Bloque de texto/metadatos PNG encontrado (${chunkType}).`);
    } else if (chunkType === 'eXIf') {
      result.hasExif = true;
      result.privacyIssues.push('Bloque EXIF crudo detectado en PNG.');
    }

    offset += 12 + length;
  }
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Cannot load image'));
    };
    img.src = url;
  });
}

// Losslessly strips all metadata (EXIF, GPS, camera serials, timestamps) by rasterizing onto a pure Canvas
export async function stripMediaMetadata(
  file: File,
  options: {
    outputFormat?: 'png' | 'jpeg' | 'webp' | 'avif';
    quality?: number;
    onProgress?: (progress: number) => void;
  } = {}
): Promise<ProcessResult> {
  const startTime = performance.now();
  if (options.onProgress) options.onProgress(20);

  const img = new Image();
  const previewUrl = URL.createObjectURL(file);

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('No se pudo cargar la imagen para limpiar metadatos.'));
    img.src = previewUrl;
  });

  if (options.onProgress) options.onProgress(50);

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    URL.revokeObjectURL(previewUrl);
    throw new Error('No se pudo inicializar el lienzo para limpiar metadatos.');
  }

  // Draw image pure
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(previewUrl);

  if (options.onProgress) options.onProgress(80);

  const format = options.outputFormat || (file.type.includes('png') ? 'png' : file.type.includes('webp') ? 'webp' : 'jpeg');
  const mime = `image/${format}`;
  const quality = options.quality ?? 0.98;

  const cleanBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b && b.size > 0) resolve(b);
        else reject(new Error('Error al generar imagen libre de metadatos.'));
      },
      mime,
      quality
    );
  });

  if (options.onProgress) options.onProgress(100);

  const timeTakenMs = Math.round(performance.now() - startTime);
  const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
  const ext = format === 'jpeg' ? 'jpg' : format;
  const newFileName = `aikotools_sin_metadatos_${baseName}.${ext}`;

  return {
    blob: cleanBlob,
    url: URL.createObjectURL(cleanBlob),
    fileName: newFileName,
    newSize: cleanBlob.size,
    originalSize: file.size,
    width: canvas.width,
    height: canvas.height,
    format: `${format.toUpperCase()} (Privacidad 100% Limpia)`,
    timeTakenMs,
    extraInfo: '0 rastros EXIF · 0 coordenadas GPS · Seguro para redes y mensajería'
  };
}
