export type ToolCategory =
  | 'all'
  | 'ai-generator'
  | 'bg-remover'
  | 'recolor'
  | 'converter'
  | 'effects'
  | 'palette'
  | 'watermark'
  | 'gif-maker'
  | 'video'
  | 'audio'
  | 'transform'
  | 'optimize'
  | 'split'
  | 'text'
  | 'webp'
  | 'apng'
  | 'avif'
  | 'jxl'
  | 'svg'
  | 'analyzer'
  | 'enhance'
  | 'smooth';

export type ToolId =
  | 'ai-image-generator'
  | 'bg-remover'
  | 'recolor-tools'
  | 'converter-tools'
  | 'effects-tools'
  | 'palette-tools'
  | 'watermark-tools'
  | 'gif-maker'
  | 'video-tools'
  | 'audio-tools'
  | 'transform-tools'
  | 'optimize-tools'
  | 'split-tools'
  | 'text-tools'
  | 'webp-tools'
  | 'apng-tools'
  | 'avif-tools'
  | 'jxl-tools'
  | 'svg-tools'
  | 'analyzer-tools'
  | 'cut-half-tools'
  | 'enhance-tools'
  | 'smooth-tools'
  | 'screen-recorder';

export interface ToolDefinition {
  id: ToolId;
  name: string;
  subtitle: string;
  description: string;
  category: ToolCategory;
  iconName: string;
  acceptedMime: string;
  status: 'DISPONIBLE' | 'PRÓXIMAMENTE';
  isAvailable: boolean;
  accentColor?: string;
  accentHex?: string;
  gradient?: string;
  iconBg?: string;
  defaultActionName?: string;
  subtools?: string[];
}

export interface MediaFileInfo {
  file: File;
  name: string;
  size: number;
  type: string;
  previewUrl: string;
  width?: number;
  height?: number;
  duration?: number;
}

export type ProcessState = 'idle' | 'processing' | 'done' | 'error';

export interface ProcessResult {
  blob: Blob;
  url: string;
  fileName: string;
  newSize: number;
  originalSize: number;
  width?: number;
  height?: number;
  format: string;
  timeTakenMs: number;
  extraInfo?: string;
}

export interface HistoryItem {
  id: string;
  createdAt: number; // timestamp in ms
  expiresAt: number; // timestamp in ms (createdAt + 3600000)
  fileName: string;
  originalFileName: string;
  format: string;
  originalSize: number;
  newSize: number;
  width?: number;
  height?: number;
  toolName: string;
  url: string;
  blob?: Blob;
  previewThumbnail?: string;
}

