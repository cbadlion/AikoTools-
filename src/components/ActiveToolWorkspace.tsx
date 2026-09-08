import React, { useState, useEffect, useRef } from 'react';
import { InteractiveBgEditor } from './InteractiveBgEditor';
import {
  ToolDefinition,
  MediaFileInfo,
  ProcessResult,
  ProcessState
} from '../types';
import {
  formatFileSize,
  convertImageFormat,
  convertUniversalFormat,
  removeImageBackground,
  applyEnhancedFilters,
  extractImagePalette,
  ExtractedColor,
  applyWatermarkAndCensor,
  resizeImage,
  generateMemeImage,
  captureVideoFrame,
  rotateAndFlipImage,
  cropImageByRatio,
  extractAudioFromVideo,
  renderSvgToRaster,
  createAnimatedGifFromVideo,
  createAnimatedWebpFromVideo,
  checkIsAnimated,
  AnimationInfo,
  detectDefaultFormat,
  dataUrlToBlob,
  recolorImage,
  applyRecolorToImageData,
  RecolorMode,
  RecolorOptions,
  compressAndOptimizeMedia,
  CompressMediaOptions,
  cutOrEraseImageHalf,
  HalfRemovalTarget,
  HalfAction,
  enhanceMediaQuality,
  EnhanceMode,
  EnhanceQualityOptions,
  smoothAndAccelerateMedia,
  SmoothMode,
  SmoothMediaOptions,
  extractMediaMetadata,
  stripMediaMetadata,
  ExifMetadata
} from '../utils/mediaEngine';
import { saveToHistory } from '../utils/historyStorage';
import { notifyUser } from '../utils/notifications';
import {
  Download,
  Share2,
  RefreshCw,
  Zap,
  AlertCircle,
  Lock,
  Unlock,
  Clock,
  X,
  Play,
  Pause,
  RotateCw,
  FlipHorizontal,
  Crop,
  Music,
  Sparkles,
  Layers,
  Video,
  Volume2,
  VolumeX,
  Eraser,
  Palette,
  Pipette,
  ShieldAlert,
  Copy,
  Check,
  Wand2,
  Eye,
  Sliders,
  Film,
  FastForward,
  Gauge,
  Link2,
  Unlink,
  RotateCcw,
  Bot,
  BrainCircuit,
  Lightbulb,
  Maximize2,
  TrendingDown,
  ShieldCheck,
  Split,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  MapPin,
  Camera,
  ExternalLink,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import Markdown from 'react-markdown';
import { useLanguage } from '../context/LanguageContext';

interface ActiveToolWorkspaceProps {
  tool: ToolDefinition;
  fileInfo: MediaFileInfo;
  onClearFile: () => void;
  onChangeTool: (toolId: any) => void;
  onChainResult?: (file: File, nextToolId: string) => void;
}

export const ActiveToolWorkspace: React.FC<ActiveToolWorkspaceProps> = ({
  tool,
  fileInfo,
  onClearFile,
  onChangeTool,
  onChainResult
}) => {
  const { t } = useLanguage();
  const [status, setStatus] = useState<ProcessState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [processProgress, setProcessProgress] = useState<number>(0);

  // Metadata / EXIF / Privacy Analyzer state
  const [metadataInfo, setMetadataInfo] = useState<ExifMetadata | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState<boolean>(false);

  // Interactive Split Slider & Copy states
  const [isSplitMode, setIsSplitMode] = useState<boolean>(false);
  const [splitPercent, setSplitPercent] = useState<number>(50);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Fullscreen Zoom Inspector Modal
  const [isZoomModalOpen, setIsZoomModalOpen] = useState<boolean>(false);
  const [zoomScale, setZoomScale] = useState<number>(1);

  // Background Remover options
  const [bgViewMode, setBgViewMode] = useState<'interactive' | 'options'>('interactive');
  const [bgTolerance, setBgTolerance] = useState(30);
  const [bgFeather, setBgFeather] = useState(3);
  const [bgMode, setBgMode] = useState<'flood' | 'subject' | 'global'>('flood');
  const [bgCustomColor, setBgCustomColor] = useState<string | null>(null);
  const [bgDefringe, setBgDefringe] = useState(true);
  const [bgOutputFormat, setBgOutputFormat] = useState<'png' | 'webp' | 'avif' | 'jpg' | 'bmp' | 'ico' | 'pdf'>('png');
  const [bgReplaceColor, setBgReplaceColor] = useState<string>('transparent');

  // Recolor / Color Changer options
  const [recolorMode, setRecolorMode] = useState<RecolorMode>('selective');
  const [recolorSourceColor, setRecolorSourceColor] = useState<string>('#3B82F6');
  const [recolorTargetColor, setRecolorTargetColor] = useState<string>('#EF4444');
  const [recolorTolerance, setRecolorTolerance] = useState<number>(35);
  const [recolorFeather, setRecolorFeather] = useState<number>(4);
  const [recolorPreserveLuminance, setRecolorPreserveLuminance] = useState<boolean>(true);
  const [recolorHueRotate, setRecolorHueRotate] = useState<number>(180);
  const [recolorTintColor, setRecolorTintColor] = useState<string>('#8B5CF6');
  const [recolorTintIntensity, setRecolorTintIntensity] = useState<number>(70);
  const [recolorDuotoneHighlights, setRecolorDuotoneHighlights] = useState<string>('#FDE047');
  const [recolorDuotoneShadows, setRecolorDuotoneShadows] = useState<string>('#312E81');
  const [recolorRedBalance, setRecolorRedBalance] = useState<number>(0);
  const [recolorGreenBalance, setRecolorGreenBalance] = useState<number>(0);
  const [recolorBlueBalance, setRecolorBlueBalance] = useState<number>(0);
  const [recolorTemperature, setRecolorTemperature] = useState<number>(0);
  const [recolorTintBalance, setRecolorTintBalance] = useState<number>(0);
  const [isEyedropperActive, setIsEyedropperActive] = useState<boolean>(false);
  const [eyedropperSampledHex, setEyedropperSampledHex] = useState<string | null>(null);
  const [recolorDetectedColors, setRecolorDetectedColors] = useState<string[]>([]);
  const [recolorLivePreviewUrl, setRecolorLivePreviewUrl] = useState<string | null>(null);
  const [showOriginalComparison, setShowOriginalComparison] = useState<boolean>(false);
  const [isRecolorPreviewUpdating, setIsRecolorPreviewUpdating] = useState<boolean>(false);

  // Universal Converter options
  const [universalTarget, setUniversalTarget] = useState<'png' | 'jpg' | 'webp' | 'avif' | 'bmp' | 'ico' | 'gif' | 'pdf' | 'svg'>('webp');
  const [universalQuality, setUniversalQuality] = useState(90);
  const [universalBgColor, setUniversalBgColor] = useState('#FFFFFF');
  const [icoSize, setIcoSize] = useState<16 | 32 | 48 | 64 | 128 | 256>(64);
  const [converterSpeedMode, setConverterSpeedMode] = useState<'turbo' | 'standard' | 'original'>('turbo');
  const [converterScale, setConverterScale] = useState<number>(1.0);

  // Dedicated Compressor / Optimizer Options
  const [compressPreset, setCompressPreset] = useState<'balanced' | 'aggressive' | 'lossless' | 'custom'>('balanced');
  const [compressFormatMode, setCompressFormatMode] = useState<'auto' | 'original' | 'webp' | 'jpg' | 'png'>('auto');
  const [compressQuality, setCompressQuality] = useState<number>(72);
  const [compressScale, setCompressScale] = useState<number>(1.0); // 1.0, 0.85, 0.70, 0.50
  const [compressMaxDimension, setCompressMaxDimension] = useState<number | null>(null);
  const [compressGifMode, setCompressGifMode] = useState<'webp' | 'gif'>('webp');
  const [compressReduceColors, setCompressReduceColors] = useState<boolean>(true);
  const [compressColorPalette, setCompressColorPalette] = useState<number>(128);

  // Eliminar Mitad de Imagen (Cut Half Options)
  const [halfRemoveTarget, setHalfRemoveTarget] = useState<HalfRemovalTarget>('left');
  const [halfAction, setHalfAction] = useState<HalfAction>('crop');
  const [halfDividerPercent, setHalfDividerPercent] = useState<number>(50);
  const [halfBgColor, setHalfBgColor] = useState<string>('transparent');
  const [halfOutputFormat, setHalfOutputFormat] = useState<'auto' | 'png' | 'webp' | 'jpg'>('auto');
  const [halfQuality, setHalfQuality] = useState<number>(92);

  // Mejorar Calidad HD (Enhance Options)
  const [enhanceMode, setEnhanceMode] = useState<EnhanceMode>('smart-hd');
  const [enhanceIntensity, setEnhanceIntensity] = useState<number>(75);
  const [enhanceScale, setEnhanceScale] = useState<1 | 2 | 4>(1);
  const [enhanceDenoise, setEnhanceDenoise] = useState<number>(30);
  const [enhanceSharpen, setEnhanceSharpen] = useState<number>(65);
  const [enhanceVibrance, setEnhanceVibrance] = useState<number>(25);
  const [enhanceContrast, setEnhanceContrast] = useState<number>(20);
  const [enhanceOutputFormat, setEnhanceOutputFormat] = useState<'auto' | 'png' | 'webp' | 'jpg'>('auto');

  // Fluidez & FPS Anti-Lag (Smooth Options)
  const [smoothMode, setSmoothMode] = useState<SmoothMode>('boost-fps');
  const [smoothTargetFps, setSmoothTargetFps] = useState<number>(60);
  const [smoothSpeedMultiplier, setSmoothSpeedMultiplier] = useState<number>(1.0);
  const [smoothFixBrowserDelay, setSmoothFixBrowserDelay] = useState<boolean>(true);
  const [smoothInterpolate, setSmoothInterpolate] = useState<boolean>(true);
  const [smoothDropDuplicates, setSmoothDropDuplicates] = useState<boolean>(true);
  const [smoothOutputFormat, setSmoothOutputFormat] = useState<'auto' | 'webp' | 'gif'>('auto');
  const [smoothVyzerPreset, setSmoothVyzerPreset] = useState<boolean>(false);
  const [smoothVyzerResize, setSmoothVyzerResize] = useState<boolean>(false);

  // Animation handling states (WebP / GIF Animation preservation)
  const [isAnimatedFile, setIsAnimatedFile] = useState(false);
  const [animationInfo, setAnimationInfo] = useState<AnimationInfo>({ isAnimated: false, type: 'none' });
  const [preserveAnimation, setPreserveAnimation] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState<number>(1.0);
  const [reverseAnimation, setReverseAnimation] = useState(false);
  const [loopCount, setLoopCount] = useState<number>(0); // 0 = infinite loop
  const [gifFormatChoice, setGifFormatChoice] = useState<'gif' | 'webp'>('webp');

  // Enhanced Filter Presets
  const [activePreset, setActivePreset] = useState<'none' | 'cyberpunk' | 'vintage' | 'noir' | 'sunset' | 'emerald' | 'vaporwave' | 'glitch' | 'pixelate' | 'vignette'>('none');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [sepia, setSepia] = useState(0);
  const [grayscale, setGrayscale] = useState(0);
  const [invert, setInvert] = useState(0);
  const [blur, setBlur] = useState(0);
  const [pixelSize, setPixelSize] = useState(12);

  // Palette Extraction
  const [extractedPalette, setExtractedPalette] = useState<ExtractedColor[]>([]);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  // Watermark and Censorship
  const [watermarkMode, setWatermarkMode] = useState<'text' | 'image'>('text');
  const [watermarkText, setWatermarkText] = useState('AikoTools');
  const [watermarkImageFile, setWatermarkImageFile] = useState<File | null>(null);
  const [watermarkImageScale, setWatermarkImageScale] = useState(0.25);
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.7);
  const [watermarkPos, setWatermarkPos] = useState<'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center' | 'tiled'>('bottom-right');
  const [censorType, setCensorType] = useState<'none' | 'pixelate' | 'black'>('none');

  // GIF Maker options
  const [gifFps, setGifFps] = useState<number>(15);
  const [gifFrames, setGifFrames] = useState<number>(20);
  const [gifResolution, setGifResolution] = useState<'original' | '480' | '360'>('480');

  // Transform options (Resize, Rotate, Flip, Crop)
  const [width, setWidth] = useState<number>(fileInfo.width || 800);
  const [height, setHeight] = useState<number>(fileInfo.height || 600);
  const [lockRatio, setLockRatio] = useState<boolean>(false);
  const [lockedRatioValue, setLockedRatioValue] = useState<number>(
    fileInfo.width && fileInfo.height ? fileInfo.width / fileInfo.height : 1
  );
  const [rotationAngle, setRotationAngle] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [cropRatio, setCropRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | 'free'>('free');
  const [transformQuality, setTransformQuality] = useState<number>(92);
  const originalAspectRatio = fileInfo.width && fileInfo.height ? fileInfo.width / fileInfo.height : 1;

  // Text / Meme
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [textSizeRatio, setTextSizeRatio] = useState(0.08);

  // Video playback & frames
  const [videoTimestamp, setVideoTimestamp] = useState(0);
  const [videoDuration, setVideoDuration] = useState(fileInfo.duration || 0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [isVideoMuted, setIsVideoMuted] = useState(true);

  // SVG Scaling
  const [svgScale, setSvgScale] = useState(2);

  // User Output Format selection (Auto keeps original format e.g. WebP stays WebP)
  const [selectedOutputFormat, setSelectedOutputFormat] = useState<'auto' | 'webp' | 'png' | 'jpg' | 'avif' | 'gif' | 'bmp' | 'ico' | 'pdf' | 'svg'>('auto');

  // AI Image Generator options
  const [aiPrompt, setAiPrompt] = useState('Un zorro cyberpunk místico en un bosque de luces de neón');
  const [aiStyle, setAiStyle] = useState<'vibrant' | 'cyberpunk' | 'anime' | 'cinematic' | 'minimalist' | '3d-render' | 'fantasy' | 'pixelart' | 'vintage-photo'>('vibrant');
  const [aiAspectRatio, setAiAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:2'>('1:1');
  const [aiQuality, setAiQuality] = useState<'standard' | 'hd' | 'ultra'>('hd');
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);
  const [promptEnhancedSuccess, setPromptEnhancedSuccess] = useState(false);

  // Gemini Vision Media Analyzer modal & state
  const [showAiAnalysisModal, setShowAiAnalysisModal] = useState(false);
  const [isAnalyzingMedia, setIsAnalyzingMedia] = useState(false);
  const [mediaAnalysisResult, setMediaAnalysisResult] = useState<string | null>(null);

  const handleEnhancePrompt = async () => {
    if (!aiPrompt.trim() || isEnhancingPrompt) return;
    setIsEnhancingPrompt(true);
    setPromptEnhancedSuccess(false);
    try {
      const res = await fetch('/api/gemini/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, style: aiStyle })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.enhancedPrompt) {
          setAiPrompt(data.enhancedPrompt);
          setPromptEnhancedSuccess(true);
          setTimeout(() => setPromptEnhancedSuccess(false), 3000);
        }
      }
    } catch (err) {
      console.error('Enhance prompt failed:', err);
    } finally {
      setIsEnhancingPrompt(false);
    }
  };

  const handleAnalyzeLoadedImage = async () => {
    setShowAiAnalysisModal(true);
    if (mediaAnalysisResult) return; // already analyzed
    setIsAnalyzingMedia(true);
    try {
      let base64Data: string | undefined = undefined;
      if (fileInfo.file && fileInfo.type.startsWith('image/')) {
        base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Error al leer imagen'));
          reader.readAsDataURL(fileInfo.file);
        });
      }
      const res = await fetch('/api/gemini/analyze-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Data,
          mimeType: fileInfo.type || 'image/png'
        })
      });
      if (res.ok) {
        const data = await res.json();
        setMediaAnalysisResult(data.analysis);
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setMediaAnalysisResult('No se pudo completar el análisis visual en este momento.');
    } finally {
      setIsAnalyzingMedia(false);
    }
  };

  // Inspect EXIF, GPS & GIF structure automatically when analyzer tool is selected
  useEffect(() => {
    if (tool.id === 'analyzer-tools' && fileInfo?.file) {
      setIsLoadingMetadata(true);
      extractMediaMetadata(fileInfo.file)
        .then((meta) => {
          setMetadataInfo(meta);
          setIsLoadingMetadata(false);
        })
        .catch((err) => {
          console.warn('Metadata inspection failed:', err);
          setIsLoadingMetadata(false);
        });
    }
  }, [tool.id, fileInfo]);

  // Copy processed image directly to user's system clipboard
  const handleCopyImage = async () => {
    if (!result?.blob) return;
    try {
      let blobToCopy = result.blob;
      if (!blobToCopy.type.includes('png')) {
        const canvas = document.createElement('canvas');
        const img = new Image();
        await new Promise((res, rej) => {
          img.onload = () => res(null);
          img.onerror = rej;
          img.src = result.url;
        });
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        blobToCopy = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/png'));
      }
      await navigator.clipboard.write([
        new ClipboardItem({ [blobToCopy.type]: blobToCopy })
      ]);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
      notifyUser({
        title: '📋 Copiado al portapapeles',
        body: 'La imagen se copió en alta resolución. Lista para pegar en cualquier chat o documento.',
        type: 'success'
      });
    } catch (err) {
      console.warn('Clipboard write error:', err);
    }
  };

  const handlePreviewImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (tool.id !== 'recolor-tools' && !isEyedropperActive) return;
    try {
      const img = e.currentTarget;
      const rect = img.getBoundingClientRect();
      const clientX = e.clientX;
      const clientY = e.clientY;

      const naturalW = img.naturalWidth || 800;
      const naturalH = img.naturalHeight || 600;

      const imgAspect = naturalW / naturalH;
      const elemAspect = rect.width / rect.height;

      let renderedW = rect.width;
      let renderedH = rect.height;
      let offsetX = 0;
      let offsetY = 0;

      if (elemAspect > imgAspect) {
        renderedH = rect.height;
        renderedW = rect.height * imgAspect;
        offsetX = (rect.width - renderedW) / 2;
      } else {
        renderedW = rect.width;
        renderedH = rect.width / imgAspect;
        offsetY = (rect.height - renderedH) / 2;
      }

      const clickX = clientX - rect.left - offsetX;
      const clickY = clientY - rect.top - offsetY;

      if (clickX < 0 || clickX > renderedW || clickY < 0 || clickY > renderedH) return;

      const naturalX = Math.max(0, Math.min(naturalW - 1, Math.floor((clickX / renderedW) * naturalW)));
      const naturalY = Math.max(0, Math.min(naturalH - 1, Math.floor((clickY / renderedH) * naturalH)));

      const sampleImg = new Image();
      sampleImg.crossOrigin = 'anonymous';
      sampleImg.src = fileInfo.previewUrl;
      const doSample = () => {
        const c = document.createElement('canvas');
        c.width = naturalW;
        c.height = naturalH;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(sampleImg, 0, 0);
          const pixel = ctx.getImageData(naturalX, naturalY, 1, 1).data;
          const hex = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1).toUpperCase()}`;
          setRecolorSourceColor(hex);
          setEyedropperSampledHex(hex);
          setIsEyedropperActive(false);
          notifyUser({
            title: 'Color muestreado',
            body: `Color ${hex} fijado como origen (${naturalX}x${naturalY}px)`,
            type: 'success'
          });
        }
      };

      if (sampleImg.complete) {
        doSample();
      } else {
        sampleImg.onload = doSample;
      }
    } catch (err) {
      console.warn('Eyedropper sample failed:', err);
    }
  };

  // Real-time live preview for Recolor Tools
  useEffect(() => {
    if (tool.id !== 'recolor-tools' || !fileInfo?.previewUrl || fileInfo.type.startsWith('video/')) {
      if (recolorLivePreviewUrl) {
        URL.revokeObjectURL(recolorLivePreviewUrl);
        setRecolorLivePreviewUrl(null);
      }
      return;
    }

    let isCancelled = false;
    setIsRecolorPreviewUpdating(true);

    const timer = setTimeout(() => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = fileInfo.previewUrl;

      const generateLivePreview = () => {
        if (isCancelled || !img.naturalWidth || !img.naturalHeight) {
          setIsRecolorPreviewUpdating(false);
          return;
        }

        try {
          // Fast preview resolution (max 640px for silky smooth UI interaction)
          const scale = Math.min(1, 640 / Math.max(img.naturalWidth, img.naturalHeight));
          const w = Math.max(1, Math.round(img.naturalWidth * scale));
          const h = Math.max(1, Math.round(img.naturalHeight * scale));

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            setIsRecolorPreviewUpdating(false);
            return;
          }

          ctx.drawImage(img, 0, 0, w, h);
          const imgData = ctx.getImageData(0, 0, w, h);

          applyRecolorToImageData(imgData, {
            mode: recolorMode,
            sourceColor: recolorSourceColor,
            targetColor: recolorTargetColor,
            tolerance: recolorTolerance,
            feather: recolorFeather,
            preserveLuminance: recolorPreserveLuminance,
            hueRotate: recolorHueRotate,
            tintColor: recolorTintColor,
            tintIntensity: recolorTintIntensity,
            duotoneHighlights: recolorDuotoneHighlights,
            duotoneShadows: recolorDuotoneShadows,
            redBalance: recolorRedBalance,
            greenBalance: recolorGreenBalance,
            blueBalance: recolorBlueBalance,
            temperature: recolorTemperature,
            tintBalance: recolorTintBalance
          });

          ctx.putImageData(imgData, 0, 0);

          canvas.toBlob((blob) => {
            if (isCancelled || !blob) {
              setIsRecolorPreviewUpdating(false);
              return;
            }
            const url = URL.createObjectURL(blob);
            setRecolorLivePreviewUrl((prev) => {
              if (prev) URL.revokeObjectURL(prev);
              return url;
            });
            setIsRecolorPreviewUpdating(false);
          }, 'image/png');
        } catch (e) {
          console.warn('Live recolor preview generation failed:', e);
          setIsRecolorPreviewUpdating(false);
        }
      };

      if (img.complete) {
        generateLivePreview();
      } else {
        img.onload = generateLivePreview;
        img.onerror = () => {
          setIsRecolorPreviewUpdating(false);
        };
      }
    }, 40);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [
    tool.id,
    fileInfo?.previewUrl,
    recolorMode,
    recolorSourceColor,
    recolorTargetColor,
    recolorTolerance,
    recolorFeather,
    recolorPreserveLuminance,
    recolorHueRotate,
    recolorTintColor,
    recolorTintIntensity,
    recolorDuotoneHighlights,
    recolorDuotoneShadows,
    recolorRedBalance,
    recolorGreenBalance,
    recolorBlueBalance,
    recolorTemperature,
    recolorTintBalance
  ]);

  const isVideo = fileInfo.type.startsWith('video/');
  const isGif = fileInfo.type.includes('gif') || fileInfo.name.toLowerCase().endsWith('.gif');

  // Detect whether image is animated on file change
  useEffect(() => {
    let active = true;
    checkIsAnimated(fileInfo.file).then((info) => {
      if (active) {
        setIsAnimatedFile(info.isAnimated);
        setAnimationInfo(info);
        if (info.isAnimated) {
          setPreserveAnimation(true);
        }
      }
    });
    return () => { active = false; };
  }, [fileInfo.file]);

  useEffect(() => {
    if (fileInfo.width && fileInfo.height) {
      setWidth(fileInfo.width);
      setHeight(fileInfo.height);
      setLockedRatioValue(fileInfo.width / fileInfo.height);
    }
    setResult(null);
    setStatus('idle');
    setProcessProgress(0);
    setErrorMessage(null);

    // Auto extract palette if palette tool or recolor tool is active
    if ((tool.id === 'palette-tools' || tool.id === 'recolor-tools') && fileInfo.type.startsWith('image/')) {
      extractImagePalette(fileInfo.file)
        .then((res) => {
          setExtractedPalette(res.palette);
          const detected = res.palette.map((p) => p.hex);
          setRecolorDetectedColors(detected);
          if (tool.id === 'recolor-tools' && detected.length > 0) {
            setRecolorSourceColor(detected[0]);
          }
        })
        .catch(console.error);
    }
  }, [fileInfo, tool]);

  const toggleLockRatio = () => {
    setLockRatio((prev) => {
      const next = !prev;
      if (next) {
        // When locking ratio, lock to current dimensions ratio if available, otherwise original
        if (width > 0 && height > 0) {
          setLockedRatioValue(width / height);
        } else if (fileInfo.width && fileInfo.height) {
          setLockedRatioValue(fileInfo.width / fileInfo.height);
        }
      }
      return next;
    });
  };

  const handleWidthChange = (val: number) => {
    setWidth(val);
    if (lockRatio) {
      const ratio = lockedRatioValue > 0 ? lockedRatioValue : (originalAspectRatio || 1);
      if (val > 0 && ratio > 0) {
        setHeight(Math.max(1, Math.round(val / ratio)));
      }
    }
  };

  const handleHeightChange = (val: number) => {
    setHeight(val);
    if (lockRatio) {
      const ratio = lockedRatioValue > 0 ? lockedRatioValue : (originalAspectRatio || 1);
      if (val > 0 && ratio > 0) {
        setWidth(Math.max(1, Math.round(val * ratio)));
      }
    }
  };

  const handleSwapDimensions = () => {
    const prevW = width;
    const prevH = height;
    setWidth(prevH);
    setHeight(prevW);
    if (prevH > 0 && prevW > 0) {
      setLockedRatioValue(prevH / prevW);
    }
  };

  const handleResetToOriginalDimensions = () => {
    if (fileInfo.width && fileInfo.height) {
      setWidth(fileInfo.width);
      setHeight(fileInfo.height);
      setLockedRatioValue(fileInfo.width / fileInfo.height);
    }
  };

  const handleSetExactDimensions = (targetW: number, targetH: number) => {
    setWidth(targetW);
    setHeight(targetH);
    if (targetW > 0 && targetH > 0) {
      setLockedRatioValue(targetW / targetH);
    }
  };

  const handleApplyPreset = (percent: number) => {
    if (fileInfo.width && fileInfo.height) {
      const newW = Math.round((fileInfo.width * percent) / 100);
      const newH = Math.round((fileInfo.height * percent) / 100);
      setWidth(newW);
      setHeight(newH);
      if (newW > 0 && newH > 0) {
        setLockedRatioValue(newW / newH);
      }
    }
  };

  const handleResetEffects = () => {
    setActivePreset('none');
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setSepia(0);
    setGrayscale(0);
    setInvert(0);
    setBlur(0);
    setPixelSize(12);
  };

  const handleCopyHex = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 1800);
  };

  const handleOpenEyeDropper = async () => {
    if (typeof window !== 'undefined' && 'EyeDropper' in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const res = await eyeDropper.open();
        if (res && res.sRGBHex) {
          const hex = res.sRGBHex.toUpperCase();
          const r = parseInt(hex.slice(1, 3), 16) || 0;
          const g = parseInt(hex.slice(3, 5), 16) || 0;
          const b = parseInt(hex.slice(5, 7), 16) || 0;
          const isDark = (0.299 * r + 0.587 * g + 0.114 * b) < 128;
          handleCopyHex(hex);
          setExtractedPalette((prev) => [
            { hex, rgb: `rgb(${r},${g},${b})`, percentage: 100, count: 1, isDark },
            ...prev.filter((p) => p.hex.toLowerCase() !== hex.toLowerCase())
          ]);
        }
      } catch (err) {
        // user cancelled or closed
      }
    } else {
      if (extractedPalette.length > 0) {
        handleCopyHex(extractedPalette[0].hex);
      }
    }
  };

  const handleProcess = async () => {
    setStatus('processing');
    setErrorMessage(null);
    setProcessProgress(10);

    try {
      let res: ProcessResult | null = null;
      const detectedOrig = detectDefaultFormat(fileInfo.file);
      const resolvedFormat = selectedOutputFormat === 'auto' ? detectedOrig : selectedOutputFormat;

      // 0. AI IMAGE GENERATOR
      if (tool.id === 'ai-image-generator') {
        setProcessProgress(30);
        const resp = await fetch('/api/gemini/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: aiPrompt,
            style: aiStyle,
            aspectRatio: aiAspectRatio,
            outputFormat: resolvedFormat || 'webp'
          })
        });
        setProcessProgress(75);
        const genData = await resp.json();
        if (genData.imageUrl) {
          let blob: Blob;
          if (genData.imageUrl.startsWith('data:')) {
            blob = dataUrlToBlob(genData.imageUrl);
          } else {
            const blobRes = await fetch(genData.imageUrl);
            blob = await blobRes.blob();
          }
          const targetFmt = resolvedFormat || 'webp';
          res = {
            blob,
            url: genData.imageUrl,
            fileName: `aiko_ia_${Date.now()}.${targetFmt}`,
            newSize: blob.size || 52000,
            originalSize: 0,
            width: aiAspectRatio === '16:9' ? 1280 : aiAspectRatio === '9:16' ? 720 : 1024,
            height: aiAspectRatio === '16:9' ? 720 : aiAspectRatio === '9:16' ? 1280 : 1024,
            format: targetFmt.toUpperCase(),
            timeTakenMs: 140,
            extraInfo: `Estilo: ${aiStyle.toUpperCase()} · Relación: ${aiAspectRatio}`
          };
        } else {
          throw new Error(genData.error || 'No se pudo generar la imagen con IA.');
        }
        setProcessProgress(100);
      }
      // 1. BG REMOVER
      else if (tool.id === 'bg-remover') {
        let customRgb: { r: number; g: number; b: number } | null = null;
        if (bgCustomColor) {
          const r = parseInt(bgCustomColor.slice(1, 3), 16);
          const g = parseInt(bgCustomColor.slice(3, 5), 16);
          const b = parseInt(bgCustomColor.slice(5, 7), 16);
          if (!isNaN(r)) customRgb = { r, g, b };
        }

        const outFormat = selectedOutputFormat !== 'auto' ? selectedOutputFormat : bgOutputFormat;

        res = await removeImageBackground(fileInfo.file, {
          tolerance: bgTolerance,
          feather: bgFeather,
          mode: bgMode,
          customColor: customRgb,
          defringe: bgDefringe,
          outputFormat: outFormat as any,
          backgroundColor: bgReplaceColor !== 'transparent' ? bgReplaceColor : undefined,
          onProgress: (p) => setProcessProgress(p)
        });
      }
      // 1B. RECOLOR TOOLS (CAMBIAR COLOR)
      else if (tool.id === 'recolor-tools') {
        const outFormat = selectedOutputFormat !== 'auto' ? selectedOutputFormat : resolvedFormat;
        res = await recolorImage(fileInfo.file, {
          mode: recolorMode,
          sourceColor: recolorSourceColor,
          targetColor: recolorTargetColor,
          tolerance: recolorTolerance,
          feather: recolorFeather,
          preserveLuminance: recolorPreserveLuminance,
          hueRotate: recolorHueRotate,
          tintColor: recolorTintColor,
          tintIntensity: recolorTintIntensity,
          duotoneHighlights: recolorDuotoneHighlights,
          duotoneShadows: recolorDuotoneShadows,
          redBalance: recolorRedBalance,
          greenBalance: recolorGreenBalance,
          blueBalance: recolorBlueBalance,
          temperature: recolorTemperature,
          tintBalance: recolorTintBalance,
          outputFormat: outFormat as any,
          preserveAnimation,
          onProgress: (p) => setProcessProgress(p)
        });
      }
      // 2. UNIVERSAL CONVERTER
      else if (tool.id === 'converter-tools' || tool.id === 'webp-tools' || tool.id === 'avif-tools' || tool.id === 'apng-tools' || tool.id === 'jxl-tools') {
        const fmt = tool.id === 'webp-tools' ? 'webp' : tool.id === 'avif-tools' ? 'avif' : (selectedOutputFormat !== 'auto' ? selectedOutputFormat : universalTarget);
        const maxDim = converterSpeedMode === 'turbo' ? 3840 : converterSpeedMode === 'standard' ? 2560 : undefined;
        res = await convertUniversalFormat(fileInfo.file, {
          targetFormat: fmt as any,
          quality: universalQuality / 100,
          backgroundColor: universalBgColor,
          scaleMultiplier: converterScale !== 1.0 ? converterScale : undefined,
          maxDimension: maxDim,
          icoSize,
          preserveAnimation,
          animationSpeed,
          reverseAnimation,
          loopCount,
          turboMode: converterSpeedMode !== 'original',
          onProgress: (p) => setProcessProgress(p)
        });
      }
      // 3. ENHANCED FILTERS & FX
      else if (tool.id === 'effects-tools') {
        setProcessProgress(40);
        res = await applyEnhancedFilters(fileInfo.file, {
          preset: activePreset,
          brightness,
          contrast,
          saturation,
          sepia,
          grayscale,
          invert,
          blur,
          pixelSize: activePreset === 'pixelate' ? pixelSize : 0,
          outputFormat: resolvedFormat as any
        });
        setProcessProgress(100);
      }
      // 4. COLOR PALETTE
      else if (tool.id === 'palette-tools') {
        setProcessProgress(40);
        const paletteRes = await extractImagePalette(fileInfo.file, 6);
        setExtractedPalette(paletteRes.palette);
        const baseName = fileInfo.name.substring(0, fileInfo.name.lastIndexOf('.')) || fileInfo.name;
        res = {
          blob: paletteRes.paletteImageBlob,
          url: paletteRes.paletteImageUrl,
          fileName: `aikotools_paleta_${baseName}.png`,
          newSize: paletteRes.paletteImageBlob.size,
          originalSize: fileInfo.size,
          width: 600,
          height: 180,
          format: 'PNG',
          timeTakenMs: 45,
          extraInfo: `Color dominante: ${paletteRes.dominant}`
        };
        setProcessProgress(100);
      }
      // 5. WATERMARK & CENSORSHIP
      else if (tool.id === 'watermark-tools') {
        setProcessProgress(40);
        res = await applyWatermarkAndCensor(fileInfo.file, {
          watermarkText: watermarkMode === 'text' ? watermarkText : undefined,
          watermarkImage: watermarkMode === 'image' ? watermarkImageFile : null,
          watermarkImageScale,
          opacity: watermarkOpacity,
          position: watermarkPos,
          censorBox: censorType !== 'none' ? { x: 25, y: 35, w: 50, h: 30, type: censorType } : null,
          outputFormat: resolvedFormat as any
        });
        setProcessProgress(100);
      }
      // 6. GIF & ANIMATED WEBP MAKER
      else if (tool.id === 'gif-maker') {
        if (isVideo) {
          const w = gifResolution === '480' ? 480 : gifResolution === '360' ? 360 : (fileInfo.width || 480);
          const h = Math.round(w / (originalAspectRatio || (4 / 3)));
          if (gifFormatChoice === 'webp') {
            res = await createAnimatedWebpFromVideo(fileInfo.file, {
              numFrames: gifFrames,
              interval: 1 / gifFps,
              width: w,
              height: h,
              quality: universalQuality / 100,
              onProgress: (p) => setProcessProgress(p)
            });
          } else {
            res = await createAnimatedGifFromVideo(fileInfo.file, {
              numFrames: gifFrames,
              interval: 1 / gifFps,
              gifWidth: w,
              gifHeight: h,
              onProgress: (p) => setProcessProgress(p)
            });
          }
        } else {
          res = await convertUniversalFormat(fileInfo.file, {
            targetFormat: (gifFormatChoice === 'webp' ? 'image/webp' : 'image/gif') as any,
            preserveAnimation: true,
            animationSpeed,
            reverseAnimation,
            loopCount,
            quality: universalQuality / 100,
            onProgress: (p) => setProcessProgress(p)
          });
        }
      }
      // 7. AUDIO TOOLS
      else if (tool.id === 'audio-tools') {
        if (isVideo) {
          setProcessProgress(30);
          res = await extractAudioFromVideo(fileInfo.file);
          setProcessProgress(100);
        } else {
          throw new Error('Por favor selecciona un archivo de vídeo para extraer su pista de audio.');
        }
      }
      // 8. TRANSFORM (Resize, Crop, Rotate, Flip)
      else if (tool.id === 'transform-tools') {
        setProcessProgress(40);
        if (cropRatio !== 'free') {
          res = await cropImageByRatio(fileInfo.file, cropRatio, resolvedFormat);
        } else if (rotationAngle !== 0 || flipH || flipV) {
          res = await rotateAndFlipImage(fileInfo.file, rotationAngle, flipH, flipV, resolvedFormat);
        } else {
          res = await resizeImage(fileInfo.file, width, height, resolvedFormat, transformQuality / 100);
        }
        setProcessProgress(100);
      }
      // 9. OPTIMIZE
      else if (tool.id === 'optimize-tools') {
        res = await compressAndOptimizeMedia(fileInfo.file, {
          preset: compressPreset,
          formatMode: compressFormatMode,
          quality: compressQuality,
          resolutionScale: compressScale,
          maxDimension: compressMaxDimension,
          reduceColors: compressReduceColors,
          colorPalette: compressColorPalette,
          gifOption: compressGifMode,
          onProgress: (p) => setProcessProgress(p)
        });
      }
      // 10. TEXT / MEME
      else if (tool.id === 'text-tools') {
        setProcessProgress(50);
        res = await generateMemeImage(fileInfo.file, topText, bottomText, textSizeRatio, textColor, resolvedFormat as any);
        setProcessProgress(100);
      }
      // 11. SVG
      else if (tool.id === 'svg-tools') {
        setProcessProgress(50);
        res = await renderSvgToRaster(fileInfo.file, `image/${resolvedFormat}`, svgScale);
        setProcessProgress(100);
      }
      // 12. CUT HALF (Eliminar Mitad de Imagen)
      else if (tool.id === 'cut-half-tools') {
        setProcessProgress(20);
        res = await cutOrEraseImageHalf(fileInfo.file, {
          removeTarget: halfRemoveTarget,
          action: halfAction,
          dividerPercent: halfDividerPercent,
          backgroundColor: halfBgColor,
          outputFormat: halfOutputFormat,
          quality: halfQuality / 100,
          onProgress: (p) => setProcessProgress(p)
        });
        setProcessProgress(100);
      }
      // 13. MEJORAR CALIDAD DE ARCHIVOS (ENHANCE TOOLS)
      else if (tool.id === 'enhance-tools') {
        setProcessProgress(15);
        res = await enhanceMediaQuality(fileInfo.file, {
          mode: enhanceMode,
          intensity: enhanceIntensity,
          scale: enhanceScale,
          denoiseStrength: enhanceDenoise,
          sharpenStrength: enhanceSharpen,
          contrastBoost: enhanceContrast,
          vibranceBoost: enhanceVibrance,
          outputFormat: enhanceOutputFormat as any,
          onProgress: (p) => setProcessProgress(p)
        });
        setProcessProgress(100);
      }
      // 14. FLUIDEZ Y FPS ANTI-LAG (SMOOTH TOOLS)
      else if (tool.id === 'smooth-tools') {
        setProcessProgress(15);
        res = await smoothAndAccelerateMedia(fileInfo.file, {
          mode: smoothMode,
          targetFps: smoothVyzerPreset ? 30 : smoothTargetFps,
          speedMultiplier: smoothSpeedMultiplier,
          fixBrowserDelay: smoothFixBrowserDelay,
          interpolateFrames: smoothVyzerPreset ? false : smoothInterpolate,
          removeDuplicates: smoothDropDuplicates,
          outputFormat: smoothVyzerPreset ? 'webp' : (smoothOutputFormat as any),
          vyzerPreset: smoothVyzerPreset,
          targetWidth: (smoothVyzerPreset && smoothVyzerResize) ? 1000 : undefined,
          targetHeight: (smoothVyzerPreset && smoothVyzerResize) ? 1000 : undefined,
          onProgress: (p) => setProcessProgress(p)
        });
        setProcessProgress(100);
      }
      // 12. VIDEO / SPLIT
      else if (tool.id === 'video-tools' || tool.id === 'split-tools') {
        if (isVideo) {
          setProcessProgress(40);
          res = await captureVideoFrame(fileInfo.file, videoTimestamp);
          setProcessProgress(100);
        } else {
          res = await convertImageFormat(fileInfo.file, `image/${resolvedFormat}`, 0.95);
          setProcessProgress(100);
        }
      }
      // 13. ANALYZER & EXIF PRIVACY SCRUBBER
      else if (tool.id === 'analyzer-tools') {
        setProcessProgress(25);
        res = await stripMediaMetadata(fileInfo.file, {
          outputFormat: (selectedOutputFormat !== 'auto' ? selectedOutputFormat : undefined) as any,
          onProgress: (p) => setProcessProgress(p)
        });
        setProcessProgress(100);
      }
      // Default fallback
      else {
        setProcessProgress(50);
        res = await convertImageFormat(fileInfo.file, `image/${resolvedFormat}`, 0.95);
        setProcessProgress(100);
      }

      if (res) {
        setResult(res);
        setStatus('done');

        // Notify the user immediately with no delay
        notifyUser({
          title: `✨ ${tool.name} completado`,
          body: `Tu archivo "${res.fileName}" está listo para descargar (${formatFileSize(res.newSize)}).`
        });

        // Automatically persist to 1-hour history storage in background without blocking UI
        saveToHistory(res, tool.name).catch((err) => console.warn('Deferred history save:', err));
      }
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err.message || 'Error al procesar en el dispositivo.');
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result.url;
    a.download = result.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShare = async () => {
    if (!result) return;
    if (navigator.share && navigator.canShare) {
      try {
        const file = new File([result.blob], result.fileName, { type: result.blob.type });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: result.fileName,
            text: 'Procesado con AikoTools (Zero-Data)'
          });
          return;
        }
      } catch {
        // fallback
      }
    }
    handleDownload();
  };

  return (
    <div id="workspace-container" className="w-full space-y-4 animate-in fade-in duration-300 font-['Outfit']">
      {/* Top File Summary Bar */}
      <div className="flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-[#141722] border border-[#222736] shadow-md">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#14261C] border border-[#10B981]/50 text-[#34D399]">
            {isVideo ? <Video className="h-5 w-5" /> : isGif ? <Sparkles className="h-5 w-5" /> : <Layers className="h-5 w-5" />}
          </div>
          <div className="text-left truncate">
            <p className="text-xs sm:text-sm font-bold text-white truncate max-w-[180px] sm:max-w-[240px]">
              {fileInfo.name}
            </p>
            <p className="text-[11px] text-stone-400 font-mono">
              {formatFileSize(fileInfo.size)}
              {fileInfo.width && fileInfo.height ? ` · ${fileInfo.width}×${fileInfo.height}px` : ''}
              {fileInfo.duration ? ` · ${fileInfo.duration.toFixed(1)}s` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {fileInfo.type.startsWith('image/') && (
            <button
              type="button"
              onClick={handleAnalyzeLoadedImage}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-gradient-to-r from-red-600/30 to-amber-600/30 hover:from-red-600/40 hover:to-amber-600/40 text-xs font-bold text-red-200 hover:text-white border border-red-500/40 transition-all shadow-xs"
              title={t('tools.aiAnalysisTitle', 'Analizar esta imagen con IA de Gemini')}
            >
              <Sparkles className="h-3.5 w-3.5 text-red-400 animate-spin-slow" />
              <span className="hidden sm:inline">{t('tools.aiAnalysis', 'Análisis IA')}</span>
              <span className="sm:hidden">IA</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClearFile}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-[#18202E] hover:bg-[#1E2B38] text-xs font-semibold text-[#A7F3D0] hover:text-white border border-[#26354A] transition-colors"
            title={t('upload.changeFile', 'Cambiar archivo')}
          >
            <X className="h-3.5 w-3.5 text-[#10B981]" />
            <span>{t('workspace.change', 'Cambiar')}</span>
          </button>
        </div>
      </div>

      {/* Mode Switcher specifically for Background Remover */}
      {tool.id === 'bg-remover' && (
        <div className="flex items-center justify-center sm:justify-start gap-1.5 p-1.5 rounded-2xl bg-[#141722] border border-[#222736]">
          <button
            type="button"
            onClick={() => setBgViewMode('interactive')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              bgViewMode === 'interactive'
                ? 'bg-gradient-to-r from-[#10B981] to-[#059669] text-white shadow-md border border-[#34D399]'
                : 'bg-[#181C2B] text-stone-300 hover:text-white border border-[#262C3E]'
            }`}
          >
            <Wand2 className="h-4 w-4 text-[#34D399]" />
            <span>{t('workspace.touchEditor', '🪄 Editor Táctil & Varita Mágica (En Vivo)')}</span>
          </button>
          <button
            type="button"
            onClick={() => setBgViewMode('options')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              bgViewMode === 'options'
                ? 'bg-gradient-to-r from-[#10B981] to-[#059669] text-white shadow-md border border-[#34D399]'
                : 'bg-[#181C2B] text-stone-300 hover:text-white border border-[#262C3E]'
            }`}
          >
            <Sliders className="h-4 w-4 text-[#34D399]" />
            <span>{t('workspace.autoAdjustments', '⚙️ Ajustes Automáticos y Parámetros')}</span>
          </button>
        </div>
      )}

      {tool.id === 'bg-remover' && bgViewMode === 'interactive' ? (
        <InteractiveBgEditor
          file={fileInfo.file}
          previewUrl={fileInfo.previewUrl}
          onApplyResult={(res) => {
            setResult(res);
            setStatus('done');
          }}
        />
      ) : (
        /* Main Grid: Left Controls, Right Preview */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 items-start">
        {/* Controls Card */}
        <div className="p-4 sm:p-5 rounded-3xl bg-[#141722] border border-[#222736] shadow-md space-y-4 text-left">
          <div className="flex items-center justify-between pb-2 border-b border-[#222736]">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#10B981] shadow-[0_0_8px_#10B981] animate-pulse" />
              <h3 className="text-sm font-bold text-white">
                {t(`tool.${tool.id}.name`, tool.name)}
              </h3>
            </div>
            <span className="text-[10px] font-bold tracking-widest text-[#34D399] uppercase bg-[#14261C] px-2 py-0.5 rounded-full border border-[#10B981]/40">
              {t('tools.localNotice', '100% LOCAL')}
            </span>
          </div>

          {/* Subtools Pills */}
          {tool.subtools && tool.subtools.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {tool.subtools.map((sub, i) => (
                <span
                  key={i}
                  className="rounded-lg bg-[#14201A] border border-[#1E3328] px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-[#A7F3D0] whitespace-nowrap"
                >
                  {sub}
                </span>
              ))}
            </div>
          )}

          {/* =========================================================
              0. AI IMAGE GENERATOR CONTROLS
             ========================================================= */}
          {tool.id === 'ai-image-generator' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#14261C] to-[#172033] border border-[#10B981]/40 space-y-1.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-[#34D399] animate-spin-slow" />
                    <span>Estudio Creativo de Generación con IA</span>
                  </p>
                  <span className="px-2 py-0.5 rounded-full bg-[#10B981]/20 border border-[#10B981]/50 text-[10px] font-black text-[#34D399]">
                    GEMINI ENGINE
                  </span>
                </div>
                <p className="text-[11px] text-stone-300 leading-relaxed">
                  Genera obras visuales de alta fidelidad, ilustraciones vectoriales y renders conceptuales a partir de descripciones en lenguaje natural.
                </p>
              </div>

              {/* Prompt Input + Booster */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                    <BrainCircuit className="h-3.5 w-3.5 text-[#10B981]" />
                    <span>Prompt descriptivo</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleEnhancePrompt}
                    disabled={isEnhancingPrompt || !aiPrompt.trim()}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-red-600/30 to-amber-600/30 hover:from-red-600/50 hover:to-amber-600/50 text-[11px] font-bold text-red-200 hover:text-white border border-red-500/40 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                    title="Optimizar y enriquecer el prompt con IA"
                  >
                    {isEnhancingPrompt ? (
                      <RefreshCw className="h-3 w-3 animate-spin text-red-300" />
                    ) : promptEnhancedSuccess ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Wand2 className="h-3 w-3 text-red-300" />
                    )}
                    <span>{isEnhancingPrompt ? 'Mejorando...' : promptEnhancedSuccess ? '¡Enriquecido!' : '✨ Enriquecer con IA'}</span>
                  </button>
                </div>

                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Describe la escena, colores, iluminación, personajes o atmósfera..."
                  rows={3}
                  className="w-full rounded-2xl bg-[#181C2B] border border-[#262C3E] px-3.5 py-2.5 text-xs text-white placeholder-stone-400 focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] focus:outline-hidden transition-all"
                />

                {/* Quick Inspiration Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
                  <span className="text-[10px] font-bold text-stone-400 shrink-0 flex items-center gap-1">
                    <Lightbulb className="h-3 w-3 text-amber-400" /> Ideas:
                  </span>
                  {[
                    { label: '🦊 Zorro Místico', prompt: 'Un zorro místico con runas brillantes en un bosque fluorescente nocturno' },
                    { label: '🌆 Cyberpunk Neón', prompt: 'Ciudad futurista cyberpunk bajo la lluvia con autos voladores y luces de neón holográficas' },
                    { label: '🚀 Astronauta', prompt: 'Astronauta flotando cerca de una nebulosa cósmica púrpura y dorada, hiperrealista 8k' },
                    { label: '🏯 Palacio Ghibli', prompt: 'Palacio flotante sobre nubes con arquitectura tradicional japonesa, estilo Studio Ghibli' },
                    { label: '💎 Cristal 3D', prompt: 'Gema geométrica de cristal translúcido refractando arcoíris, render 3D hiperdetallado' }
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAiPrompt(chip.prompt)}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-[#141824] hover:bg-[#1E2538] border border-[#242C3F] text-stone-300 hover:text-white transition-colors shrink-0"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Style Presets Grid */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-300">
                  Estilo Artístico
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'vibrant', label: 'Vibrante', desc: 'Colores vivos' },
                    { id: 'cinematic', label: 'Cinematográfico', desc: 'Fotografía 8K' },
                    { id: 'anime', label: 'Anime / Ghibli', desc: 'Ilustración digital' },
                    { id: 'cyberpunk', label: 'Cyberpunk', desc: 'Neón & Hologramas' },
                    { id: '3d-render', label: '3D Render Pixar', desc: 'Texturas suaves' },
                    { id: 'pixelart', label: 'Pixel Art 8-Bit', desc: 'Retro Arcade' },
                    { id: 'fantasy', label: 'Dark Fantasy', desc: 'Mágico & Épico' },
                    { id: 'vintage-photo', label: 'Foto Vintage', desc: 'Película 35mm' },
                    { id: 'minimalist', label: 'Vector Flat', desc: 'Líneas limpias' }
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setAiStyle(st.id as any)}
                      className={`p-2 rounded-xl text-left border transition-all ${
                        aiStyle === st.id
                          ? 'bg-[#14261C] border-[#10B981] text-[#34D399] shadow-xs ring-1 ring-[#10B981]/50'
                          : 'bg-[#181C2B] border-[#262C3E] text-stone-300 hover:text-white hover:border-[#37405A]'
                      }`}
                    >
                      <p className="text-xs font-bold truncate">{st.label}</p>
                      <p className="text-[9px] text-stone-400 truncate">{st.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio & Quality Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Aspect Ratio */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-stone-300">
                    Relación de Aspecto
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { id: '1:1', label: '1:1' },
                      { id: '16:9', label: '16:9' },
                      { id: '9:16', label: '9:16' },
                      { id: '4:3', label: '4:3' }
                    ].map((ar) => (
                      <button
                        key={ar.id}
                        type="button"
                        onClick={() => setAiAspectRatio(ar.id as any)}
                        className={`py-2 rounded-xl text-xs text-center border font-bold transition-all ${
                          aiAspectRatio === ar.id
                            ? 'bg-[#14261C] border-[#10B981] text-[#34D399]'
                            : 'bg-[#181C2B] border-[#262C3E] text-stone-300 hover:text-white'
                        }`}
                      >
                        {ar.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Output Format */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-stone-300">
                    Formato de Archivo
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: 'webp', label: 'WEBP' },
                      { id: 'png', label: 'PNG' },
                      { id: 'jpg', label: 'JPG' }
                    ].map((fmt) => (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => setSelectedOutputFormat(fmt.id as any)}
                        className={`py-2 rounded-xl text-xs text-center border font-bold transition-all ${
                          (selectedOutputFormat === fmt.id || (selectedOutputFormat === 'auto' && fmt.id === 'webp'))
                            ? 'bg-[#14261C] border-[#10B981] text-[#34D399]'
                            : 'bg-[#181C2B] border-[#262C3E] text-stone-300 hover:text-white'
                        }`}
                      >
                        {fmt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              1. BACKGROUND REMOVER CONTROLS (ELIMINAR FONDO INTELIGENTE)
             ========================================================= */}
          {tool.id === 'bg-remover' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#12231A] to-[#151D2C] border border-[#10B981]/40 space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Eraser className="h-4 w-4 text-[#34D399]" />
                    <span>Eliminador Inteligente de Fondo Multi-Modo</span>
                  </p>
                  <span className="px-2 py-0.5 rounded-full bg-[#10B981]/20 border border-[#10B981]/50 text-[10px] font-bold text-[#34D399]">
                    ALTA PRECISIÓN
                  </span>
                </div>
                <p className="text-[11px] text-stone-300 leading-relaxed">
                  Algoritmo perceptual Delta-E con barrera de gradiente, descontaminación de halos y exportación en múltiples formatos con o sin transparencia.
                </p>
              </div>

              {/* Formato de Salida de la Imagen sin Fondo */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-[#10B981]" />
                    Formato de archivo de salida
                  </span>
                  <span className="text-[10px] text-[#34D399] font-mono font-bold uppercase">
                    {bgOutputFormat} {bgOutputFormat !== 'jpg' ? '(Alfa)' : '(Sólido)'}
                  </span>
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'png', label: 'PNG', desc: 'Transparente HD' },
                    { id: 'webp', label: 'WEBP', desc: 'Ultra ligero' },
                    { id: 'avif', label: 'AVIF', desc: 'Next-Gen' },
                    { id: 'ico', label: 'ICO', desc: 'Favicon' },
                    { id: 'jpg', label: 'JPG', desc: 'Con fondo' },
                    { id: 'bmp', label: 'BMP', desc: 'Bitmap' },
                    { id: 'pdf', label: 'PDF', desc: 'Documento' }
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => {
                        setBgOutputFormat(fmt.id as any);
                        setSelectedOutputFormat(fmt.id as any);
                      }}
                      className={`p-2 rounded-xl text-left border transition-all ${
                        bgOutputFormat === fmt.id
                          ? 'bg-gradient-to-r from-[#10B981] to-[#059669] text-white border-[#34D399] shadow-[0_0_8px_rgba(16,185,129,0.5)] font-bold'
                          : 'bg-[#181C2B] border-[#262C3E] text-stone-300 hover:text-white'
                      }`}
                    >
                      <p className="text-xs font-black uppercase">{fmt.label}</p>
                      <p className="text-[9px] text-stone-300/80 truncate">{fmt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode Selection */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                  Estrategia de Detección y Recorte
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setBgMode('flood')}
                    className={`p-2.5 rounded-xl text-left border text-xs transition-all ${
                      bgMode === 'flood'
                        ? 'bg-[#14261C] border-[#10B981] text-[#34D399] font-bold shadow-xs'
                        : 'bg-[#181C2B] border-[#262C3E] text-stone-300 hover:text-white'
                    }`}
                  >
                    <p className="font-bold">Bordes Continuos</p>
                    <p className="text-[9px] text-stone-400">Protege colores interiores</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBgMode('subject')}
                    className={`p-2.5 rounded-xl text-left border text-xs transition-all ${
                      bgMode === 'subject'
                        ? 'bg-[#14261C] border-[#10B981] text-[#34D399] font-bold shadow-xs'
                        : 'bg-[#181C2B] border-[#262C3E] text-stone-300 hover:text-white'
                    }`}
                  >
                    <p className="font-bold">Auto Sujeto</p>
                    <p className="text-[9px] text-stone-400">Escaneo de silueta</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBgMode('global')}
                    className={`p-2.5 rounded-xl text-left border text-xs transition-all ${
                      bgMode === 'global'
                        ? 'bg-[#14261C] border-[#10B981] text-[#34D399] font-bold shadow-xs'
                        : 'bg-[#181C2B] border-[#262C3E] text-stone-300 hover:text-white'
                    }`}
                  >
                    <p className="font-bold">Chroma Global</p>
                    <p className="text-[9px] text-stone-400">Todo el color clave</p>
                  </button>
                </div>
              </div>

              {/* Color Clave a Eliminar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-stone-300 font-semibold">
                  <span>Color clave a remover</span>
                  <span className="text-[10px] text-[#34D399] font-mono">
                    {bgCustomColor ? bgCustomColor.toUpperCase() : 'Auto Detección Perimetral'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setBgCustomColor(null)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      bgCustomColor === null
                        ? 'bg-[#14261C] border-[#10B981] text-[#34D399]'
                        : 'bg-[#181C2B] border-[#262C3E] text-stone-300 hover:text-white'
                    }`}
                  >
                    Auto Inteligente
                  </button>

                  <button
                    type="button"
                    onClick={() => setBgCustomColor('#FFFFFF')}
                    className={`px-2 py-1.5 rounded-xl text-xs border transition-all flex items-center gap-1.5 ${
                      bgCustomColor === '#FFFFFF' ? 'border-[#10B981] bg-[#14261C] text-[#34D399] font-bold' : 'border-[#262C3E] bg-[#181C2B] text-stone-300'
                    }`}
                  >
                    <span className="h-3 w-3 rounded-full bg-white border border-stone-600" />
                    Blanco
                  </button>

                  <button
                    type="button"
                    onClick={() => setBgCustomColor('#000000')}
                    className={`px-2 py-1.5 rounded-xl text-xs border transition-all flex items-center gap-1.5 ${
                      bgCustomColor === '#000000' ? 'border-[#10B981] bg-[#14261C] text-[#34D399] font-bold' : 'border-[#262C3E] bg-[#181C2B] text-stone-300'
                    }`}
                  >
                    <span className="h-3 w-3 rounded-full bg-black border border-stone-600" />
                    Negro
                  </button>

                  <button
                    type="button"
                    onClick={() => setBgCustomColor('#00FF00')}
                    className={`px-2 py-1.5 rounded-xl text-xs border transition-all flex items-center gap-1.5 ${
                      bgCustomColor === '#00FF00' ? 'border-[#10B981] bg-[#14261C] text-[#34D399] font-bold' : 'border-[#262C3E] bg-[#181C2B] text-stone-300'
                    }`}
                  >
                    <span className="h-3 w-3 rounded-full bg-[#00FF00]" />
                    Chroma Verde
                  </button>

                  <div className="flex items-center gap-1 bg-[#181C2B] border border-[#262C3E] px-2 py-1 rounded-xl">
                    <input
                      type="color"
                      value={bgCustomColor || '#FFFFFF'}
                      onChange={(e) => setBgCustomColor(e.target.value)}
                      className="h-5 w-6 rounded cursor-pointer bg-transparent border-0"
                      title="Seleccionar color personalizado"
                    />
                    <span className="text-[10px] text-stone-300 font-mono">
                      {bgCustomColor || 'Elegir'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Fondo de Reemplazo (Transparente o Color Sólido) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-stone-300 font-semibold">
                  <span>Color de fondo de reemplazo</span>
                  <span className="text-[10px] text-[#34D399] font-mono uppercase">
                    {bgReplaceColor === 'transparent' ? 'Transparente (Alfa)' : bgReplaceColor}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setBgReplaceColor('transparent')}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      bgReplaceColor === 'transparent'
                        ? 'bg-[#14261C] border-[#10B981] text-[#34D399]'
                        : 'bg-[#181C2B] border-[#262C3E] text-stone-300'
                    }`}
                  >
                    Transparente
                  </button>

                  <button
                    type="button"
                    onClick={() => setBgReplaceColor('#FFFFFF')}
                    className={`px-2 py-1.5 rounded-xl text-xs border transition-all flex items-center gap-1.5 ${
                      bgReplaceColor === '#FFFFFF' ? 'border-[#10B981] bg-[#14261C] text-[#34D399] font-bold' : 'border-[#262C3E] bg-[#181C2B] text-stone-300'
                    }`}
                  >
                    <span className="h-3 w-3 rounded-full bg-white border border-stone-600" />
                    Blanco
                  </button>

                  <button
                    type="button"
                    onClick={() => setBgReplaceColor('#000000')}
                    className={`px-2 py-1.5 rounded-xl text-xs border transition-all flex items-center gap-1.5 ${
                      bgReplaceColor === '#000000' ? 'border-[#10B981] bg-[#14261C] text-[#34D399] font-bold' : 'border-[#262C3E] bg-[#181C2B] text-stone-300'
                    }`}
                  >
                    <span className="h-3 w-3 rounded-full bg-black border border-stone-600" />
                    Negro
                  </button>

                  <button
                    type="button"
                    onClick={() => setBgReplaceColor('#00FF00')}
                    className={`px-2 py-1.5 rounded-xl text-xs border transition-all flex items-center gap-1.5 ${
                      bgReplaceColor === '#00FF00' ? 'border-[#10B981] bg-[#14261C] text-[#34D399] font-bold' : 'border-[#262C3E] bg-[#181C2B] text-stone-300'
                    }`}
                  >
                    <span className="h-3 w-3 rounded-full bg-[#00FF00]" />
                    Chroma
                  </button>

                  <div className="flex items-center gap-1 bg-[#181C2B] border border-[#262C3E] px-2 py-1 rounded-xl">
                    <input
                      type="color"
                      value={bgReplaceColor === 'transparent' ? '#FFFFFF' : bgReplaceColor}
                      onChange={(e) => setBgReplaceColor(e.target.value)}
                      className="h-5 w-6 rounded cursor-pointer bg-transparent border-0"
                    />
                    <span className="text-[10px] text-stone-300 font-mono">
                      {bgReplaceColor === 'transparent' ? 'Personalizar' : bgReplaceColor}
                    </span>
                  </div>
                </div>
              </div>

              {/* Anti-Halo & Despill Pass */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#181C2B] border border-[#262C3E]">
                <div>
                  <p className="text-xs font-bold text-white">Descontaminación de halos (Anti-Halo)</p>
                  <p className="text-[10px] text-stone-400">Elimina el resplandor residual de color en el contorno</p>
                </div>
                <input
                  type="checkbox"
                  checked={bgDefringe}
                  onChange={(e) => setBgDefringe(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#10B981] cursor-pointer"
                />
              </div>

              {/* Tolerance Slider */}
              <div>
                <div className="flex justify-between text-xs text-stone-300 mb-1 font-medium">
                  <span>Tolerancia de Color ({bgTolerance}%)</span>
                  <span className="text-[#34D399] font-mono font-bold">
                    {bgTolerance < 20 ? 'Estricta' : bgTolerance < 45 ? 'Óptima' : 'Amplia'}
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="90"
                  value={bgTolerance}
                  onChange={(e) => setBgTolerance(Number(e.target.value))}
                  className="w-full accent-[#10B981]"
                />
              </div>

              {/* Edge Feathering Slider */}
              <div>
                <div className="flex justify-between text-xs text-stone-300 mb-1 font-medium">
                  <span>Suavizado de Bordes ({bgFeather}px)</span>
                  <span className="text-[#34D399] font-mono font-bold">
                    {bgFeather === 0 ? 'Borde duro' : bgFeather < 5 ? 'Natural' : 'Ultra suave'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="12"
                  value={bgFeather}
                  onChange={(e) => setBgFeather(Number(e.target.value))}
                  className="w-full accent-[#10B981]"
                />
              </div>
            </div>
          )}

          {/* =========================================================
              1B. RECOLOR / COLOR CHANGER CONTROLS (CAMBIAR COLOR)
             ========================================================= */}
          {tool.id === 'recolor-tools' && (
            <div className="space-y-4">
              {/* Tool Header Banner */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#10242B] to-[#141C2D] border border-cyan-500/40 space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Pipette className="h-4 w-4 text-cyan-400" />
                    <span>Laboratorio de Color & Reemplazo Cromático</span>
                  </p>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/50 text-[10px] font-bold text-cyan-300">
                    PRECISIÓN CIELAB
                  </span>
                </div>
                <p className="text-[11px] text-stone-300 leading-relaxed">
                  Cambia colores específicos fotorrealistamente respetando sombras y texturas, rota el espectro tonal, o aplica duotonos de alto contraste.
                </p>
              </div>

              {/* Mode Selection Tabs */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                  Modo de Edición de Color
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setRecolorMode('selective')}
                    className={`p-2 rounded-xl text-left border text-xs transition-all ${
                      recolorMode === 'selective'
                        ? 'bg-[#10242B] border-cyan-500 text-cyan-300 font-bold shadow-xs'
                        : 'bg-[#181C2B] border-[#262C3E] text-stone-300 hover:text-white'
                    }`}
                  >
                    <p className="font-bold flex items-center gap-1">🎯 Selectivo</p>
                    <p className="text-[9px] text-stone-400">Reemplaza un color</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRecolorMode('hue-shift')}
                    className={`p-2 rounded-xl text-left border text-xs transition-all ${
                      recolorMode === 'hue-shift'
                        ? 'bg-[#10242B] border-cyan-500 text-cyan-300 font-bold shadow-xs'
                        : 'bg-[#181C2B] border-[#262C3E] text-stone-300 hover:text-white'
                    }`}
                  >
                    <p className="font-bold flex items-center gap-1">🌈 Rueda Tonal</p>
                    <p className="text-[9px] text-stone-400">Rotación 360°</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRecolorMode('duotone')}
                    className={`p-2 rounded-xl text-left border text-xs transition-all ${
                      recolorMode === 'duotone' || recolorMode === 'tint'
                        ? 'bg-[#10242B] border-cyan-500 text-cyan-300 font-bold shadow-xs'
                        : 'bg-[#181C2B] border-[#262C3E] text-stone-300 hover:text-white'
                    }`}
                  >
                    <p className="font-bold flex items-center gap-1">🎭 Duotono</p>
                    <p className="text-[9px] text-stone-400">Luces & Sombras</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRecolorMode('balance')}
                    className={`p-2 rounded-xl text-left border text-xs transition-all ${
                      recolorMode === 'balance'
                        ? 'bg-[#10242B] border-cyan-500 text-cyan-300 font-bold shadow-xs'
                        : 'bg-[#181C2B] border-[#262C3E] text-stone-300 hover:text-white'
                    }`}
                  >
                    <p className="font-bold flex items-center gap-1">🎛️ Balance RGB</p>
                    <p className="text-[9px] text-stone-400">Canales & Tonalidad</p>
                  </button>
                </div>
              </div>

              {/* 1. SELECTIVE RECOLOR MODE CONTROLS */}
              {recolorMode === 'selective' && (
                <div className="space-y-3.5 pt-1">
                  {/* Eyedropper sampling banner */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs">
                    <div className="flex items-center gap-2">
                      <Pipette className="h-4 w-4 text-cyan-400" />
                      <div>
                        <span className="font-bold text-white">Muestreador Interactivo</span>
                        <p className="text-[10px] text-cyan-200/80">Haz clic en la vista previa para seleccionar el color a reemplazar</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEyedropperActive(!isEyedropperActive)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        isEyedropperActive
                          ? 'bg-cyan-500 text-black shadow-md animate-pulse'
                          : 'bg-cyan-900/60 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-800'
                      }`}
                    >
                      {isEyedropperActive ? '✓ Listo para clic' : 'Activar Pipeta'}
                    </button>
                  </div>

                  {/* Auto-detected dominant colors in image */}
                  {recolorDetectedColors.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-[#141824] border border-[#232B3E] space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-stone-300 flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                          Colores detectados en tu imagen:
                        </span>
                        <span className="text-[10px] text-cyan-300">1 Clic para seleccionar origen</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {recolorDetectedColors.map((hex) => (
                          <button
                            key={hex}
                            type="button"
                            onClick={() => {
                              setRecolorSourceColor(hex);
                              setEyedropperSampledHex(hex);
                            }}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono border transition-all cursor-pointer ${
                              recolorSourceColor.toLowerCase() === hex.toLowerCase()
                                ? 'border-cyan-400 bg-cyan-950/80 text-cyan-300 font-bold ring-1 ring-cyan-400 shadow-xs'
                                : 'border-[#262C3E] bg-[#181C2B] text-stone-300 hover:border-cyan-500/50 hover:text-white'
                            }`}
                          >
                            <span className="h-3.5 w-3.5 rounded-full border border-black/40 shadow-xs shrink-0" style={{ backgroundColor: hex }} />
                            <span>{hex.toUpperCase()}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Colors pickers: Source vs Target */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Source Color */}
                    <div className="p-2.5 rounded-xl bg-[#181C2B] border border-[#262C3E] space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-stone-300">Color a reemplazar</span>
                        <span className="font-mono text-[10px] text-cyan-300">{recolorSourceColor.toUpperCase()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={recolorSourceColor}
                          onChange={(e) => setRecolorSourceColor(e.target.value)}
                          className="h-8 w-12 rounded-lg cursor-pointer bg-transparent border-0 shrink-0"
                        />
                        <input
                          type="text"
                          value={recolorSourceColor}
                          onChange={(e) => setRecolorSourceColor(e.target.value)}
                          className="w-full rounded-lg bg-[#121520] border border-[#2B3248] px-2.5 py-1 text-xs text-white font-mono uppercase"
                          placeholder="#000000"
                        />
                      </div>
                    </div>

                    {/* Target Color */}
                    <div className="p-2.5 rounded-xl bg-[#181C2B] border border-[#262C3E] space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-stone-300">Nuevo Color</span>
                        <span className="font-mono text-[10px] text-emerald-400">{recolorTargetColor.toUpperCase()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={recolorTargetColor}
                          onChange={(e) => setRecolorTargetColor(e.target.value)}
                          className="h-8 w-12 rounded-lg cursor-pointer bg-transparent border-0 shrink-0"
                        />
                        <input
                          type="text"
                          value={recolorTargetColor}
                          onChange={(e) => setRecolorTargetColor(e.target.value)}
                          className="w-full rounded-lg bg-[#121520] border border-[#2B3248] px-2.5 py-1 text-xs text-white font-mono uppercase"
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quick Color Swatches Palette */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-stone-400">
                      Paleta Rápida para el Nuevo Color:
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        { color: '#EF4444', label: 'Rojo Carmesí' },
                        { color: '#F97316', label: 'Naranja Fuego' },
                        { color: '#F59E0B', label: 'Oro Solar' },
                        { color: '#10B981', label: 'Verde Esmeralda' },
                        { color: '#06B6D4', label: 'Cyan Neón' },
                        { color: '#3B82F6', label: 'Azul Real' },
                        { color: '#8B5CF6', label: 'Púrpura' },
                        { color: '#EC4899', label: 'Rosa Magenta' },
                        { color: '#FFFFFF', label: 'Blanco Nieve' },
                        { color: '#18181B', label: 'Negro Azabache' }
                      ].map((item) => (
                        <button
                          key={item.color}
                          type="button"
                          onClick={() => setRecolorTargetColor(item.color)}
                          title={item.label}
                          className={`h-6 w-6 rounded-lg border transition-all cursor-pointer ${
                            recolorTargetColor.toLowerCase() === item.color.toLowerCase()
                              ? 'border-white ring-2 ring-cyan-400 scale-110 shadow-sm'
                              : 'border-stone-700 hover:scale-105'
                          }`}
                          style={{ backgroundColor: item.color }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Tolerance Slider */}
                  <div>
                    <div className="flex justify-between text-xs text-stone-300 mb-1 font-medium">
                      <span>Tolerancia de Coincidencia ({recolorTolerance}%)</span>
                      <span className="text-cyan-300 font-mono font-bold">
                        {recolorTolerance < 20 ? 'Tono estricto' : recolorTolerance < 45 ? 'Equilibrado' : 'Amplio'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="90"
                      value={recolorTolerance}
                      onChange={(e) => setRecolorTolerance(Number(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  {/* Feathering Slider */}
                  <div>
                    <div className="flex justify-between text-xs text-stone-300 mb-1 font-medium">
                      <span>Suavizado de Transición / Feather ({recolorFeather}px)</span>
                      <span className="text-cyan-300 font-mono font-bold">
                        {recolorFeather === 0 ? 'Borde nítido' : recolorFeather < 6 ? 'Gradual' : 'Muy suave'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      value={recolorFeather}
                      onChange={(e) => setRecolorFeather(Number(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  {/* Luminance Preserving Toggle */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#181C2B] border border-[#262C3E]">
                    <div>
                      <p className="text-xs font-bold text-white">Preservar Sombras & Textura (Fotorrealista)</p>
                      <p className="text-[10px] text-stone-400">Conserva el relieve, arrugas y brillo natural de la prenda u objeto</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={recolorPreserveLuminance}
                      onChange={(e) => setRecolorPreserveLuminance(e.target.checked)}
                      className="h-4 w-4 rounded accent-cyan-400 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* 2. HUE-SHIFT (ROTACIÓN TONAL 360°) */}
              {recolorMode === 'hue-shift' && (
                <div className="space-y-3.5 pt-1">
                  <div>
                    <div className="flex justify-between text-xs text-stone-300 mb-1 font-medium">
                      <span>Giro del Espectro Cromático:</span>
                      <span className="text-cyan-300 font-mono font-bold text-sm">{recolorHueRotate}°</span>
                    </div>
                    <div className="h-3 w-full rounded-lg bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-cyan-500 via-blue-500 via-purple-500 to-red-500 mb-2" />
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={recolorHueRotate}
                      onChange={(e) => setRecolorHueRotate(Number(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  {/* Quick Angle Presets */}
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-400 mb-1">
                      Ángulos Típicos de Reemplazo:
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { angle: 60, label: '+60° Cálido' },
                        { angle: 120, label: '+120° Esmeralda' },
                        { angle: 180, label: '+180° Complementario' },
                        { angle: 240, label: '+240° Azul Profundo' }
                      ].map((item) => (
                        <button
                          key={item.angle}
                          type="button"
                          onClick={() => setRecolorHueRotate(item.angle)}
                          className={`p-2 rounded-xl text-center border text-xs font-bold transition-all ${
                            recolorHueRotate === item.angle
                              ? 'bg-[#10242B] border-cyan-500 text-cyan-300'
                              : 'bg-[#181C2B] border-[#262C3E] text-stone-300 hover:text-white'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 3. DUOTONE & TINT CONTROLS */}
              {(recolorMode === 'duotone' || recolorMode === 'tint') && (
                <div className="space-y-3.5 pt-1">
                  {/* Duotone vs Tint Selector */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setRecolorMode('duotone')}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        recolorMode === 'duotone'
                          ? 'bg-[#10242B] border-cyan-500 text-cyan-300'
                          : 'bg-[#181C2B] border-[#262C3E] text-stone-400 hover:text-white'
                      }`}
                    >
                      🎭 Duotono Completo
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecolorMode('tint')}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        recolorMode === 'tint'
                          ? 'bg-[#10242B] border-cyan-500 text-cyan-300'
                          : 'bg-[#181C2B] border-[#262C3E] text-stone-400 hover:text-white'
                      }`}
                    >
                      🎨 Tinte Monocromático
                    </button>
                  </div>

                  {recolorMode === 'duotone' ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2.5">
                        {/* Highlights Picker */}
                        <div className="p-2.5 rounded-xl bg-[#181C2B] border border-[#262C3E] space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-stone-300">Altas Luces</span>
                            <span className="font-mono text-[10px] text-amber-300">{recolorDuotoneHighlights.toUpperCase()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={recolorDuotoneHighlights}
                              onChange={(e) => setRecolorDuotoneHighlights(e.target.value)}
                              className="h-8 w-10 rounded-lg cursor-pointer bg-transparent border-0 shrink-0"
                            />
                            <input
                              type="text"
                              value={recolorDuotoneHighlights}
                              onChange={(e) => setRecolorDuotoneHighlights(e.target.value)}
                              className="w-full rounded-lg bg-[#121520] border border-[#2B3248] px-2 py-1 text-xs text-white font-mono uppercase"
                            />
                          </div>
                        </div>

                        {/* Shadows Picker */}
                        <div className="p-2.5 rounded-xl bg-[#181C2B] border border-[#262C3E] space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-stone-300">Sombras</span>
                            <span className="font-mono text-[10px] text-purple-400">{recolorDuotoneShadows.toUpperCase()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={recolorDuotoneShadows}
                              onChange={(e) => setRecolorDuotoneShadows(e.target.value)}
                              className="h-8 w-10 rounded-lg cursor-pointer bg-transparent border-0 shrink-0"
                            />
                            <input
                              type="text"
                              value={recolorDuotoneShadows}
                              onChange={(e) => setRecolorDuotoneShadows(e.target.value)}
                              className="w-full rounded-lg bg-[#121520] border border-[#2B3248] px-2 py-1 text-xs text-white font-mono uppercase"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Famous Duotone Presets */}
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-semibold text-stone-400">
                          Estilos Duotono Populares:
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { name: 'Cyberpunk', high: '#FDE047', shad: '#312E81' },
                            { name: 'Sunset Neo', high: '#FB923C', shad: '#701A75' },
                            { name: 'Matrix Acid', high: '#4ADE80', shad: '#052E16' },
                            { name: 'Spotify Wave', high: '#2DD4BF', shad: '#1E1B4B' },
                            { name: 'Crimson Night', high: '#F87171', shad: '#18181B' },
                            { name: 'Gold Vintage', high: '#FDE68A', shad: '#451A03' }
                          ].map((preset) => (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() => {
                                setRecolorDuotoneHighlights(preset.high);
                                setRecolorDuotoneShadows(preset.shad);
                              }}
                              className="p-2 rounded-xl bg-[#181C2B] hover:bg-[#20263A] border border-[#262C3E] text-left transition-all flex items-center justify-between"
                            >
                              <span className="text-xs font-bold text-stone-200 truncate">{preset.name}</span>
                              <div className="flex gap-1 shrink-0">
                                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: preset.high }} />
                                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: preset.shad }} />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Tint mode */
                    <div className="space-y-3">
                      <div className="p-2.5 rounded-xl bg-[#181C2B] border border-[#262C3E] space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-stone-300">Color de Tinte</span>
                          <span className="font-mono text-[10px] text-purple-300">{recolorTintColor.toUpperCase()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={recolorTintColor}
                            onChange={(e) => setRecolorTintColor(e.target.value)}
                            className="h-8 w-12 rounded-lg cursor-pointer bg-transparent border-0 shrink-0"
                          />
                          <input
                            type="text"
                            value={recolorTintColor}
                            onChange={(e) => setRecolorTintColor(e.target.value)}
                            className="w-full rounded-lg bg-[#121520] border border-[#2B3248] px-2.5 py-1 text-xs text-white font-mono uppercase"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs text-stone-300 mb-1 font-medium">
                          <span>Intensidad de Tinte ({recolorTintIntensity}%)</span>
                          <span className="text-cyan-300 font-mono font-bold">{recolorTintIntensity}%</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="100"
                          value={recolorTintIntensity}
                          onChange={(e) => setRecolorTintIntensity(Number(e.target.value))}
                          className="w-full accent-cyan-400"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 4. BALANCE RGB & TEMPERATURE */}
              {recolorMode === 'balance' && (
                <div className="space-y-3 pt-1">
                  {/* Red Channel */}
                  <div>
                    <div className="flex justify-between text-xs text-stone-300 mb-1 font-medium">
                      <span className="text-red-400 font-semibold">Canal Rojo</span>
                      <span className="font-mono font-bold">{recolorRedBalance > 0 ? `+${recolorRedBalance}` : recolorRedBalance}</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={recolorRedBalance}
                      onChange={(e) => setRecolorRedBalance(Number(e.target.value))}
                      className="w-full accent-red-500"
                    />
                  </div>

                  {/* Green Channel */}
                  <div>
                    <div className="flex justify-between text-xs text-stone-300 mb-1 font-medium">
                      <span className="text-emerald-400 font-semibold">Canal Verde</span>
                      <span className="font-mono font-bold">{recolorGreenBalance > 0 ? `+${recolorGreenBalance}` : recolorGreenBalance}</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={recolorGreenBalance}
                      onChange={(e) => setRecolorGreenBalance(Number(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>

                  {/* Blue Channel */}
                  <div>
                    <div className="flex justify-between text-xs text-stone-300 mb-1 font-medium">
                      <span className="text-blue-400 font-semibold">Canal Azul</span>
                      <span className="font-mono font-bold">{recolorBlueBalance > 0 ? `+${recolorBlueBalance}` : recolorBlueBalance}</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={recolorBlueBalance}
                      onChange={(e) => setRecolorBlueBalance(Number(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                  </div>

                  {/* Temperature */}
                  <div>
                    <div className="flex justify-between text-xs text-stone-300 mb-1 font-medium">
                      <span className="text-amber-300 font-semibold">Temperatura (Frío ↔ Cálido)</span>
                      <span className="font-mono font-bold">{recolorTemperature > 0 ? `+${recolorTemperature}` : recolorTemperature}</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={recolorTemperature}
                      onChange={(e) => setRecolorTemperature(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setRecolorRedBalance(0);
                      setRecolorGreenBalance(0);
                      setRecolorBlueBalance(0);
                      setRecolorTemperature(0);
                      setRecolorTintBalance(0);
                    }}
                    className="w-full py-1.5 rounded-xl bg-[#181C2B] hover:bg-[#20263A] border border-[#262C3E] text-stone-300 text-xs font-bold transition-all"
                  >
                    Restablecer Balances a Cero
                  </button>
                </div>
              )}

              {/* Output format selector for recolor */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                  Formato de salida
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'png', label: 'PNG', desc: 'Máxima Calidad' },
                    { id: 'webp', label: 'WEBP', desc: 'Optimizado' },
                    { id: 'jpg', label: 'JPG', desc: 'Fotográfico' },
                    { id: 'avif', label: 'AVIF', desc: 'Next-Gen' }
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setSelectedOutputFormat(fmt.id as any)}
                      className={`p-2 rounded-xl text-left border transition-all ${
                        selectedOutputFormat === fmt.id || (selectedOutputFormat === 'auto' && fmt.id === 'png')
                          ? 'bg-[#10242B] border-cyan-500 text-cyan-300 font-bold shadow-xs'
                          : 'bg-[#181C2B] border-[#262C3E] text-stone-300 hover:text-white'
                      }`}
                    >
                      <p className="text-xs font-black uppercase">{fmt.label}</p>
                      <p className="text-[9px] text-stone-400 truncate">{fmt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              2. UNIVERSAL CONVERTER CONTROLS
             ========================================================= */}
          {tool.id === 'converter-tools' && (
            <div className="space-y-3.5">
              <label className="block text-xs font-semibold text-stone-300">
                Formato de destino
              </label>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {[
                  { id: 'webp', label: 'WEBP', desc: 'Ultra ligero' },
                  { id: 'png', label: 'PNG', desc: 'Transparente' },
                  { id: 'jpg', label: 'JPG', desc: 'Fotografía' },
                  { id: 'avif', label: 'AVIF', desc: 'Next-Gen' },
                  { id: 'gif', label: 'GIF', desc: 'Animado/Web' },
                  { id: 'ico', label: 'ICO', desc: 'Favicon' },
                  { id: 'bmp', label: 'BMP', desc: 'Bitmap crudo' },
                  { id: 'pdf', label: 'PDF', desc: 'Documento' },
                  { id: 'svg', label: 'SVG', desc: 'Vectorial' }
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => {
                      setUniversalTarget(fmt.id as any);
                      setSelectedOutputFormat(fmt.id as any);
                    }}
                    className={`p-2 rounded-xl text-left border transition-all ${
                      universalTarget === fmt.id
                        ? 'bg-gradient-to-r from-[#10B981] to-[#059669] text-white border-[#34D399] shadow-[0_0_8px_rgba(16,185,129,0.5)] font-bold'
                        : 'bg-[#181C2B] border-[#262C3E] text-stone-300 hover:text-white'
                    }`}
                  >
                    <p className="text-xs font-black uppercase">{fmt.label}</p>
                    <p className="text-[9px] text-stone-300/80 truncate">{fmt.desc}</p>
                  </button>
                ))}
              </div>

              {/* If ICO selected, show icon size presets */}
              {universalTarget === 'ico' && (
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Tamaño del Favicon ICO
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[16, 32, 64, 128, 256].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setIcoSize(s as any)}
                        className={`py-1.5 rounded-xl text-xs font-mono font-bold border transition-all ${
                          icoSize === s
                            ? 'bg-[#14261C] border-[#10B981] text-[#34D399]'
                            : 'bg-[#181C2B] border-[#262C3E] text-stone-300'
                        }`}
                      >
                        {s}×{s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* If JPG/BMP selected, show background color for transparency fill */}
              {(universalTarget === 'jpg' || universalTarget === 'bmp') && (
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Color de Fondo (para transparencias)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={universalBgColor}
                      onChange={(e) => setUniversalBgColor(e.target.value)}
                      className="h-8 w-10 rounded-lg cursor-pointer bg-transparent border border-[#2B3248]"
                    />
                    <span className="text-xs font-mono text-stone-300 uppercase">{universalBgColor}</span>
                    <button
                      type="button"
                      onClick={() => setUniversalBgColor('#FFFFFF')}
                      className="px-2 py-1 rounded-lg bg-[#181C2B] border border-[#2B3248] text-[10px] text-stone-300 hover:text-white"
                    >
                      Blanco
                    </button>
                    <button
                      type="button"
                      onClick={() => setUniversalBgColor('#000000')}
                      className="px-2 py-1 rounded-lg bg-[#181C2B] border border-[#2B3248] text-[10px] text-stone-300 hover:text-white"
                    >
                      Negro
                    </button>
                  </div>
                </div>
              )}

              {/* Animation Preservation Settings if input is animated or WebP/GIF selected */}
              {(isAnimatedFile || universalTarget === 'webp' || universalTarget === 'gif') && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#12231A] to-[#16202E] border border-[#10B981]/40 space-y-3 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Film className="h-4 w-4 text-[#34D399] animate-pulse" />
                      <span className="text-xs font-bold text-white">
                        {isAnimatedFile ? 'Animación y Movimiento Detectado' : 'Ajustes de Animación WebP / GIF'}
                      </span>
                    </div>
                    {isAnimatedFile && (
                      <span className="px-2 py-0.5 rounded-full bg-[#10B981]/20 border border-[#10B981]/50 text-[10px] font-bold text-[#34D399]">
                        {animationInfo.type.toUpperCase()} ANIMADO
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-stone-300 leading-relaxed">
                    Extrae y preserva <strong>el 100% de los fotogramas originales</strong> con decodificación nativa de alta fidelidad, sincronización de milisegundos y bucle continuo.
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-[#26352E]">
                    <label className="text-xs text-stone-200 font-medium cursor-pointer" htmlFor="toggle-preserve-anim">
                      Conservar Movimiento Animado
                    </label>
                    <input
                      id="toggle-preserve-anim"
                      type="checkbox"
                      checked={preserveAnimation}
                      onChange={(e) => setPreserveAnimation(e.target.checked)}
                      className="h-4 w-4 rounded accent-[#10B981] cursor-pointer"
                    />
                  </div>

                  {preserveAnimation && (
                    <div className="space-y-2.5 pt-1">
                      {/* Animation Speed Selector */}
                      <div>
                        <div className="flex justify-between text-[11px] text-stone-300 mb-1">
                          <span className="flex items-center gap-1">
                            <Gauge className="h-3 w-3 text-[#34D399]" />
                            Velocidad de reproducción:
                          </span>
                          <span className="font-mono font-bold text-[#34D399]">{animationSpeed}x</span>
                        </div>
                        <div className="grid grid-cols-5 gap-1">
                          {[0.5, 0.75, 1.0, 1.5, 2.0].map((spd) => (
                            <button
                              key={spd}
                              type="button"
                              onClick={() => setAnimationSpeed(spd)}
                              className={`py-1 rounded-lg text-[10px] font-bold border transition-all ${
                                animationSpeed === spd
                                  ? 'bg-[#10B981] text-white border-[#34D399]'
                                  : 'bg-[#181C2B] text-stone-300 border-[#2B3248]'
                              }`}
                            >
                              {spd}x
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Reverse Animation Toggle */}
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-stone-300 flex items-center gap-1">
                          <FastForward className="h-3 w-3 text-[#34D399] rotate-180" />
                          Invertir animación (Reproducir al revés)
                        </span>
                        <input
                          type="checkbox"
                          checked={reverseAnimation}
                          onChange={(e) => setReverseAnimation(e.target.checked)}
                          className="h-4 w-4 rounded accent-[#10B981] cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Heavy File Acceleration Detection Banner */}
              {(fileInfo.size > 2 * 1024 * 1024 || (fileInfo.width && fileInfo.width > 2500)) && (
                <div className="p-3 rounded-2xl bg-gradient-to-br from-[#10241B] via-[#14202B] to-[#121824] border border-[#10B981]/50 shadow-md space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-[#34D399] animate-pulse" />
                    <span className="text-xs font-bold text-white">
                      Archivo de alta resolución detectado ({formatFileSize(fileInfo.size)}{fileInfo.width ? ` · ${fileInfo.width}×${fileInfo.height}px` : ''})
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-300 leading-relaxed">
                    Aceleración multihilo por GPU activa. La decodificación asíncrona procesa archivos de gran tamaño en segundos sin bloquear tu navegador.
                  </p>
                </div>
              )}

              {/* Conversion Speed & Acceleration Modes */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-200">
                  Modo de Aceleración y Velocidad
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setConverterSpeedMode('turbo')}
                    className={`p-2 rounded-xl text-left border transition-all ${
                      converterSpeedMode === 'turbo'
                        ? 'bg-gradient-to-r from-[#10B981] to-[#059669] text-white border-[#34D399] shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                        : 'bg-[#181C2B] border-[#262C3E] text-stone-300 hover:text-white'
                    }`}
                  >
                    <p className="text-xs font-bold flex items-center gap-1">
                      <Zap className="h-3 w-3 text-amber-300" />
                      Turbo (4K)
                    </p>
                    <p className="text-[9px] opacity-85 truncate">Ultrarrápido (~1s)</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConverterSpeedMode('standard')}
                    className={`p-2 rounded-xl text-left border transition-all ${
                      converterSpeedMode === 'standard'
                        ? 'bg-gradient-to-r from-[#10B981] to-[#059669] text-white border-[#34D399] shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                        : 'bg-[#181C2B] border-[#262C3E] text-stone-300 hover:text-white'
                    }`}
                  >
                    <p className="text-xs font-bold flex items-center gap-1">
                      <Gauge className="h-3 w-3 text-cyan-300" />
                      Web (2.5K)
                    </p>
                    <p className="text-[9px] opacity-85 truncate">Instantáneo</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConverterSpeedMode('original')}
                    className={`p-2 rounded-xl text-left border transition-all ${
                      converterSpeedMode === 'original'
                        ? 'bg-gradient-to-r from-[#10B981] to-[#059669] text-white border-[#34D399] shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                        : 'bg-[#181C2B] border-[#262C3E] text-stone-300 hover:text-white'
                    }`}
                  >
                    <p className="text-xs font-bold flex items-center gap-1">
                      <Maximize2 className="h-3 w-3 text-emerald-300" />
                      Original 100%
                    </p>
                    <p className="text-[9px] opacity-85 truncate">Píxel por píxel</p>
                  </button>
                </div>
              </div>

              {/* Quick Scaling for Huge Photos */}
              <div>
                <div className="flex justify-between text-xs text-stone-300 mb-1 font-medium">
                  <span>Escala de resolución:</span>
                  <span className="text-[#34D399] font-mono font-bold">
                    {Math.round(converterScale * 100)}% {converterScale < 1.0 ? '(Procesamiento 3x más rápido)' : ''}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { s: 1.0, label: '100% Original' },
                    { s: 0.75, label: '75% Alta' },
                    { s: 0.5, label: '50% Rápida' },
                    { s: 0.25, label: '25% Ligera' }
                  ].map((item) => (
                    <button
                      key={item.s}
                      type="button"
                      onClick={() => setConverterScale(item.s)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                        converterScale === item.s
                          ? 'bg-[#14261C] border-[#10B981] text-[#34D399]'
                          : 'bg-[#181C2B] border-[#262C3E] text-stone-300 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality Slider with fast presets */}
              <div>
                <div className="flex justify-between text-xs text-stone-300 mb-1 font-medium">
                  <span>Calidad de salida ({universalQuality}%)</span>
                  <span className="text-[#34D399] font-mono font-bold">
                    {universalQuality >= 90 ? 'Máxima nitidez (90%)' : universalQuality >= 75 ? 'Equilibrado recomendado (80%)' : 'Ahorro de espacio (65%)'}
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="5"
                  value={universalQuality}
                  onChange={(e) => setUniversalQuality(Number(e.target.value))}
                  className="w-full accent-[#10B981]"
                />
                <div className="flex justify-between text-[10px] text-stone-400 mt-1 font-mono">
                  <button type="button" onClick={() => setUniversalQuality(65)} className="hover:text-white">65% Ligero</button>
                  <button type="button" onClick={() => setUniversalQuality(80)} className="hover:text-[#34D399]">80% Equilibrado</button>
                  <button type="button" onClick={() => setUniversalQuality(92)} className="hover:text-white">92% Estudio</button>
                  <button type="button" onClick={() => setUniversalQuality(100)} className="hover:text-white">100% Máx</button>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              2B. ADVANCED OPTIMIZER & COMPRESSOR CONTROLS
             ========================================================= */}
          {tool.id === 'optimize-tools' && (
            <div className="space-y-4">
              {/* Live Savings Estimator Banner */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#10291D] via-[#14222E] to-[#121824] border border-[#10B981]/50 shadow-lg space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-[#34D399] animate-bounce" />
                    <span className="text-xs font-bold text-white tracking-wide">
                      Estimación de Reducción de Peso
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#10B981]/25 border border-[#34D399] text-xs font-black text-[#6EE7B7] shadow-[0_0_8px_rgba(16,185,129,0.4)]">
                    {compressPreset === 'aggressive' ? '-80% a -90%' : compressPreset === 'balanced' ? '-60% a -75%' : compressPreset === 'lossless' ? '-25% a -40%' : `-${Math.min(92, Math.max(15, Math.round((100 - compressQuality) * 0.55 + (1 - compressScale * compressScale) * 45)))}%`}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl bg-black/40 border border-[#2B3830]">
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-stone-400">Peso actual</p>
                    <p className="font-mono font-bold text-stone-200">{formatFileSize(fileInfo.size)}</p>
                  </div>
                  <div className="text-stone-500 font-bold">➔</div>
                  <div className="space-y-0.5 text-right">
                    <p className="text-[10px] text-stone-400">Peso estimado</p>
                    <p className="font-mono font-black text-[#34D399]">
                      ~{formatFileSize(
                        fileInfo.size * (1 - (compressPreset === 'aggressive' ? 0.85 : compressPreset === 'balanced' ? 0.68 : compressPreset === 'lossless' ? 0.32 : Math.min(0.92, Math.max(0.15, ((100 - compressQuality) * 0.55 + (1 - compressScale * compressScale) * 45) / 100))))
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-stone-300">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#34D399] shrink-0" />
                  <span>Garantía de optimización: Algoritmo multi-pasada asegura un archivo notablemente más ligero.</span>
                </div>
              </div>

              {/* Compression Presets */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-300">
                  Nivel de Compresión
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      id: 'balanced',
                      title: 'Equilibrado',
                      badge: 'Recomendado',
                      savings: 'Ahorra ~65%',
                      desc: 'Calidad visual indistinguible',
                      apply: () => {
                        setCompressPreset('balanced');
                        setCompressQuality(72);
                        setCompressScale(1.0);
                        setCompressColorPalette(256);
                      }
                    },
                    {
                      id: 'aggressive',
                      title: 'Máximo Ahorro',
                      badge: 'Ultra Ligero',
                      savings: 'Ahorra ~85%',
                      desc: 'Para WhatsApp, correo o web',
                      apply: () => {
                        setCompressPreset('aggressive');
                        setCompressQuality(48);
                        setCompressScale(0.80);
                        setCompressColorPalette(128);
                      }
                    },
                    {
                      id: 'lossless',
                      title: 'Ligero / Estudio',
                      badge: 'Alta Fidelidad',
                      savings: 'Ahorra ~30%',
                      desc: 'Máxima preservación de detalles',
                      apply: () => {
                        setCompressPreset('lossless');
                        setCompressQuality(88);
                        setCompressScale(1.0);
                        setCompressColorPalette(256);
                      }
                    },
                    {
                      id: 'custom',
                      title: 'Personalizado',
                      badge: 'Manual',
                      savings: 'A tu medida',
                      desc: 'Control exacto de sliders',
                      apply: () => {
                        setCompressPreset('custom');
                      }
                    }
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={preset.apply}
                      className={`p-2.5 rounded-xl text-left border transition-all relative ${
                        compressPreset === preset.id
                          ? 'bg-gradient-to-br from-[#122B1E] to-[#182635] border-[#10B981] shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                          : 'bg-[#181C2B] border-[#262C3E] hover:border-[#38425C]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-xs font-extrabold ${compressPreset === preset.id ? 'text-white' : 'text-stone-300'}`}>
                          {preset.title}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                          compressPreset === preset.id
                            ? 'bg-[#10B981] text-black'
                            : 'bg-black/40 text-[#34D399] border border-[#2B3830]'
                        }`}>
                          {preset.badge}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono font-bold text-[#34D399]">{preset.savings}</p>
                      <p className="text-[9px] text-stone-400 truncate mt-0.5">{preset.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Format Strategy */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-300">
                  Estrategia de Formato
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: 'auto', label: 'Auto Inteligente', sub: 'WebP (Mejor Ahorro)' },
                    { id: 'original', label: 'Mantener Original', sub: 'Mismo formato' },
                    { id: 'webp', label: 'Forzar WebP', sub: 'Ligero y moderno' },
                    { id: 'jpg', label: 'Convertir a JPG', sub: 'Universal' }
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setCompressFormatMode(fmt.id as any)}
                      className={`p-2 rounded-xl text-left border transition-all ${
                        compressFormatMode === fmt.id
                          ? 'bg-[#14261C] border-[#10B981] text-white shadow-xs'
                          : 'bg-[#181C2B] border-[#262C3E] text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      <p className="text-xs font-bold">{fmt.label}</p>
                      <p className="text-[9px] text-stone-400 truncate">{fmt.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution Scale Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-stone-300">Escala de Resolución (Ahorro Masivo de Píxeles)</span>
                  <span className="font-mono font-bold text-[#34D399]">{Math.round(compressScale * 100)}%</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { scale: 1.0, label: '100%', sub: 'Original' },
                    { scale: 0.85, label: '85%', sub: 'Recomendado' },
                    { scale: 0.70, label: '70%', sub: 'Web / Redes' },
                    { scale: 0.50, label: '50%', sub: 'Media Res' }
                  ].map((s) => (
                    <button
                      key={s.scale}
                      type="button"
                      onClick={() => setCompressScale(s.scale)}
                      className={`py-1.5 px-2 rounded-xl text-center border transition-all ${
                        compressScale === s.scale
                          ? 'bg-[#14261C] border-[#10B981] text-[#34D399] font-bold'
                          : 'bg-[#181C2B] border-[#262C3E] text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      <p className="text-xs font-bold">{s.label}</p>
                      <p className="text-[9px] text-stone-400 truncate">{s.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Special Animated GIF / WebP Optimization Card */}
              {isAnimatedFile && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#1a2618] to-[#121c2b] border border-[#10B981]/60 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Film className="h-4 w-4 text-[#34D399]" />
                    <span className="text-xs font-bold text-white">Optimización de Archivo Animado</span>
                  </div>
                  <p className="text-[11px] text-stone-300">
                    Los archivos GIF tradicionales son muy pesados debido a su tecnología antigua. Convertir a <strong>WebP Animado</strong> reduce el peso hasta un <strong>85%</strong> manteniendo movimiento infinito fluido.
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setCompressGifMode('webp')}
                      className={`p-2 rounded-xl text-left border transition-all ${
                        compressGifMode === 'webp'
                          ? 'bg-[#10B981] text-black font-extrabold border-white'
                          : 'bg-[#181C2B] border-[#262C3E] text-stone-300'
                      }`}
                    >
                      <p className="text-xs font-bold">✨ WebP Animado</p>
                      <p className="text-[9px] opacity-80">Ahorra ~85% de peso</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompressGifMode('gif')}
                      className={`p-2 rounded-xl text-left border transition-all ${
                        compressGifMode === 'gif'
                          ? 'bg-[#10B981] text-black font-extrabold border-white'
                          : 'bg-[#181C2B] border-[#262C3E] text-stone-300'
                      }`}
                    >
                      <p className="text-xs font-bold">GIF Comprimido</p>
                      <p className="text-[9px] opacity-80">Mantiene formato .gif</p>
                    </button>
                  </div>
                </div>
              )}

              {/* PNG Color Palette Quantization (Essential for PNG size reduction) */}
              {(fileInfo.type.includes('png') || compressFormatMode === 'png') && (
                <div className="p-3 rounded-2xl bg-[#181C2B] border border-[#262C3E] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-300">Optimizar Paleta PNG (DEFLATE)</span>
                    <button
                      type="button"
                      onClick={() => setCompressReduceColors(!compressReduceColors)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                        compressReduceColors
                          ? 'bg-[#10B981]/20 border-[#10B981] text-[#34D399]'
                          : 'bg-stone-800 border-stone-700 text-stone-400'
                      }`}
                    >
                      {compressReduceColors ? 'Activado' : 'Desactivado'}
                    </button>
                  </div>
                  {compressReduceColors && (
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      {[
                        { size: 256, label: '256 Colores', desc: 'Alta nitidez (~60%)' },
                        { size: 128, label: '128 Colores', desc: 'Equilibrado (~75%)' },
                        { size: 64, label: '64 Colores', desc: 'Ahorro extremo (~85%)' }
                      ].map((pal) => (
                        <button
                          key={pal.size}
                          type="button"
                          onClick={() => setCompressColorPalette(pal.size)}
                          className={`p-1.5 rounded-xl text-left border transition-all ${
                            compressColorPalette === pal.size
                              ? 'bg-[#14261C] border-[#10B981] text-[#34D399]'
                              : 'bg-[#131622] border-[#232838] text-stone-400'
                          }`}
                        >
                          <p className="text-[11px] font-bold">{pal.label}</p>
                          <p className="text-[9px] opacity-75">{pal.desc}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Fine Tuning Sliders */}
              <div className="p-3.5 rounded-2xl bg-[#181C2B] border border-[#262C3E] space-y-3">
                <div className="flex justify-between text-xs text-stone-300 font-medium">
                  <span>Calidad de Compresión:</span>
                  <span className="font-mono font-bold text-[#34D399]">{compressQuality}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="95"
                  value={compressQuality}
                  onChange={(e) => {
                    setCompressQuality(Number(e.target.value));
                    setCompressPreset('custom');
                  }}
                  className="w-full accent-[#10B981]"
                />

                <div className="flex justify-between text-xs text-stone-300 font-medium pt-1">
                  <span>Escala de Resolución:</span>
                  <span className="font-mono font-bold text-[#34D399]">{Math.round(compressScale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="5"
                  value={Math.round(compressScale * 100)}
                  onChange={(e) => {
                    setCompressScale(Number(e.target.value) / 100);
                    setCompressPreset('custom');
                  }}
                  className="w-full accent-[#10B981]"
                />
              </div>
            </div>
          )}

          {/* =========================================================
              3. ENHANCED FILTERS & FX CONTROLS
             ========================================================= */}
          {tool.id === 'effects-tools' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-stone-300">
                  Presets de Estilo Instantáneo
                </label>
                <button
                  type="button"
                  onClick={handleResetEffects}
                  className="text-[10px] text-[#34D399] hover:underline font-bold"
                >
                  Restablecer
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'none', label: 'Original', icon: 'Normal' },
                  { id: 'cyberpunk', label: 'Cyberpunk', icon: 'Neon Pink/Cyan' },
                  { id: 'vintage', label: 'Vintage 70s', icon: 'Cálido Retro' },
                  { id: 'noir', label: 'Noir Cine', icon: 'B/N Dramático' },
                  { id: 'sunset', label: 'Sunset', icon: 'Dorado' },
                  { id: 'emerald', label: 'Matrix', icon: 'Verde Glow' },
                  { id: 'vaporwave', label: 'Vaporwave', icon: 'Púrpura 80s' },
                  { id: 'glitch', label: 'Glitch RGB', icon: 'Aberración' },
                  { id: 'pixelate', label: 'Pixel Art', icon: '8-Bit Retro' }
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setActivePreset(preset.id as any)}
                    className={`p-2 rounded-xl text-left border transition-all ${
                      activePreset === preset.id
                        ? 'bg-gradient-to-r from-[#10B981] to-[#059669] text-white border-[#34D399] shadow-[0_0_8px_rgba(16,185,129,0.5)] font-bold'
                        : 'bg-[#181C2B] border-[#262C3E] text-stone-300 hover:text-white'
                    }`}
                  >
                    <p className="text-xs font-bold">{preset.label}</p>
                    <p className="text-[9px] text-stone-300/80 truncate">{preset.icon}</p>
                  </button>
                ))}
              </div>

              {activePreset === 'pixelate' && (
                <div>
                  <div className="flex justify-between text-xs text-stone-300 mb-1">
                    <span>Tamaño del Pixel ({pixelSize}px)</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="32"
                    value={pixelSize}
                    onChange={(e) => setPixelSize(Number(e.target.value))}
                    className="w-full accent-[#10B981]"
                  />
                </div>
              )}

              {/* Fine Sliders with rich adjustments */}
              <div className="space-y-2 pt-1 border-t border-[#222736]">
                <div className="flex justify-between text-xs text-stone-300">
                  <span>Brillo ({brightness}%)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full accent-[#10B981]"
                />

                <div className="flex justify-between text-xs text-stone-300">
                  <span>Contraste ({contrast}%)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="w-full accent-[#10B981]"
                />

                <div className="flex justify-between text-xs text-stone-300">
                  <span>Saturación ({saturation}%)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={saturation}
                  onChange={(e) => setSaturation(Number(e.target.value))}
                  className="w-full accent-[#10B981]"
                />

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="flex justify-between text-[11px] text-stone-300 mb-0.5">
                      <span>Sepia ({sepia}%)</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={sepia}
                      onChange={(e) => setSepia(Number(e.target.value))}
                      className="w-full accent-[#10B981]"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] text-stone-300 mb-0.5">
                      <span>Blanco/Negro ({grayscale}%)</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={grayscale}
                      onChange={(e) => setGrayscale(Number(e.target.value))}
                      className="w-full accent-[#10B981]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-[11px] text-stone-300 mb-0.5">
                      <span>Invertir ({invert}%)</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={invert}
                      onChange={(e) => setInvert(Number(e.target.value))}
                      className="w-full accent-[#10B981]"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] text-stone-300 mb-0.5">
                      <span>Desenfoque ({blur}px)</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      value={blur}
                      onChange={(e) => setBlur(Number(e.target.value))}
                      className="w-full accent-[#10B981]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              4. COLOR PALETTE EXTRACTOR CONTROLS
             ========================================================= */}
          {tool.id === 'palette-tools' && (
            <div className="space-y-3.5">
              <div className="p-3 rounded-2xl bg-[#14261C] border border-[#10B981]/30 flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Palette className="h-3.5 w-3.5 text-[#34D399]" />
                    <span>Paleta de Colores Extraída</span>
                  </p>
                  <p className="text-[11px] text-stone-300 leading-relaxed">
                    Toca cualquier color para copiar su código HEX.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenEyeDropper}
                  className="px-3 py-1.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold shrink-0 shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Gotero</span>
                </button>
              </div>

              {extractedPalette.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {extractedPalette.map((col, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleCopyHex(col.hex)}
                      className="group flex items-center gap-2 p-2 rounded-xl bg-[#181C2B] border border-[#2B3248] hover:border-[#10B981] transition-all text-left"
                    >
                      <div
                        className="h-8 w-8 rounded-lg shadow-inner border border-white/10 shrink-0"
                        style={{ backgroundColor: col.hex }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-mono font-bold text-white group-hover:text-[#34D399] truncate">
                          {col.hex}
                        </p>
                        <p className="text-[10px] text-stone-400 font-mono">
                          {col.percentage}%
                        </p>
                      </div>
                      {copiedHex === col.hex ? (
                        <Check className="h-3.5 w-3.5 text-[#10B981] shrink-0" />
                      ) : (
                        <Copy className="h-3 w-3 text-stone-500 group-hover:text-stone-300 shrink-0 opacity-0 group-hover:opacity-100" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              5. WATERMARK & CENSORSHIP CONTROLS
             ========================================================= */}
          {tool.id === 'watermark-tools' && (
            <div className="space-y-3.5">
              {/* Watermark Mode: Text vs Image Logo */}
              <div className="flex rounded-xl bg-[#181C2B] p-1 border border-[#262C3E]">
                <button
                  type="button"
                  onClick={() => setWatermarkMode('text')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    watermarkMode === 'text'
                      ? 'bg-[#10B981] text-white shadow-sm'
                      : 'text-stone-300 hover:text-white'
                  }`}
                >
                  Texto / Firma
                </button>
                <button
                  type="button"
                  onClick={() => setWatermarkMode('image')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    watermarkMode === 'image'
                      ? 'bg-[#10B981] text-white shadow-sm'
                      : 'text-stone-300 hover:text-white'
                  }`}
                >
                  Logo / Imagen PNG
                </button>
              </div>

              {watermarkMode === 'text' ? (
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Texto de la Marca de Agua
                  </label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    className="w-full rounded-2xl bg-[#181C2B] border border-[#2B3248] px-3 py-2 text-xs text-white placeholder:text-stone-500 focus:border-[#10B981] focus:outline-none"
                    placeholder="Tu marca o firma..."
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Selecciona tu Logo (PNG / JPG)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setWatermarkImageFile(e.target.files[0]);
                      }
                    }}
                    className="w-full text-xs text-stone-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#10B981] file:text-white hover:file:bg-[#059669]"
                  />
                  {watermarkImageFile && (
                    <div className="flex justify-between text-xs text-stone-300 pt-1">
                      <span>Tamaño del logo ({Math.round(watermarkImageScale * 100)}%)</span>
                      <input
                        type="range"
                        min="10"
                        max="60"
                        value={Math.round(watermarkImageScale * 100)}
                        onChange={(e) => setWatermarkImageScale(Number(e.target.value) / 100)}
                        className="w-32 accent-[#10B981]"
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <div className="flex justify-between text-xs text-stone-300 mb-1">
                  <span>Opacidad de la marca ({Math.round(watermarkOpacity * 100)}%)</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={Math.round(watermarkOpacity * 100)}
                  onChange={(e) => setWatermarkOpacity(Number(e.target.value) / 100)}
                  className="w-full accent-[#10B981]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Posición de la marca
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'bottom-right', label: 'Inf. Derecha' },
                    { id: 'bottom-left', label: 'Inf. Izquierda' },
                    { id: 'top-right', label: 'Sup. Derecha' },
                    { id: 'top-left', label: 'Sup. Izquierda' },
                    { id: 'center', label: 'Centro' },
                    { id: 'tiled', label: 'Mosaico' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setWatermarkPos(p.id as any)}
                      className={`p-1.5 rounded-xl text-xs border transition-all ${
                        watermarkPos === p.id
                          ? 'bg-[#14261C] border-[#10B981] text-[#34D399] font-bold'
                          : 'bg-[#181C2B] border-[#262C3E] text-stone-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Censura de Información (Área central)
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'none', label: 'Sin Censura' },
                    { id: 'pixelate', label: 'Pixelado' },
                    { id: 'black', label: 'Barra Negra' }
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCensorType(c.id as any)}
                      className={`p-1.5 rounded-xl text-xs border transition-all ${
                        censorType === c.id
                          ? 'bg-[#14261C] border-[#10B981] text-[#34D399] font-bold'
                          : 'bg-[#181C2B] border-[#262C3E] text-stone-300'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              6. GIF MAKER CONTROLS
             ========================================================= */}
          {tool.id === 'gif-maker' && (
            <div className="space-y-3">
              {/* Output format selector for animated output */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                  Formato de Animación de Salida
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGifFormatChoice('webp')}
                    className={`p-2.5 rounded-xl text-left border transition-all ${
                      gifFormatChoice === 'webp'
                        ? 'bg-gradient-to-r from-[#10B981] to-[#059669] text-white border-[#34D399] shadow-[0_0_8px_rgba(16,185,129,0.5)] font-bold'
                        : 'bg-[#181C2B] border-[#262C3E] text-stone-300 hover:text-white'
                    }`}
                  >
                    <p className="text-xs font-black">WEBP ANIMADO</p>
                    <p className="text-[10px] text-stone-300/80">Ultra ligero · 24-bit color</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGifFormatChoice('gif')}
                    className={`p-2.5 rounded-xl text-left border transition-all ${
                      gifFormatChoice === 'gif'
                        ? 'bg-gradient-to-r from-[#10B981] to-[#059669] text-white border-[#34D399] shadow-[0_0_8px_rgba(16,185,129,0.5)] font-bold'
                        : 'bg-[#181C2B] border-[#262C3E] text-stone-300 hover:text-white'
                    }`}
                  >
                    <p className="text-xs font-black">GIF CLÁSICO</p>
                    <p className="text-[10px] text-stone-300/80">Universal · Máxima compatibilidad</p>
                  </button>
                </div>
              </div>

              {isVideo ? (
                <>
                  <div className="p-3 rounded-2xl bg-[#14261C] border border-[#10B981]/30 space-y-1">
                    <p className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-[#34D399]" />
                      <span>Conversión de Vídeo a {gifFormatChoice === 'webp' ? 'WebP' : 'GIF'} Animado</span>
                    </p>
                    <p className="text-[11px] text-stone-300 leading-relaxed">
                      Captura fotogramas y compila la animación fluida en bucle continuo.
                    </p>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-stone-300 mb-1">
                      <span>Fluidez de animación (FPS):</span>
                      <span className="font-mono text-[#34D399] font-bold">{gifFps} FPS</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[10, 15, 24, 30, 60].map((fps) => (
                        <button
                          key={fps}
                          type="button"
                          onClick={() => setGifFps(fps)}
                          className={`py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            gifFps === fps
                              ? 'bg-gradient-to-r from-[#10B981] to-[#059669] text-white border-[#34D399] shadow-[0_0_8px_rgba(16,185,129,0.5)] font-bold'
                              : 'bg-[#181C2B] text-stone-300 border-[#262C3E]'
                          }`}
                        >
                          {fps} FPS
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-stone-300 mb-1">
                      <span>Cantidad de fotogramas a capturar:</span>
                      <span className="font-mono text-[#34D399] font-bold">{gifFrames} frames</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="60"
                      step="2"
                      value={gifFrames}
                      onChange={(e) => setGifFrames(Number(e.target.value))}
                      className="w-full accent-[#10B981]"
                    />
                    <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                      <span>10 fotogramas (ligero)</span>
                      <span>30 (equilibrado)</span>
                      <span>60 (máxima fluidez)</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-3 rounded-2xl bg-[#14261C] border border-[#10B981]/30 space-y-2">
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Film className="h-3.5 w-3.5 text-[#34D399]" />
                    <span>Ajustes de animación</span>
                  </p>
                  <p className="text-[11px] text-stone-300">
                    Convierte esta imagen animada a {gifFormatChoice === 'webp' ? 'WebP Animado' : 'GIF Animado'} preservando cada fotograma.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              7. TRANSFORM (RESIZE, ROTATE, CROP & SOCIAL PRESETS)
             ========================================================= */}
          {tool.id === 'transform-tools' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5 flex items-center gap-1.5">
                  <Crop className="h-3.5 w-3.5 text-[#10B981]" />
                  <span>Recortar proporción (Crop)</span>
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { id: 'free', label: 'Libre' },
                    { id: '1:1', label: '1:1' },
                    { id: '16:9', label: '16:9' },
                    { id: '9:16', label: '9:16' },
                    { id: '4:3', label: '4:3' }
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setCropRatio(r.id as any)}
                      className={`py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        cropRatio === r.id
                          ? 'bg-gradient-to-r from-[#10B981] to-[#059669] text-white border-[#34D399] shadow-[0_0_8px_rgba(16,185,129,0.5)] font-bold'
                          : 'bg-[#181C2B] text-stone-300 border-[#262C3E] hover:text-white'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Social Media Dimension Presets */}
              <div>
                <label className="block text-[11px] font-semibold text-stone-400 mb-1">
                  Formatos de Redes Sociales
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { label: 'IG Post (1:1)', w: 1080, h: 1080 },
                    { label: 'TikTok/Story (9:16)', w: 1080, h: 1920 },
                    { label: 'YouTube (16:9)', w: 1920, h: 1080 },
                    { label: 'Twitter / X', w: 1200, h: 675 }
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handleSetExactDimensions(p.w, p.h)}
                      className="py-1 px-2 rounded-xl bg-[#181C2B] border border-[#2B3248] text-[10px] text-stone-300 hover:text-white hover:border-[#10B981] transition-all text-center"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rotation and Flip Controls */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setRotationAngle((prev) => (prev + 90) % 360)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#181C2B] border border-[#2B3248] text-xs font-semibold text-stone-200 hover:text-white hover:border-[#10B981]"
                >
                  <RotateCw className="h-3.5 w-3.5 text-[#10B981]" />
                  <span>Rotar {rotationAngle}°</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFlipH(!flipH)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    flipH
                      ? 'bg-[#14261C] border-[#10B981] text-[#34D399]'
                      : 'bg-[#181C2B] border-[#2B3248] text-stone-200 hover:text-white'
                  }`}
                >
                  <FlipHorizontal className="h-3.5 w-3.5" />
                  <span>Voltear H</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFlipV(!flipV)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    flipV
                      ? 'bg-[#14261C] border-[#10B981] text-[#34D399]'
                      : 'bg-[#181C2B] border-[#2B3248] text-stone-200 hover:text-white'
                  }`}
                >
                  <FlipHorizontal className="h-3.5 w-3.5 rotate-90" />
                  <span>Voltear V</span>
                </button>
              </div>

              {/* Resize Dimension Fields with Explicit Lock / Free Mode Toggle */}
              <div className="p-3 rounded-2xl bg-[#111420] border border-[#202738] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sliders className="h-3.5 w-3.5 text-[#10B981]" />
                    <span className="text-xs font-bold text-white">Dimensiones y Redimensión (px)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetToOriginalDimensions}
                    className="text-[10px] font-mono text-stone-400 hover:text-[#34D399] flex items-center gap-1 transition-colors cursor-pointer"
                    title="Restablecer dimensiones al tamaño original del archivo"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Original ({fileInfo.width || 800}×{fileInfo.height || 600})</span>
                  </button>
                </div>

                {/* Aspect Ratio Mode Switcher (2 Segmented Buttons) */}
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#0B0D14] border border-[#1E2434]">
                  <button
                    type="button"
                    onClick={() => {
                      if (lockRatio) {
                        setLockRatio(false);
                      }
                    }}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      !lockRatio
                        ? 'bg-[#1D2436] text-white border border-[#3B4764] shadow-sm font-bold'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <Unlock className={`h-3.5 w-3.5 ${!lockRatio ? 'text-amber-400' : 'text-stone-500'}`} />
                    <span>Medidas Libres (Independiente)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!lockRatio) {
                        toggleLockRatio();
                      }
                    }}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      lockRatio
                        ? 'bg-[#14261C] text-[#34D399] border border-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.3)] font-bold'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <Lock className={`h-3.5 w-3.5 ${lockRatio ? 'text-[#10B981]' : 'text-stone-500'}`} />
                    <span>Fijar Proporción (Bloqueado)</span>
                  </button>
                </div>

                {/* Helper text explaining the current mode */}
                <div className="text-[11px] px-2.5 py-1.5 rounded-xl bg-[#161B29] border border-[#242C3E] text-stone-300 flex items-center justify-between">
                  <span>
                    {lockRatio ? (
                      <span className="text-[#34D399] flex items-center gap-1 font-medium">
                        <Lock className="h-3 w-3 inline shrink-0" />
                        Proporción fijada (1:{(lockedRatioValue > 0 ? (1 / lockedRatioValue).toFixed(2) : '1.00')}): al modificar un lado, el otro se calcula automáticamente.
                      </span>
                    ) : (
                      <span className="text-amber-300/90 flex items-center gap-1 font-medium">
                        <Unlock className="h-3 w-3 inline shrink-0" />
                        Medidas libres: puedes cambiar el Ancho y el Alto de forma individual sin que el otro cambie.
                      </span>
                    )}
                  </span>
                </div>

                {/* Width, Central Lock Link, and Height Input Grid */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-stone-300">
                        Ancho
                      </label>
                      <span className="text-[10px] text-stone-500 font-mono">px</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        value={width || ''}
                        onChange={(e) => handleWidthChange(parseInt(e.target.value, 10) || 0)}
                        className="w-full rounded-xl bg-[#181C2B] border border-[#2B3248] px-3 py-2 text-xs text-white font-mono focus:border-[#10B981] focus:outline-none"
                        placeholder="Ancho"
                      />
                    </div>
                  </div>

                  {/* Central Interactive Lock / Chain Button */}
                  <div className="flex flex-col items-center justify-center pt-4">
                    <button
                      type="button"
                      onClick={toggleLockRatio}
                      title={lockRatio ? 'Proporción bloqueada (clic para desbloquear y editar libremente)' : 'Medidas independientes (clic para fijar proporción)'}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        lockRatio
                          ? 'bg-[#14261C] border-[#10B981] text-[#34D399] shadow-[0_0_10px_rgba(16,185,129,0.35)] hover:scale-105'
                          : 'bg-[#1C2234] border-[#2C364E] text-stone-400 hover:text-white hover:border-stone-400 hover:scale-105'
                      }`}
                    >
                      {lockRatio ? (
                        <Link2 className="h-4 w-4 text-[#10B981]" />
                      ) : (
                        <Unlink className="h-4 w-4 text-stone-400" />
                      )}
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-stone-300">
                        Alto
                      </label>
                      <span className="text-[10px] text-stone-500 font-mono">px</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        value={height || ''}
                        onChange={(e) => handleHeightChange(parseInt(e.target.value, 10) || 0)}
                        className="w-full rounded-xl bg-[#181C2B] border border-[#2B3248] px-3 py-2 text-xs text-white font-mono focus:border-[#10B981] focus:outline-none"
                        placeholder="Alto"
                      />
                    </div>
                  </div>
                </div>

                {/* Dimension Action Bar: Swap + Percentage Scales */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#1C2232]">
                  <button
                    type="button"
                    onClick={handleSwapDimensions}
                    className="text-[10px] font-mono text-[#34D399] hover:underline flex items-center gap-1 bg-[#161B29] px-2.5 py-1 rounded-lg border border-[#242C3E] cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Invertir Ancho ↔ Alto</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-stone-500 font-mono mr-0.5">Escala:</span>
                    {[25, 50, 75, 100, 150, 200].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleApplyPreset(p)}
                        className="px-1.5 py-0.5 rounded-lg bg-[#181C2B] border border-[#2B3248] text-[10px] font-mono text-stone-300 hover:text-white hover:border-[#10B981]/50 transition-colors cursor-pointer"
                      >
                        {p}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Compression Quality */}
              <div className="pt-1 border-t border-[#222736]">
                <div className="flex justify-between text-xs text-stone-300 mb-1">
                  <span>Calidad de compresión ({transformQuality}%)</span>
                  <span className="font-mono text-[#34D399] font-bold">
                    {transformQuality > 85 ? 'Máxima nitidez' : 'Optimizado'}
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={transformQuality}
                  onChange={(e) => setTransformQuality(Number(e.target.value))}
                  className="w-full accent-[#10B981]"
                />
              </div>
            </div>
          )}

          {/* =========================================================
              ELIMINAR MITAD DE IMAGEN (CUT HALF TOOLS)
             ========================================================= */}
          {tool.id === 'cut-half-tools' && (
            <div className="space-y-3.5">
              {/* Informative Header Banner */}
              <div className="p-3 rounded-2xl bg-gradient-to-br from-[#0C2229] via-[#101826] to-[#0D1520] border border-cyan-500/40 space-y-1">
                <div className="flex items-center gap-2">
                  <Split className="h-4 w-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white">Eliminar la Mitad de una Imagen</span>
                </div>
                <p className="text-[11px] text-stone-300 leading-relaxed">
                  Elimina el 50% de la imagen (o proporción personalizada). Puedes recortar el lienzo directamente o borrar la mitad con transparencia o color.
                </p>
              </div>

              {/* 1. Which Half to Remove */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-stone-200">
                    ¿Qué mitad deseas eliminar?
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (halfRemoveTarget === 'left') setHalfRemoveTarget('right');
                      else if (halfRemoveTarget === 'right') setHalfRemoveTarget('left');
                      else if (halfRemoveTarget === 'top') setHalfRemoveTarget('bottom');
                      else if (halfRemoveTarget === 'bottom') setHalfRemoveTarget('top');
                    }}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono cursor-pointer"
                  >
                    <RotateCw className="h-3 w-3" />
                    <span>Invertir selección</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setHalfRemoveTarget('left')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      halfRemoveTarget === 'left'
                        ? 'bg-gradient-to-r from-cyan-700/80 to-teal-800/80 text-white border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                        : 'bg-[#181C2B] border-[#262C3E] text-stone-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <ArrowLeft className="h-3.5 w-3.5 text-red-400" />
                      <span>Mitad Izquierda</span>
                    </div>
                    <p className="text-[10px] opacity-80 mt-0.5">Conserva el lado derecho</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHalfRemoveTarget('right')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      halfRemoveTarget === 'right'
                        ? 'bg-gradient-to-r from-cyan-700/80 to-teal-800/80 text-white border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                        : 'bg-[#181C2B] border-[#262C3E] text-stone-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <ArrowRight className="h-3.5 w-3.5 text-red-400" />
                      <span>Mitad Derecha</span>
                    </div>
                    <p className="text-[10px] opacity-80 mt-0.5">Conserva el lado izquierdo</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHalfRemoveTarget('top')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      halfRemoveTarget === 'top'
                        ? 'bg-gradient-to-r from-cyan-700/80 to-teal-800/80 text-white border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                        : 'bg-[#181C2B] border-[#262C3E] text-stone-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <ArrowUp className="h-3.5 w-3.5 text-red-400" />
                      <span>Mitad Superior</span>
                    </div>
                    <p className="text-[10px] opacity-80 mt-0.5">Conserva la parte inferior</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHalfRemoveTarget('bottom')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      halfRemoveTarget === 'bottom'
                        ? 'bg-gradient-to-r from-cyan-700/80 to-teal-800/80 text-white border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                        : 'bg-[#181C2B] border-[#262C3E] text-stone-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <ArrowDown className="h-3.5 w-3.5 text-red-400" />
                      <span>Mitad Inferior</span>
                    </div>
                    <p className="text-[10px] opacity-80 mt-0.5">Conserva la parte superior</p>
                  </button>
                </div>
              </div>

              {/* 2. Action Mode: Crop vs Erase/Mask */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-200 block">
                  Método de Eliminación
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setHalfAction('crop')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      halfAction === 'crop'
                        ? 'bg-[#122822] text-[#34D399] border-[#10B981] shadow-sm font-bold'
                        : 'bg-[#181C2B] border-[#262C3E] text-stone-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <Crop className="h-3.5 w-3.5 text-[#34D399]" />
                      <span>Recortar Lienzo (50%)</span>
                    </div>
                    <p className="text-[10px] text-stone-400 mt-1">
                      El tamaño de la imagen se reduce a la mitad física.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHalfAction('erase')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      halfAction === 'erase'
                        ? 'bg-[#122822] text-[#34D399] border-[#10B981] shadow-sm font-bold'
                        : 'bg-[#181C2B] border-[#262C3E] text-stone-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <Eraser className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Borrar / Vaciar</span>
                    </div>
                    <p className="text-[10px] text-stone-400 mt-1">
                      Conserva dimensiones totales y vacía la mitad.
                    </p>
                  </button>
                </div>
              </div>

              {/* 3. Background Color (if action === erase) */}
              {halfAction === 'erase' && (
                <div className="p-3 rounded-2xl bg-[#141A29] border border-[#262C3E] space-y-2">
                  <label className="text-xs font-semibold text-stone-200 block">
                    Relleno de la mitad borrada:
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'transparent', label: 'Transparente' },
                      { id: '#FFFFFF', label: 'Blanco' },
                      { id: '#000000', label: 'Negro' },
                      { id: '#10B981', label: 'Verde' }
                    ].map((bg) => (
                      <button
                        key={bg.id}
                        type="button"
                        onClick={() => setHalfBgColor(bg.id)}
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          halfBgColor === bg.id
                            ? 'bg-[#102B21] border-[#10B981] text-[#34D399]'
                            : 'bg-[#181C2B] border-[#262C3E] text-stone-300 hover:text-white'
                        }`}
                      >
                        {bg.label}
                      </button>
                    ))}
                  </div>
                  {halfBgColor !== 'transparent' && (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="color"
                        value={halfBgColor}
                        onChange={(e) => setHalfBgColor(e.target.value)}
                        className="h-7 w-8 rounded cursor-pointer border border-[#2B3248] bg-transparent"
                      />
                      <input
                        type="text"
                        value={halfBgColor}
                        onChange={(e) => setHalfBgColor(e.target.value)}
                        className="flex-1 rounded-xl bg-[#181C2B] border border-[#2B3248] px-2 py-1 text-xs text-white font-mono"
                        placeholder="#FFFFFF"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 4. Divider / Cut position */}
              <div>
                <div className="flex justify-between text-xs text-stone-300 mb-1">
                  <span>Punto de corte:</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {halfDividerPercent === 50 ? '50% (Mitad exacta)' : `${halfDividerPercent}%`}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 mb-2">
                  {[
                    { p: 25, label: '25%' },
                    { p: 33, label: '33%' },
                    { p: 50, label: '50% Mitad' },
                    { p: 66, label: '66%' },
                    { p: 75, label: '75%' }
                  ].map((preset) => (
                    <button
                      key={preset.p}
                      type="button"
                      onClick={() => setHalfDividerPercent(preset.p)}
                      className={`py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        halfDividerPercent === preset.p
                          ? 'bg-gradient-to-r from-cyan-600 to-teal-700 text-white border-cyan-400 shadow-sm font-bold'
                          : 'bg-[#181C2B] text-stone-300 border-[#262C3E] hover:text-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min="15"
                  max="85"
                  step="1"
                  value={halfDividerPercent}
                  onChange={(e) => setHalfDividerPercent(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>

              {/* 5. Output Format & Quality */}
              <div className="space-y-2 pt-1 border-t border-[#222736]">
                <div className="flex justify-between text-xs text-stone-300">
                  <span>Formato de salida:</span>
                  <span className="text-cyan-400 font-mono font-bold uppercase">{halfOutputFormat}</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'auto', label: 'Auto' },
                    { id: 'png', label: 'PNG (Alfa)' },
                    { id: 'webp', label: 'WebP' },
                    { id: 'jpg', label: 'JPG' }
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setHalfOutputFormat(fmt.id as any)}
                      className={`py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        halfOutputFormat === fmt.id
                          ? 'bg-gradient-to-r from-cyan-600 to-teal-700 text-white border-cyan-400 shadow-sm font-bold'
                          : 'bg-[#181C2B] text-stone-300 border-[#262C3E] hover:text-white'
                      }`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>

                {/* Quality */}
                <div>
                  <div className="flex justify-between text-xs text-stone-300 mb-1">
                    <span>Calidad de salida ({halfQuality}%)</span>
                    <span className="font-mono text-cyan-400 font-bold">
                      {halfQuality >= 90 ? 'Máxima' : 'Equilibrada'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="100"
                    step="5"
                    value={halfQuality}
                    onChange={(e) => setHalfQuality(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              MEJORAR CALIDAD DE ARCHIVOS (ENHANCE QUALITY TOOLS)
             ========================================================= */}
          {tool.id === 'enhance-tools' && (
            <div className="space-y-3.5">
              {/* Informative Header Banner */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#271806] via-[#1A130C] to-[#121014] border border-amber-500/40 space-y-1.5 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Mejorador de Calidad & Supernitidez HD</span>
                    <span className="text-[10px] text-amber-300/90 font-mono">Compatible con imágenes fijas y animaciones GIF / WebP</span>
                  </div>
                </div>
                <p className="text-[11px] text-stone-300 leading-relaxed">
                  Aumenta la nitidez, elimina el granulado y artefactos de compresión, y realza texturas finas y colores vibrantes sin perder naturalidad.
                </p>
              </div>

              {/* 1. Mode Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-200 block">
                  Perfil de Mejora
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      id: 'smart-hd' as const,
                      title: 'Smart HD IA ✨',
                      desc: 'Equilibrio perfecto: nitidez adaptativa, textura y reducción de ruido.',
                      badge: 'Recomendado'
                    },
                    {
                      id: 'ultra-sharp' as const,
                      title: 'Supernitidez 🎯',
                      desc: 'Máximo enfoque para fotos desenfocadas, texto y detalles difusos.',
                      badge: 'Alta nitidez'
                    },
                    {
                      id: 'denoise-clean' as const,
                      title: 'Limpiar Ruido 🧼',
                      desc: 'Elimina grano sucio y bloques de compresión JPG.',
                      badge: 'Antirruido'
                    },
                    {
                      id: 'vibrant-color' as const,
                      title: 'Color & Rango 🌈',
                      desc: 'Realza la viveza cromática, microcontraste y tonos profundos.',
                      badge: 'Color vivo'
                    },
                    {
                      id: 'upscale-2x' as const,
                      title: 'Superresolución 2x 🔍',
                      desc: 'Duplica las dimensiones con reconstrucción nítida de bordes.',
                      badge: '2x HD'
                    },
                    {
                      id: 'upscale-4x' as const,
                      title: 'Superresolución 4x 💎',
                      desc: 'Cuadruplica la resolución para gran formato o máxima definición.',
                      badge: '4x Ultra'
                    }
                  ].map((modeItem) => {
                    const isSelected = enhanceMode === modeItem.id;
                    return (
                      <button
                        key={modeItem.id}
                        type="button"
                        onClick={() => {
                          setEnhanceMode(modeItem.id);
                          if (modeItem.id === 'upscale-4x') setEnhanceScale(4);
                          else if (modeItem.id === 'upscale-2x') setEnhanceScale(2);
                          else if (enhanceScale !== 1 && enhanceMode.startsWith('upscale')) setEnhanceScale(1);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                          isSelected
                            ? 'bg-gradient-to-r from-amber-950/80 to-orange-950/80 text-white border-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.25)] font-medium'
                            : 'bg-[#181C2B] border-[#262C3E] text-stone-300 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className={`text-xs font-bold ${isSelected ? 'text-amber-300' : 'text-stone-200'}`}>
                            {modeItem.title}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono ${
                            isSelected ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40' : 'bg-stone-800 text-stone-400'
                          }`}>
                            {modeItem.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-stone-400 leading-snug">
                          {modeItem.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Scale Selector */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-stone-200">
                  <span className="font-semibold">Escala de Resolución:</span>
                  <span className="font-mono text-amber-400 font-bold">
                    {enhanceScale === 1 ? '1x (Dimensiones nativas)' : enhanceScale === 2 ? '2x (Doble resolución HD)' : '4x (Ultra HD 4K)'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { s: 1 as const, label: '1x Nativo', sub: 'Mismo tamaño' },
                    { s: 2 as const, label: '2x HD', sub: 'Doble tamaño' },
                    { s: 4 as const, label: '4x Ultra HD', sub: 'Cuádruple 4K' }
                  ].map((item) => (
                    <button
                      key={item.s}
                      type="button"
                      onClick={() => setEnhanceScale(item.s)}
                      className={`py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        enhanceScale === item.s
                          ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white border-amber-400 shadow-md font-bold'
                          : 'bg-[#181C2B] text-stone-300 border-[#262C3E] hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold">{item.label}</div>
                      <div className="text-[9px] opacity-80">{item.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Intensity Slider */}
              <div className="space-y-1.5 p-3 rounded-xl bg-[#141824] border border-[#262C3E]">
                <div className="flex justify-between text-xs text-stone-200">
                  <span className="font-semibold">Intensidad General:</span>
                  <span className="font-mono text-amber-400 font-bold">{enhanceIntensity}%</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {[
                    { val: 25, label: '25% Sutil' },
                    { val: 50, label: '50% Equilibrado' },
                    { val: 75, label: '75% Fuerte' },
                    { val: 100, label: '100% Máximo' }
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setEnhanceIntensity(preset.val)}
                      className={`py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                        enhanceIntensity === preset.val
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 font-bold'
                          : 'bg-[#181C2B] text-stone-400 border-[#262C3E] hover:text-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="1"
                  value={enhanceIntensity}
                  onChange={(e) => setEnhanceIntensity(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* 4. Fine Tuning Sliders */}
              <div className="space-y-2 p-3 rounded-xl bg-[#141824] border border-[#262C3E]">
                <div className="text-xs font-bold text-stone-200 flex items-center justify-between pb-1 border-b border-[#222736]">
                  <span>Ajustes Personalizados</span>
                  <span className="text-[10px] text-amber-400/90 font-mono">Calibración precisa</span>
                </div>

                {/* Sharpen */}
                <div>
                  <div className="flex justify-between text-[11px] text-stone-300 mb-0.5">
                    <span>Enfoque & Nitidez (Unsharp Mask)</span>
                    <span className="font-mono text-amber-400 font-bold">{enhanceSharpen}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={enhanceSharpen}
                    onChange={(e) => setEnhanceSharpen(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Denoise */}
                <div>
                  <div className="flex justify-between text-[11px] text-stone-300 mb-0.5">
                    <span>Reducción de Ruido & Granulado</span>
                    <span className="font-mono text-amber-400 font-bold">{enhanceDenoise}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={enhanceDenoise}
                    onChange={(e) => setEnhanceDenoise(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Contrast */}
                <div>
                  <div className="flex justify-between text-[11px] text-stone-300 mb-0.5">
                    <span>Microcontraste & Texturas</span>
                    <span className="font-mono text-amber-400 font-bold">{enhanceContrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={enhanceContrast}
                    onChange={(e) => setEnhanceContrast(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Vibrance */}
                <div>
                  <div className="flex justify-between text-[11px] text-stone-300 mb-0.5">
                    <span>Viveza Cromaticamente Adaptativa</span>
                    <span className="font-mono text-amber-400 font-bold">{enhanceVibrance}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={enhanceVibrance}
                    onChange={(e) => setEnhanceVibrance(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* 5. Output Format */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-stone-300">
                  <span className="font-semibold">Formato de Salida:</span>
                  <span className="text-amber-400 font-mono font-bold uppercase">{enhanceOutputFormat}</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'auto', label: 'Auto' },
                    { id: 'png', label: 'PNG HD' },
                    { id: 'webp', label: 'WebP' },
                    { id: 'jpg', label: 'JPG 95%' }
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setEnhanceOutputFormat(fmt.id as any)}
                      className={`py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        enhanceOutputFormat === fmt.id
                          ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white border-amber-400 shadow-sm font-bold'
                          : 'bg-[#181C2B] text-stone-300 border-[#262C3E] hover:text-white'
                      }`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              FLUIDEZ Y FPS ANTI-LAG (SMOOTH TOOLS)
             ========================================================= */}
          {tool.id === 'smooth-tools' && (
            <div className="space-y-3.5">
              {/* Informative Header Banner */}
              <div className={`p-3.5 rounded-2xl border space-y-1.5 shadow-sm transition-all ${
                smoothVyzerPreset
                  ? 'bg-gradient-to-br from-[#06241b] via-[#0b1c20] to-[#0a151b] border-emerald-500/50'
                  : 'bg-gradient-to-br from-[#061E28] via-[#0D1726] to-[#0A111E] border-cyan-500/40'
              }`}>
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg border ${
                    smoothVyzerPreset ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                  }`}>
                    {smoothVyzerPreset ? <Sparkles className="h-4 w-4" /> : <Zap className="h-4 w-4 text-cyan-400 animate-pulse" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {smoothVyzerPreset ? 'Perfil Moldura de Avatar Vyzer (≤ 30 FPS Estricto)' : `Motor de Fluidez y Anti-Lag (${smoothTargetFps} FPS)`}
                    </span>
                    <span className={`text-[10px] font-mono ${smoothVyzerPreset ? 'text-emerald-300/90' : 'text-cyan-300/90'}`}>
                      {smoothVyzerPreset ? 'Formato de salida optimizado: WebP 30 FPS (34ms) compatible con Discord/Vyzer' : 'Corrige animaciones lentas, bug de 100ms y tirones'}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-stone-300 leading-relaxed">
                  {smoothVyzerPreset
                    ? 'Configuración calibrada a 34ms por fotograma (29.41 FPS reales) para garantizar que Vyzer y Discord nunca rechacen tu moldura ni la detecten como 59 o 60 FPS.'
                    : `Aumenta la tasa a ${smoothTargetFps} FPS reales, corrige el retraso artificial que imponen los navegadores y acelera la reproducción con total suavidad.`}
                </p>
              </div>

              {/* Perfil Especial Molduras Vyzer / Discord (Límite 30 FPS) */}
              <div className={`p-3.5 rounded-2xl border transition-all ${
                smoothVyzerPreset
                  ? 'bg-gradient-to-r from-emerald-950/80 via-[#0a1e1b] to-cyan-950/80 border-emerald-400/80 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                  : 'bg-[#141824] border-[#262C3E]'
              }`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl border ${smoothVyzerPreset ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-stone-800 text-stone-400 border-[#262C3E]'}`}>
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">Perfil Moldura de Avatar (Vyzer / Discord)</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          ≤ 30 FPS Estricto
                        </span>
                      </div>
                      <p className="text-[10px] text-stone-300 leading-snug mt-0.5">
                        Fija 30 FPS exactos (34ms por cuadro) para evitar que Vyzer diga que tiene 59/60 FPS.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !smoothVyzerPreset;
                      setSmoothVyzerPreset(next);
                      if (next) {
                        setSmoothTargetFps(30);
                        setSmoothOutputFormat('webp');
                        setSmoothInterpolate(false);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      smoothVyzerPreset
                        ? 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-sm'
                        : 'bg-[#1e2436] text-stone-300 hover:text-white border border-[#2e374f]'
                    }`}
                  >
                    {smoothVyzerPreset ? '✓ Activado' : 'Activar'}
                  </button>
                </div>

                {smoothVyzerPreset && (
                  <div className="mt-3 pt-2.5 border-t border-emerald-500/20 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-emerald-300 font-mono">
                      <span className="bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">✓ Retraso: 34ms (29.4 FPS)</span>
                      <span className="bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">✓ Formato: WebP Animado</span>
                      <span className="bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">✓ Transparencia Alfa intacta</span>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-stone-200 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={smoothVyzerResize}
                        onChange={(e) => setSmoothVyzerResize(e.target.checked)}
                        className="rounded border-[#262C3E] bg-[#181C2B] text-emerald-500 focus:ring-0"
                      />
                      <span>Auto-centrar en lienzo cuadrado de 1000 × 1000 px (estándar de Vyzer)</span>
                    </label>
                  </div>
                )}
              </div>

              {/* 1. Mode Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-200 block">
                  Modo de Fluidez & Rendimiento
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      id: 'boost-fps' as const,
                      title: 'Ultra 60 FPS 🚀',
                      desc: 'Aumenta la tasa de refresco para una reproducción suave como la seda.',
                      badge: 'Más suave'
                    },
                    {
                      id: 'speed-up' as const,
                      title: 'Acelerar Velocidad ⚡',
                      desc: 'Haz que la animación vaya más rápida (1.25x a 3x) sin que se arrastre.',
                      badge: 'Rápido'
                    },
                    {
                      id: 'fix-gif-lag' as const,
                      title: 'Fix Lag Navegador 🛠️',
                      desc: 'Soluciona el bug de 100ms de Chrome/Safari que ralentiza los GIFs.',
                      badge: 'Anti-Lag'
                    },
                    {
                      id: 'motion-blend' as const,
                      title: 'Interpolación Óptica 🌊',
                      desc: 'Genera fotogramas intermedios mezclados para duplicar la fluidez.',
                      badge: 'Motion Blur'
                    },
                    {
                      id: 'drop-stutter' as const,
                      title: 'Quitar Trabados ✂️',
                      desc: 'Elimina fotogramas congelados o repetidos que provocan paradas.',
                      badge: 'Sin tirones'
                    }
                  ].map((m) => {
                    const isSelected = smoothMode === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSmoothMode(m.id);
                          if (m.id === 'speed-up' && smoothSpeedMultiplier === 1.0) {
                            setSmoothSpeedMultiplier(1.5);
                          }
                          if (m.id === 'boost-fps') {
                            setSmoothTargetFps(60);
                          }
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                          isSelected
                            ? 'bg-gradient-to-r from-cyan-950/80 to-blue-950/80 text-white border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)] font-medium'
                            : 'bg-[#181C2B] border-[#262C3E] text-stone-300 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className={`text-xs font-bold ${isSelected ? 'text-cyan-300' : 'text-stone-200'}`}>
                            {m.title}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono ${
                            isSelected ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/40' : 'bg-stone-800 text-stone-400'
                          }`}>
                            {m.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-stone-400 leading-snug">
                          {m.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Target FPS Selector */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-stone-200">
                  <span className="font-semibold">Tasa de Cuadros (FPS Objetivo):</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {smoothTargetFps} FPS {smoothTargetFps === 30 && <span className="text-emerald-400 text-[10px] font-normal font-sans">(≤30 FPS Vyzer)</span>}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { fps: 15, label: '15 FPS', sub: 'Ligero' },
                    { fps: 24, label: '24 FPS', sub: 'Cine' },
                    { fps: 30, label: '30 FPS', sub: 'Vyzer/Discord' },
                    { fps: 50, label: '50 FPS', sub: 'Ultra' },
                    { fps: 60, label: '60 FPS', sub: 'Máximo' }
                  ].map((item) => (
                    <button
                      key={item.fps}
                      type="button"
                      onClick={() => {
                        setSmoothTargetFps(item.fps);
                        if (item.fps !== 30) {
                          setSmoothVyzerPreset(false);
                        }
                      }}
                      className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer ${
                        smoothTargetFps === item.fps
                          ? item.fps === 30
                            ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white border-emerald-400 shadow-md font-bold'
                            : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400 shadow-md font-bold'
                          : 'bg-[#181C2B] text-stone-300 border-[#262C3E] hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold">{item.label}</div>
                      <div className="text-[9px] opacity-80 truncate">{item.sub}</div>
                    </button>
                  ))}
                </div>
                {smoothTargetFps === 30 && (
                  <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-2 mt-1.5">
                    <span className="text-emerald-400 text-xs">✓</span>
                    <p className="text-[10px] text-emerald-200/90 leading-tight">
                      <strong>Calibrado a 34ms por cuadro (29.41 FPS):</strong> Cumple estrictamente con el límite de 30 FPS de Vyzer y Discord para que la plataforma nunca lo rechace por exceder 30 FPS o marcar 59/60 FPS.
                    </p>
                  </div>
                )}
              </div>

              {/* 3. Speed Multiplier */}
              <div className="space-y-1.5 p-3 rounded-xl bg-[#141824] border border-[#262C3E]">
                <div className="flex justify-between text-xs text-stone-200">
                  <span className="font-semibold">Multiplicador de Velocidad:</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {smoothSpeedMultiplier}x {smoothSpeedMultiplier > 1 ? '(Acelerado)' : smoothSpeedMultiplier < 1 ? '(Cámara lenta)' : '(Normal)'}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1 mb-2">
                  {[
                    { mult: 0.75, label: '0.75x' },
                    { mult: 1.0, label: '1.0x Normal' },
                    { mult: 1.25, label: '1.25x' },
                    { mult: 1.5, label: '1.5x Rápido' },
                    { mult: 2.0, label: '2.0x Doble' }
                  ].map((p) => (
                    <button
                      key={p.mult}
                      type="button"
                      onClick={() => setSmoothSpeedMultiplier(p.mult)}
                      className={`py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                        smoothSpeedMultiplier === p.mult
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 font-bold'
                          : 'bg-[#181C2B] text-stone-400 border-[#262C3E] hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={smoothSpeedMultiplier}
                  onChange={(e) => setSmoothSpeedMultiplier(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* 4. Optimization Toggles */}
              <div className="space-y-2 p-3 rounded-xl bg-[#141824] border border-[#262C3E]">
                <div className="text-xs font-bold text-stone-200 flex items-center justify-between pb-1 border-b border-[#222736]">
                  <span>Ajustes Avanzados Anti-Lag</span>
                  <span className="text-[10px] text-cyan-400/90 font-mono">Optimizaciones automáticas</span>
                </div>

                {/* Fix Browser Delay */}
                <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={smoothFixBrowserDelay}
                    onChange={(e) => setSmoothFixBrowserDelay(e.target.checked)}
                    className="mt-0.5 rounded border-[#262C3E] bg-[#181C2B] text-cyan-500 focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-semibold text-stone-200 block">
                      Reparar bug de 100ms de navegadores
                    </span>
                    <span className="text-[10px] text-stone-400 leading-snug block">
                      Los navegadores frenan a 10 FPS los fotogramas con retraso cero o menor a 15ms. Esta opción normaliza el tiempo para que reproduzca a máxima velocidad.
                    </span>
                  </div>
                </label>

                {/* Interpolate Frames */}
                <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={smoothInterpolate}
                    onChange={(e) => setSmoothInterpolate(e.target.checked)}
                    className="mt-0.5 rounded border-[#262C3E] bg-[#181C2B] text-cyan-500 focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-semibold text-stone-200 block">
                      Interpolación óptica (Motion Blending)
                    </span>
                    <span className="text-[10px] text-stone-400 leading-snug block">
                      Crea fotogramas intermedios de transición entre cuadros existentes, duplicando la fluidez en animaciones con pocos FPS.
                    </span>
                  </div>
                </label>

                {/* Drop Duplicate Stutter */}
                <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={smoothDropDuplicates}
                    onChange={(e) => setSmoothDropDuplicates(e.target.checked)}
                    className="mt-0.5 rounded border-[#262C3E] bg-[#181C2B] text-cyan-500 focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-semibold text-stone-200 block">
                      Eliminar cuadros congelados redundantes
                    </span>
                    <span className="text-[10px] text-stone-400 leading-snug block">
                      Detecta fotogramas idénticos consecutivos y los descarta para eliminar tirones sin alterar la sincronización temporal.
                    </span>
                  </div>
                </label>
              </div>

              {/* 5. Output Format */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-stone-300">
                  <span className="font-semibold">Formato y Tasa de Salida:</span>
                  <span className={`font-mono font-bold uppercase ${smoothVyzerPreset ? 'text-emerald-400' : 'text-cyan-400'}`}>
                    {smoothVyzerPreset
                      ? 'WEBP (≤ 30 FPS VYZER)'
                      : `${smoothOutputFormat === 'auto' ? 'AUTO' : smoothOutputFormat.toUpperCase()} (${smoothTargetFps} FPS)`}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    {
                      id: 'auto',
                      label: smoothVyzerPreset ? 'Auto (WebP 30 FPS)' : `Auto (${smoothTargetFps} FPS)`
                    },
                    {
                      id: 'webp',
                      label: smoothVyzerPreset ? 'WebP (≤ 30 FPS Vyzer)' : `WebP (${smoothTargetFps} FPS)`
                    },
                    {
                      id: 'gif',
                      label: smoothVyzerPreset ? 'GIF (30 FPS Vyzer)' : `GIF (${smoothTargetFps} FPS)`
                    }
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setSmoothOutputFormat(fmt.id as any)}
                      className={`py-1.5 px-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center truncate ${
                        smoothOutputFormat === fmt.id
                          ? smoothVyzerPreset
                            ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm font-bold'
                            : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400 shadow-sm font-bold'
                          : 'bg-[#181C2B] text-stone-300 border-[#262C3E] hover:text-white'
                      }`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-stone-400 pt-0.5">
                  {smoothVyzerPreset ? (
                    <span className="text-emerald-300 flex items-center gap-1">
                      <span>✓</span> Formato configurado para exportar estrictamente a <strong>30 FPS (34ms por cuadro)</strong> en WebP Animado, 100% compatible con molduras de avatar de Discord y Vyzer.
                    </span>
                  ) : (
                    <span>
                      💡 <span className="text-cyan-300">Configuración actual:</span> Exportará en formato <strong>{smoothOutputFormat === 'auto' ? 'WebP' : smoothOutputFormat.toUpperCase()}</strong> a <strong>{smoothTargetFps} FPS</strong> reales ({smoothTargetFps === 30 ? '34ms' : `${Math.round(1000 / smoothTargetFps)}ms`} por cuadro).
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* =========================================================
              8. AUDIO TOOLS
             ========================================================= */}
          {tool.id === 'audio-tools' && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-[#14261C] border border-[#10B981]/30 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Music className="h-4 w-4 text-[#34D399]" />
                  <span>Extractor de Pista de Audio</span>
                </div>
                <p className="text-xs text-stone-300 leading-relaxed">
                  Extrae la pista de audio de tu vídeo directamente en tu navegador y expórtala en formato WAV sin compresión ni pérdidas.
                </p>
              </div>
            </div>
          )}

          {/* =========================================================
              9. TEXT / MEME TOOLS
             ========================================================= */}
          {tool.id === 'text-tools' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Texto Arriba (Meme / Título)
                </label>
                <input
                  type="text"
                  placeholder="ESCRIBE EL TEXTO SUPERIOR..."
                  value={topText}
                  onChange={(e) => setTopText(e.target.value)}
                  className="w-full rounded-2xl bg-[#181C2B] border border-[#2B3248] px-3 py-2 text-xs text-white placeholder:text-stone-500 focus:border-[#10B981] focus:outline-none uppercase font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Texto Abajo (Remate / Subtítulo)
                </label>
                <input
                  type="text"
                  placeholder="ESCRIBE EL TEXTO INFERIOR..."
                  value={bottomText}
                  onChange={(e) => setBottomText(e.target.value)}
                  className="w-full rounded-2xl bg-[#181C2B] border border-[#2B3248] px-3 py-2 text-xs text-white placeholder:text-stone-500 focus:border-[#10B981] focus:outline-none uppercase font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Color del Texto
                </label>
                <div className="flex gap-2">
                  {[
                    { color: '#FFFFFF', name: 'Blanco' },
                    { color: '#FFFF00', name: 'Amarillo' },
                    { color: '#EF4444', name: 'Rojo' },
                    { color: '#10B981', name: 'Verde' },
                    { color: '#000000', name: 'Negro' }
                  ].map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => setTextColor(c.color)}
                      style={{ backgroundColor: c.color }}
                      className={`h-7 w-7 rounded-full border-2 ${
                        textColor === c.color ? 'border-white scale-110 shadow-md' : 'border-transparent'
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              10. SVG RENDER TOOLS
             ========================================================= */}
          {tool.id === 'svg-tools' && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-stone-300">
                Escala de renderizado vectorial
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { scale: 1, label: '1x', desc: 'Tamaño original' },
                  { scale: 2, label: '2x', desc: 'Alta nitidez' },
                  { scale: 4, label: '4x', desc: 'Ultra HD' }
                ].map((s) => (
                  <button
                    key={s.scale}
                    type="button"
                    onClick={() => setSvgScale(s.scale)}
                    className={`p-2.5 rounded-2xl text-left border transition-all ${
                      svgScale === s.scale
                        ? 'bg-[#14261C] border-[#10B981] text-white font-bold shadow-xs'
                        : 'bg-[#181C2B] border-[#262C3E] text-stone-300 hover:text-white'
                    }`}
                  >
                    <p className={`text-xs font-bold ${svgScale === s.scale ? 'text-[#34D399]' : 'text-white'}`}>{s.label}</p>
                    <p className="text-[10px] text-stone-400">{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* =========================================================
              11. VIDEO FRAME SCRUB
             ========================================================= */}
          {(tool.id === 'video-tools' || tool.id === 'split-tools') && isVideo && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-stone-300">
                <span>Segundo exacto a capturar:</span>
                <span className="font-mono text-[#34D399] font-bold">
                  {videoTimestamp.toFixed(2)}s / {(videoDuration || 0).toFixed(2)}s
                </span>
              </div>
              <input
                type="range"
                min="0"
                max={videoDuration || 10}
                step="0.05"
                value={videoTimestamp}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setVideoTimestamp(val);
                  if (videoRef.current) {
                    videoRef.current.currentTime = val;
                  }
                }}
                className="w-full accent-[#10B981]"
              />
            </div>
          )}

          {/* =========================================================
              12. EXIF METADATA & PRIVACY SCRUBBER (analyzer-tools)
             ========================================================= */}
          {tool.id === 'analyzer-tools' && (
            <div className="space-y-3.5 text-left animate-in fade-in duration-200">
              {isLoadingMetadata ? (
                <div className="p-5 rounded-2xl bg-[#141724] border border-[#262C3E] flex items-center justify-center gap-2.5 text-stone-400 text-xs">
                  <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
                  <span>Inspeccionando bloques binarios EXIF, GPS y fotogramas...</span>
                </div>
              ) : metadataInfo ? (
                <div className="space-y-3">
                  {/* Privacy Alert Header */}
                  {metadataInfo.hasGps ? (
                    <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/70 text-rose-200 space-y-1.5 shadow-lg">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-rose-400 animate-bounce" />
                        <h4 className="text-xs font-black text-rose-300 uppercase tracking-wider">
                          ¡Alerta de Privacidad! Ubicación GPS Encontrada
                        </h4>
                      </div>
                      <p className="text-[11px] text-rose-200/90 leading-relaxed">
                        Esta fotografía contiene tus coordenadas geográficas exactas registradas por el teléfono/cámara.
                        Cualquier persona que descargue esta foto puede ver dónde fue tomada.
                      </p>
                      {metadataInfo.gps && (
                        <div className="flex items-center justify-between pt-1 text-[10px] font-mono">
                          <span className="text-rose-300">
                            Lat: {metadataInfo.gps.latitude}°, Lon: {metadataInfo.gps.longitude}°
                            {metadataInfo.gps.altitude ? ` (${metadataInfo.gps.altitude}m)` : ''}
                          </span>
                          <a
                            href={metadataInfo.gps.googleMapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-white font-bold transition-colors"
                          >
                            <span>Ver en Google Maps</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  ) : metadataInfo.privacyRisk === 'MEDIO' ? (
                    <div className="p-3 rounded-2xl bg-amber-950/50 border border-amber-500/60 text-amber-200 space-y-1">
                      <div className="flex items-center gap-2">
                        <Camera className="h-4 w-4 text-amber-400" />
                        <h4 className="text-xs font-bold text-amber-300">Metadatos de Dispositivo y Fecha Detectados</h4>
                      </div>
                      <p className="text-[11px] text-amber-200/80">
                        La foto registra información de la cámara, fecha y software, pero no contiene GPS exacto.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-2xl bg-[#10B981]/15 border border-[#10B981]/60 text-[#34D399] flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-[#10B981]" />
                      <span className="text-xs font-bold">¡Archivo Limpio! No se detectaron rastros GPS ni EXIF invasivos.</span>
                    </div>
                  )}

                  {/* Metadata Specs Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-[#121520] border border-[#222736]">
                      <span className="text-[10px] text-stone-400">Dimensiones</span>
                      <p className="font-mono font-bold text-white">
                        {metadataInfo.dimensions ? `${metadataInfo.dimensions.width} × ${metadataInfo.dimensions.height} px` : 'N/D'}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#121520] border border-[#222736]">
                      <span className="text-[10px] text-stone-400">Cámara / Marca</span>
                      <p className="font-bold text-white truncate">
                        {metadataInfo.make ? `${metadataInfo.make} ${metadataInfo.model || ''}` : 'No registrada'}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#121520] border border-[#222736]">
                      <span className="text-[10px] text-stone-400">Fecha y Hora</span>
                      <p className="font-mono font-semibold text-white truncate">
                        {metadataInfo.dateTime || 'No registrada'}
                      </p>
                    </div>
                    {metadataInfo.iso && (
                      <div className="p-2.5 rounded-xl bg-[#121520] border border-[#222736]">
                        <span className="text-[10px] text-stone-400">Sensibilidad</span>
                        <p className="font-mono font-bold text-cyan-300">ISO {metadataInfo.iso}</p>
                      </div>
                    )}
                    {metadataInfo.fNumber && (
                      <div className="p-2.5 rounded-xl bg-[#121520] border border-[#222736]">
                        <span className="text-[10px] text-stone-400">Apertura</span>
                        <p className="font-mono font-bold text-cyan-300">{metadataInfo.fNumber}</p>
                      </div>
                    )}
                    {metadataInfo.exposureTime && (
                      <div className="p-2.5 rounded-xl bg-[#121520] border border-[#222736]">
                        <span className="text-[10px] text-stone-400">Exposición</span>
                        <p className="font-mono font-bold text-cyan-300">{metadataInfo.exposureTime}</p>
                      </div>
                    )}
                    {metadataInfo.isGif && (
                      <>
                        <div className="p-2.5 rounded-xl bg-[#121520] border border-[#222736]">
                          <span className="text-[10px] text-stone-400">Fotogramas GIF</span>
                          <p className="font-mono font-bold text-emerald-400">{metadataInfo.gifFramesCount} cuadros</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#121520] border border-[#222736]">
                          <span className="text-[10px] text-stone-400">Bucle / Duración</span>
                          <p className="font-mono font-bold text-emerald-400">
                            {metadataInfo.gifTotalDurationSec ? `${metadataInfo.gifTotalDurationSec}s (${metadataInfo.gifLoopCount})` : metadataInfo.gifLoopCount}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Formato de salida final (permite conservar WebP o forzar PNG/JPG/AVIF/GIF/BMP/ICO/PDF/SVG) */}
          {!isVideo && tool.id !== 'palette-tools' && tool.id !== 'audio-tools' && (
            <div className="pt-2 border-t border-[#262C3E] space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-[#10B981]" />
                  <span>Formato de salida general</span>
                </label>
                <span className="text-[10px] text-[#34D399] font-mono font-bold">
                  {selectedOutputFormat === 'auto'
                    ? `Auto (${detectDefaultFormat(fileInfo.file).toUpperCase()})`
                    : selectedOutputFormat.toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {[
                  { id: 'auto', label: 'Auto' },
                  { id: 'webp', label: 'WEBP' },
                  { id: 'png', label: 'PNG' },
                  { id: 'jpg', label: 'JPG' },
                  { id: 'avif', label: 'AVIF' },
                  { id: 'gif', label: 'GIF' },
                  { id: 'ico', label: 'ICO' },
                  { id: 'bmp', label: 'BMP' },
                  { id: 'pdf', label: 'PDF' },
                  { id: 'svg', label: 'SVG' }
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setSelectedOutputFormat(fmt.id as any)}
                    className={`py-1.5 px-1 rounded-xl text-[10px] font-bold border transition-all ${
                      selectedOutputFormat === fmt.id
                        ? 'bg-gradient-to-r from-[#10B981] to-[#059669] text-white border-[#34D399] shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                        : 'bg-[#181C2B] text-stone-300 border-[#262C3E] hover:text-white'
                    }`}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error notice */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-[#2D161C] border border-[#EF4444] text-[#FF8596] text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-[#EF4444]" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Process Action Button with Glowing Green Style */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              id="btn-process-action"
              onClick={handleProcess}
              disabled={status === 'processing'}
              className={`relative overflow-hidden w-full flex items-center justify-between py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#10B981] via-[#059669] to-[#047857] hover:from-[#059669] hover:to-[#047857] active:scale-[0.98] text-white font-extrabold text-sm border border-[#34D399]/60 shadow-xl transition-all disabled:opacity-90 min-h-[50px] cursor-pointer ${
                status !== 'processing' ? 'animate-blink-glow-green' : 'animate-bar-glow-green'
              }`}
            >
              {status === 'processing' ? (
                <>
                  <div className="flex items-center gap-2 z-10 font-bold">
                    <RefreshCw className="h-4 w-4 animate-spin text-[#A7F3D0]" />
                    <span className="text-white drop-shadow">{t('workspace.processing', 'Procesando archivo...')}</span>
                  </div>
                  <div className="z-10 bg-black/60 backdrop-blur-xs px-3 py-1 rounded-full border border-[#34D399]/80 font-mono text-xs font-black text-[#6EE7B7] shadow-[0_0_10px_#10B981]">
                    {processProgress}%
                  </div>
                  {/* Inner progress fill bar */}
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-[#047857] via-[#10B981] to-[#34D399] transition-all duration-150 animate-bar-glow-green"
                    style={{ width: `${processProgress}%` }}
                  />
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mx-auto tracking-wide text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                    <Zap className="h-4 w-4 fill-white" />
                    <span>
                      {tool.id === 'optimize-tools'
                        ? t('workspace.compressAndReduce', 'Comprimir y Reducir Peso')
                        : tool.id === 'recolor-tools'
                        ? t('workspace.applyRecolor', 'Aplicar Cambio de Color')
                        : tool.id === 'analyzer-tools'
                        ? '🛡️ Limpiar Metadatos y Eliminar GPS (100% Seguro)'
                        : tool.id === 'smooth-tools'
                        ? smoothVyzerPreset
                          ? 'Generar WebP Vyzer (≤ 30 FPS Estricto)'
                          : `Aplicar Fluidez (${smoothTargetFps} FPS • ${smoothOutputFormat === 'auto' ? 'WebP' : smoothOutputFormat.toUpperCase()})`
                        : t('workspace.processFile', 'Procesar archivo')}
                    </span>
                  </div>
                </>
              )}
            </button>

            {status === 'processing' && (
              <p className="text-center text-[11px] text-[#34D399] font-bold animate-pulse flex items-center justify-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#10B981] animate-ping" />
                {t('workspace.processingOnDevice', 'Procesando en tu dispositivo...')} {processProgress}%
              </p>
            )}
          </div>
        </div>

        {/* Live Preview / Player / Result Card */}
        <div className="p-4 sm:p-5 rounded-3xl bg-[#141722] border border-[#222736] shadow-md space-y-3 text-left">
          <div className="flex items-center justify-between pb-2 border-b border-[#222736]">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">
                {result ? 'Archivo Procesado' : tool.id === 'recolor-tools' ? 'Vista en Tiempo Real' : 'Vista Previa en Vivo'}
              </h3>
              {!result && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-[#34D399] bg-[#14261C] px-2 py-0.5 rounded-full border border-[#10B981]/40">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-ping" />
                  {tool.id === 'recolor-tools'
                    ? isRecolorPreviewUpdating
                      ? 'Actualizando...'
                      : 'Color en Directo'
                    : isVideo
                    ? 'Vídeo interactivo'
                    : isGif
                    ? 'GIF activo'
                    : 'Directo'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {(tool.id === 'recolor-tools' || result) && !isVideo && (
                <button
                  type="button"
                  onMouseDown={() => setShowOriginalComparison(true)}
                  onMouseUp={() => setShowOriginalComparison(false)}
                  onTouchStart={() => setShowOriginalComparison(true)}
                  onTouchEnd={() => setShowOriginalComparison(false)}
                  onClick={() => setShowOriginalComparison((prev) => !prev)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer select-none ${
                    showOriginalComparison
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                      : 'bg-[#181C2B] border-[#262C3E] text-stone-300 hover:text-white'
                  }`}
                  title="Mantén presionado o haz clic para comparar con el original"
                >
                  <Eye className="h-3.5 w-3.5 text-cyan-400" />
                  <span>{showOriginalComparison ? 'Viendo Original' : 'Ver Original'}</span>
                </button>
              )}

              {result && !result.blob.type.startsWith('audio/') && !isVideo && (
                <button
                  type="button"
                  onClick={() => setIsSplitMode((prev) => !prev)}
                  className={`text-[11px] font-semibold px-2 py-1 rounded-xl border flex items-center gap-1 transition-all cursor-pointer select-none ${
                    isSplitMode
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-xs'
                      : 'bg-[#181C2B] border-[#262C3E] text-stone-300 hover:text-white'
                  }`}
                  title="Comparador interactivo antes/después con control deslizante"
                >
                  <Split className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">Slider Dividido</span>
                </button>
              )}

              {/* Fullscreen Zoom Inspector Button */}
              {!isVideo && (
                <button
                  type="button"
                  onClick={() => {
                    setZoomScale(1);
                    setIsZoomModalOpen(true);
                  }}
                  className="p-1.5 rounded-xl border bg-[#181C2B] border-[#262C3E] text-stone-300 hover:text-white transition-all cursor-pointer"
                  title="Inspeccionar en pantalla completa con Zoom"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              )}

              {result && (
                <span className="text-[11px] font-mono text-[#34D399] font-bold flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {result.timeTakenMs} ms
                </span>
              )}
            </div>
          </div>

          <div className="relative min-h-[220px] max-h-[350px] rounded-2xl bg-[#0B0C10] border border-[#222736] flex items-center justify-center overflow-hidden p-2">
            {result ? (
              result.blob.type.startsWith('audio/') ? (
                <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#10B981] text-white shadow-lg shadow-emerald-900/40 animate-glow-green">
                    <Music className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{result.fileName}</p>
                    <p className="text-xs text-[#34D399] font-mono mt-0.5">{result.extraInfo}</p>
                  </div>
                  <audio controls autoPlay src={result.url} className="w-full max-w-xs mt-2" />
                </div>
              ) : isSplitMode ? (
                /* Interactive Split Slider Viewer */
                <div className="relative w-full flex flex-col items-center gap-2">
                  <div className="relative max-h-[280px] w-full flex items-center justify-center overflow-hidden rounded-xl select-none">
                    {/* Original image as base */}
                    <img
                      src={fileInfo.previewUrl}
                      alt="Original"
                      className="max-h-[270px] w-auto max-w-full object-contain pointer-events-none"
                    />
                    {/* Processed image clipped */}
                    <div
                      className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden"
                      style={{ clipPath: `polygon(0 0, ${splitPercent}% 0, ${splitPercent}% 100%, 0 100%)` }}
                    >
                      <img
                        src={result.url}
                        alt="Resultado"
                        className="max-h-[270px] w-auto max-w-full object-contain pointer-events-none"
                      />
                    </div>
                    {/* Dividing vertical neon line */}
                    <div
                      className="absolute top-0 bottom-0 w-[2px] bg-cyan-400 pointer-events-none shadow-[0_0_10px_rgba(6,182,212,1)]"
                      style={{ left: `${splitPercent}%` }}
                    >
                      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 bg-[#0A0D16] border border-cyan-400 text-cyan-300 rounded-full p-1 shadow-md">
                        <Split className="h-3 w-3" />
                      </div>
                    </div>
                    <span className="absolute bottom-2 left-2 bg-black/80 border border-cyan-500/60 text-cyan-300 text-[10px] font-bold px-2 py-0.5 rounded-full pointer-events-none">
                      Resultado ({splitPercent}%)
                    </span>
                    <span className="absolute bottom-2 right-2 bg-black/80 border border-stone-600 text-stone-300 text-[10px] font-bold px-2 py-0.5 rounded-full pointer-events-none">
                      Original
                    </span>
                  </div>
                  {/* Range slider to drag divider smoothly */}
                  <div className="w-full max-w-xs flex items-center gap-2 px-2">
                    <span className="text-[10px] text-stone-400 font-mono">0%</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={splitPercent}
                      onChange={(e) => setSplitPercent(Number(e.target.value))}
                      className="w-full h-1.5 bg-[#222736] rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                    <span className="text-[10px] text-stone-400 font-mono">100%</span>
                  </div>
                </div>
              ) : (
                <div className="relative flex flex-col items-center justify-center">
                  <img
                    src={result.url}
                    alt="Resultado"
                    className="max-h-[300px] w-auto max-w-full object-contain rounded-xl shadow-md"
                    referrerPolicy="no-referrer"
                  />
                  {result.format.includes('GIF') && (
                    <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-xs px-2 py-0.5 rounded-full border border-[#10B981]/50 text-[10px] font-bold text-[#34D399]">
                      GIF Animado
                    </div>
                  )}
                </div>
              )
            ) : isVideo ? (
              /* Active AutoPlaying Video Player */
              <div className="relative w-full h-full flex flex-col items-center justify-center">
                <video
                  ref={videoRef}
                  src={fileInfo.previewUrl}
                  autoPlay
                  loop
                  muted={isVideoMuted}
                  playsInline
                  className="max-h-[270px] w-auto max-w-full object-contain rounded-xl"
                  style={{
                    transform: `rotate(${rotationAngle}deg) scale(${flipH ? -1 : 1}, ${flipV ? -1 : 1})`,
                    filter:
                      tool.id === 'effects-tools'
                        ? `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
                        : undefined
                  }}
                  onLoadedMetadata={(e) => {
                    setVideoDuration(e.currentTarget.duration);
                  }}
                  onTimeUpdate={(e) => {
                    setVideoTimestamp(e.currentTarget.currentTime);
                  }}
                />

                {/* Overlaid Meme Text if in Text Tool */}
                {tool.id === 'text-tools' && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 text-center font-['Impact'] uppercase tracking-wider">
                    <p
                      className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] font-extrabold"
                      style={{ color: textColor, fontSize: '18px' }}
                    >
                      {topText}
                    </p>
                    <p
                      className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] font-extrabold"
                      style={{ color: textColor, fontSize: '18px' }}
                    >
                      {bottomText}
                    </p>
                  </div>
                )}

                {/* Floating Video Control Bar */}
                <div className="absolute bottom-2 flex items-center gap-2 bg-[#141722]/90 backdrop-blur-xs px-3 py-1.5 rounded-full border border-[#2B3248] shadow-md z-10">
                  <button
                    type="button"
                    onClick={() => {
                      if (videoRef.current) {
                        if (isVideoPlaying) {
                          videoRef.current.pause();
                          setIsVideoPlaying(false);
                        } else {
                          videoRef.current.play();
                          setIsVideoPlaying(true);
                        }
                      }
                    }}
                    className="text-white hover:text-[#10B981] transition-colors"
                  >
                    {isVideoPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsVideoMuted(!isVideoMuted)}
                    className="text-stone-300 hover:text-white transition-colors"
                    title={isVideoMuted ? 'Activar sonido' : 'Silenciar'}
                  >
                    {isVideoMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5 text-[#10B981]" />}
                  </button>

                  <span className="text-[10px] text-[#34D399] font-mono font-semibold">
                    {videoTimestamp.toFixed(1)}s / {(videoDuration || 0).toFixed(1)}s
                  </span>
                </div>
              </div>
            ) : (
              /* Image / GIF / Static Preview */
              <div className="relative flex items-center justify-center">
                <img
                  src={
                    showOriginalComparison
                      ? fileInfo.previewUrl
                      : (tool.id === 'recolor-tools' && recolorLivePreviewUrl)
                      ? recolorLivePreviewUrl
                      : fileInfo.previewUrl
                  }
                  alt="Vista previa"
                  onClick={handlePreviewImageClick}
                  className={`max-h-[270px] w-auto max-w-full object-contain rounded-xl transition-all ${
                    tool.id === 'recolor-tools' || isEyedropperActive
                      ? 'cursor-crosshair ring-2 ring-cyan-400 shadow-md'
                      : ''
                  }`}
                  style={{
                    transform: `rotate(${rotationAngle}deg) scale(${flipH ? -1 : 1}, ${flipV ? -1 : 1})`,
                    filter:
                      tool.id === 'effects-tools'
                        ? `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
                        : undefined
                  }}
                  referrerPolicy="no-referrer"
                />

                {/* Eyedropper indicator overlay for Recolor Tool */}
                {tool.id === 'recolor-tools' && (
                  <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-xs px-2.5 py-1 rounded-full border border-cyan-500/50 text-[10px] font-bold text-cyan-300 flex items-center gap-1.5 shadow-md pointer-events-none">
                    <Pipette className="h-3 w-3 text-cyan-400 animate-pulse" />
                    <span>Haz clic en la imagen para muestrear color</span>
                    {eyedropperSampledHex && (
                      <span
                        className="h-3 w-3 rounded-full border border-white/60 ml-0.5"
                        style={{ backgroundColor: eyedropperSampledHex }}
                        title={`Último color muestreado: ${eyedropperSampledHex}`}
                      />
                    )}
                  </div>
                )}

                {isGif && (
                  <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-xs px-2 py-0.5 rounded-full border border-[#10B981]/50 text-[10px] font-bold text-[#34D399]">
                    ⚡ GIF Activo
                  </div>
                )}

                {tool.id === 'text-tools' && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 text-center font-['Impact'] uppercase tracking-wider">
                    <p
                      className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] font-extrabold"
                      style={{ color: textColor, fontSize: '20px' }}
                    >
                      {topText}
                    </p>
                    <p
                      className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] font-extrabold"
                      style={{ color: textColor, fontSize: '20px' }}
                    >
                      {bottomText}
                    </p>
                  </div>
                )}

                {/* Interactive Cut Half Preview Overlay */}
                {tool.id === 'cut-half-tools' && (
                  <div className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden border border-cyan-500/40">
                    {/* Shaded area representing the removed half */}
                    <div
                      className="absolute bg-red-600/35 backdrop-blur-[0.5px] border border-red-500/70 transition-all duration-150 flex items-center justify-center"
                      style={{
                        top: halfRemoveTarget === 'bottom' ? `${halfDividerPercent}%` : 0,
                        bottom: halfRemoveTarget === 'top' ? `${100 - halfDividerPercent}%` : 0,
                        left: halfRemoveTarget === 'right' ? `${halfDividerPercent}%` : 0,
                        right: halfRemoveTarget === 'left' ? `${100 - halfDividerPercent}%` : 0,
                        width:
                          halfRemoveTarget === 'left'
                            ? `${halfDividerPercent}%`
                            : halfRemoveTarget === 'right'
                            ? `${100 - halfDividerPercent}%`
                            : '100%',
                        height:
                          halfRemoveTarget === 'top'
                            ? `${halfDividerPercent}%`
                            : halfRemoveTarget === 'bottom'
                            ? `${100 - halfDividerPercent}%`
                            : '100%'
                      }}
                    >
                      <div className="bg-[#0B0F19]/90 border border-red-500/80 px-2 py-0.5 rounded-full text-[10px] font-bold text-red-300 flex items-center gap-1 shadow-lg">
                        <X className="h-3 w-3 text-red-400" />
                        <span>Mitad a eliminar</span>
                      </div>
                    </div>

                    {/* Preserved half badge */}
                    <div
                      className="absolute transition-all duration-150 flex items-center justify-center pointer-events-none"
                      style={{
                        top: halfRemoveTarget === 'top' ? `${halfDividerPercent}%` : 0,
                        bottom: halfRemoveTarget === 'bottom' ? `${100 - halfDividerPercent}%` : 0,
                        left: halfRemoveTarget === 'left' ? `${halfDividerPercent}%` : 0,
                        right: halfRemoveTarget === 'right' ? `${100 - halfDividerPercent}%` : 0,
                        width:
                          halfRemoveTarget === 'right'
                            ? `${halfDividerPercent}%`
                            : halfRemoveTarget === 'left'
                            ? `${100 - halfDividerPercent}%`
                            : '100%',
                        height:
                          halfRemoveTarget === 'bottom'
                            ? `${halfDividerPercent}%`
                            : halfRemoveTarget === 'top'
                            ? `${100 - halfDividerPercent}%`
                            : '100%'
                      }}
                    >
                      <div className="bg-[#0B0F19]/90 border border-[#10B981]/80 px-2 py-0.5 rounded-full text-[10px] font-bold text-[#34D399] flex items-center gap-1 shadow-lg">
                        <Check className="h-3 w-3 text-[#10B981]" />
                        <span>Conservar ({halfAction === 'crop' ? '50% lienzo' : 'con máscara'})</span>
                      </div>
                    </div>

                    {/* Dividing cut line */}
                    {halfRemoveTarget === 'left' || halfRemoveTarget === 'right' ? (
                      <div
                        className="absolute top-0 bottom-0 w-[2px] bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.9)] z-20 flex flex-col items-center justify-center transition-all duration-150"
                        style={{ left: `${halfDividerPercent}%` }}
                      >
                        <div className="bg-[#080C14] text-cyan-300 border border-cyan-400 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md shadow-md flex items-center gap-0.5">
                          <Split className="h-2.5 w-2.5 text-cyan-400" />
                          <span>{halfDividerPercent}%</span>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="absolute left-0 right-0 h-[2px] bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.9)] z-20 flex items-center justify-center transition-all duration-150"
                        style={{ top: `${halfDividerPercent}%` }}
                      >
                        <div className="bg-[#080C14] text-cyan-300 border border-cyan-400 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md shadow-md flex items-center gap-0.5">
                          <Split className="h-2.5 w-2.5 text-cyan-400" />
                          <span>{halfDividerPercent}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Enhance Tools HUD Badge */}
                {tool.id === 'enhance-tools' && (
                  <div className="absolute top-2 left-2 z-20 pointer-events-none flex items-center gap-1.5 bg-[#0B0F19]/90 border border-amber-500/60 px-2.5 py-1 rounded-full shadow-lg backdrop-blur-sm">
                    <Sparkles className="h-3 w-3 text-amber-400 animate-pulse" />
                    <span className="text-[10px] font-bold text-amber-300">
                      HD {enhanceScale}x • {enhanceIntensity}%
                    </span>
                  </div>
                )}

                {/* Smooth Tools HUD Badge */}
                {tool.id === 'smooth-tools' && (
                  <div className={`absolute top-2 left-2 z-20 pointer-events-none flex items-center gap-1.5 bg-[#0B0F19]/90 border px-2.5 py-1 rounded-full shadow-lg backdrop-blur-sm ${
                    smoothVyzerPreset ? 'border-emerald-500/70 text-emerald-300' : 'border-cyan-500/60 text-cyan-300'
                  }`}>
                    {smoothVyzerPreset ? (
                      <Sparkles className="h-3 w-3 text-emerald-400 animate-pulse" />
                    ) : (
                      <Zap className="h-3 w-3 text-cyan-400 animate-pulse" />
                    )}
                    <span className="text-[10px] font-bold">
                      {smoothVyzerPreset ? '30 FPS Vyzer • Anti-Lag (34ms)' : `${smoothTargetFps} FPS • ${smoothSpeedMultiplier}x Anti-Lag`}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action buttons on completion */}
          {result && (
            <div className="space-y-3 pt-1 animate-in fade-in zoom-in-95 duration-200">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-2xl bg-[#181C2B] border border-[#2B3248] text-stone-300">
                  <p className="text-[10px] text-stone-400">{t('workspace.originalWeight', 'Peso Original')}</p>
                  <p className="font-bold text-white">{formatFileSize(result.originalSize)}</p>
                </div>
                <div className="p-2.5 rounded-2xl bg-[#10B981]/15 border border-[#10B981] text-[#34D399]">
                  <p className="text-[10px] text-[#A7F3D0]">{t('workspace.newWeight', 'Nuevo Peso')}</p>
                  <p className="font-bold text-white">
                    {formatFileSize(result.newSize)}
                    {result.newSize < result.originalSize && (
                      <span className="text-[10px] text-[#34D399] ml-1 font-bold">
                        (-{Math.round((1 - result.newSize / result.originalSize) * 100)}%)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-download-processed"
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#10B981] via-[#059669] to-[#047857] hover:from-[#059669] hover:to-[#047857] text-white font-black text-xs sm:text-sm border border-[#34D399]/60 shadow-xl transition-all min-h-[48px] animate-blink-glow-green cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>{t('workspace.download', 'Descargar')} {result.format}</span>
                </button>

                {/* Copiar al Portapapeles (Universal Clipboard copy) */}
                {!result.blob.type.startsWith('audio/') && (
                  <button
                    type="button"
                    id="btn-copy-processed"
                    onClick={handleCopyImage}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-3 rounded-2xl bg-[#1E2333] hover:bg-[#2B3248] text-white border border-[#2B3248] transition-all min-h-[48px] text-xs font-semibold cursor-pointer"
                    title="Copiar imagen directamente al portapapeles"
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-4 w-4 text-[#10B981]" />
                        <span className="hidden sm:inline text-[#34D399]">¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 text-stone-300" />
                        <span className="hidden sm:inline">Copiar</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  id="btn-share-processed"
                  onClick={handleShare}
                  className="flex items-center justify-center p-3 rounded-2xl bg-[#1E2333] hover:bg-[#2B3248] text-white border border-[#2B3248] transition-all min-h-[48px] min-w-[48px] cursor-pointer"
                  title={t('workspace.share', 'Compartir')}
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>

              {/* Pipeline: Continuar editando este resultado en otra herramienta sin volver a subir */}
              {onChainResult && result && !result.blob.type.startsWith('audio/') && (
                <div className="pt-2.5 border-t border-[#232B3E] space-y-2 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-stone-300 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                      <span>{t('workspace.continueEditing', 'Seguir editando este resultado con:')}</span>
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">1-clic directo</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {[
                      { id: 'recolor-tools', name: 'Cambiar Color', icon: Pipette, color: 'hover:border-cyan-500/60 hover:text-cyan-300' },
                      { id: 'effects-tools', name: 'Filtros y FX', icon: Wand2, color: 'hover:border-rose-500/60 hover:text-rose-300' },
                      { id: 'watermark-tools', name: 'Marca de agua', icon: ShieldAlert, color: 'hover:border-amber-500/60 hover:text-amber-300' },
                      { id: 'optimize-tools', name: 'Comprimir', icon: TrendingDown, color: 'hover:border-emerald-500/60 hover:text-emerald-300' },
                      { id: 'cut-half-tools', name: 'Cortar Mitad', icon: Split, color: 'hover:border-cyan-500/60 hover:text-cyan-300' },
                      { id: 'enhance-tools', name: 'Supernitidez', icon: Sparkles, color: 'hover:border-amber-500/60 hover:text-amber-300' },
                      { id: 'converter-tools', name: 'Convertidor', icon: RefreshCw, color: 'hover:border-teal-500/60 hover:text-teal-300' },
                      { id: 'analyzer-tools', name: 'EXIF & Limpiar', icon: ShieldCheck, color: 'hover:border-blue-500/60 hover:text-blue-300' }
                    ]
                      .filter((item) => item.id !== tool.id)
                      .slice(0, 4)
                      .map((chainItem) => {
                        const IconComponent = chainItem.icon;
                        return (
                          <button
                            key={chainItem.id}
                            type="button"
                            onClick={() => {
                              const chainedFile = new File([result.blob], result.fileName, { type: result.blob.type });
                              onChainResult(chainedFile, chainItem.id);
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-[#171B2A] border border-[#262C3E] text-stone-300 text-[11px] font-medium transition-all cursor-pointer ${chainItem.color}`}
                          >
                            <IconComponent className="h-3 w-3 shrink-0" />
                            <span className="truncate">{chainItem.name}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {tool.id === 'cut-half-tools' && (
                <button
                  type="button"
                  onClick={() => {
                    let nextTarget: HalfRemovalTarget = 'right';
                    if (halfRemoveTarget === 'left') nextTarget = 'right';
                    else if (halfRemoveTarget === 'right') nextTarget = 'left';
                    else if (halfRemoveTarget === 'top') nextTarget = 'bottom';
                    else if (halfRemoveTarget === 'bottom') nextTarget = 'top';
                    setHalfRemoveTarget(nextTarget);
                    // trigger reprocess
                    setTimeout(() => {
                      handleProcess();
                    }, 50);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/90 border border-cyan-500/50 text-cyan-300 text-xs font-bold transition-all cursor-pointer shadow"
                >
                  <RotateCw className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Invertir y procesar la otra mitad ahora</span>
                </button>
              )}

              {tool.id === 'enhance-tools' && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEnhanceScale(2);
                      setEnhanceMode('upscale-2x');
                      setTimeout(() => handleProcess(), 50);
                    }}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all cursor-pointer shadow"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    <span>Subir a Superresolución 2x</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEnhanceSharpen(90);
                      setEnhanceIntensity(100);
                      setTimeout(() => handleProcess(), 50);
                    }}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all cursor-pointer shadow"
                  >
                    <Zap className="h-3.5 w-3.5 text-amber-400" />
                    <span>Máxima Supernitidez 100%</span>
                  </button>
                </div>
              )}

              {tool.id === 'smooth-tools' && (
                <div className="grid grid-cols-2 gap-2">
                  {smoothVyzerPreset ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setTimeout(() => handleProcess(), 50);
                        }}
                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/90 border border-emerald-500/50 text-emerald-300 text-xs font-bold transition-all cursor-pointer shadow"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Exportar Vyzer 30 FPS</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSmoothVyzerResize(!smoothVyzerResize);
                        }}
                        className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow ${
                          smoothVyzerResize
                            ? 'bg-emerald-900/60 text-emerald-200 border-emerald-400'
                            : 'bg-[#181C2B] text-stone-300 border-[#2B3248] hover:text-white'
                        }`}
                      >
                        <span>{smoothVyzerResize ? '1000x1000 px Activo ✓' : 'Fijar 1000x1000 px'}</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setTimeout(() => handleProcess(), 50);
                        }}
                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition-all cursor-pointer shadow"
                      >
                        <Zap className="h-3.5 w-3.5 text-cyan-400" />
                        <span>Procesar a {smoothTargetFps} FPS</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSmoothSpeedMultiplier(1.5);
                          setSmoothMode('speed-up');
                          setTimeout(() => handleProcess(), 50);
                        }}
                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition-all cursor-pointer shadow"
                      >
                        <FastForward className="h-3.5 w-3.5 text-cyan-400" />
                        <span>Acelerar a 1.5x</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      )}
      {/* Modal de Análisis Visual Inteligente con Gemini */}
      {showAiAnalysisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl rounded-3xl bg-[#141724] border border-[#2B354C] shadow-2xl p-5 sm:p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#242C40]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/20 text-red-400 border border-red-500/40">
                  <Sparkles className="h-5 w-5 animate-spin-slow" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <span>Análisis y Diagnóstico con IA Gemini</span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40">
                      MULTIMODAL
                    </span>
                  </h3>
                  <p className="text-[11px] text-stone-400 truncate max-w-[300px]">
                    {fileInfo.name} ({formatFileSize(fileInfo.size)})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAiAnalysisModal(false)}
                className="p-1.5 rounded-xl bg-[#1D2435] text-stone-400 hover:text-white border border-[#2B354C]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-3 text-left">
              {isAnalyzingMedia ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
                  <RefreshCw className="h-8 w-8 text-red-400 animate-spin" />
                  <p className="text-sm font-bold text-white">Inspeccionando composición con IA...</p>
                  <p className="text-xs text-stone-400 max-w-xs">
                    Analizando paleta de color, iluminación, sujetos y formato óptimo con Gemini 3.7.
                  </p>
                </div>
              ) : mediaAnalysisResult ? (
                <div className="p-4 rounded-2xl bg-[#0F121C] border border-[#20273A] text-xs text-stone-200 leading-relaxed markdown-body">
                  <Markdown>{mediaAnalysisResult}</Markdown>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-stone-400">
                  No se pudo cargar el análisis.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-[#242C40] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setMediaAnalysisResult(null);
                  handleAnalyzeLoadedImage();
                }}
                disabled={isAnalyzingMedia}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1A2030] hover:bg-[#242C42] text-xs font-semibold text-stone-300 hover:text-white border border-[#2E3750] transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isAnalyzingMedia ? 'animate-spin' : ''}`} />
                <span>Reanalizar</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAiAnalysisModal(false)}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Zoom e Inspección Pantalla Completa */}
      {isZoomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl h-[90vh] rounded-3xl bg-[#0D0F17] border border-[#2B354C] shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#20273A] bg-[#121522]">
              <div className="flex items-center gap-2.5">
                <Maximize2 className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-black text-white">
                  Inspección de Detalle y Transparencia
                </h3>
                <span className="text-[10px] font-mono text-cyan-300 px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40">
                  {Math.round(zoomScale * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoomScale((z) => Math.max(0.5, z - 0.5))}
                  disabled={zoomScale <= 0.5}
                  className="p-1.5 rounded-xl bg-[#1A2030] hover:bg-[#242C42] text-stone-300 disabled:opacity-40 border border-[#2B354C] cursor-pointer"
                  title="Alejar"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale(1)}
                  className="px-2.5 py-1 rounded-xl bg-[#1A2030] hover:bg-[#242C42] text-xs font-mono text-stone-300 border border-[#2B354C] cursor-pointer"
                >
                  1x
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale((z) => Math.min(3, z + 0.5))}
                  disabled={zoomScale >= 3}
                  className="p-1.5 rounded-xl bg-[#1A2030] hover:bg-[#242C42] text-stone-300 disabled:opacity-40 border border-[#2B354C] cursor-pointer"
                  title="Acercar"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsZoomModalOpen(false)}
                  className="p-1.5 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-500/40 ml-2 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Canvas / Image Display area with checkerboard background */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-[radial-gradient(#1e2438_1px,transparent_1px)] [background-size:16px_16px]">
              <img
                src={result ? result.url : fileInfo.previewUrl}
                alt="Vista detallada"
                style={{ transform: `scale(${zoomScale})`, transformOrigin: 'center center' }}
                className="max-h-[75vh] w-auto max-w-none transition-transform duration-150 rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
