import React, { useState, useEffect, useRef } from 'react';
import {
  Music,
  Upload,
  Link,
  Copy,
  Check,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  ExternalLink,
  FileAudio,
  Activity,
  Mic,
  Square,
  QrCode,
  Code,
  ShieldCheck,
  Trash2,
  Download,
  Sparkles,
  Layers,
  Clock,
  Radio,
  Share2,
  Globe,
  Edit2,
  Save,
  X,
  Search,
  FileCode,
  MessageSquare,
  Terminal,
  HelpCircle,
  Zap,
  Gauge,
  Sliders,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

export interface ConvertedAudio {
  id: string;
  filename: string;
  url: string;
  fullUrl: string;
  dataUrl?: string;
  size: number;
  mimeType: string;
  duration?: number;
  createdAt: string;
}

interface Mp3ToUrlConverterProps {
  onClose?: () => void;
  onBackToEditor?: () => void;
  onUseInEditor?: (audioUrl: string, audioName: string) => void;
}

export const Mp3ToUrlConverter: React.FC<Mp3ToUrlConverterProps> = ({
  onClose,
  onBackToEditor,
  onUseInEditor,
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [activeAudio, setActiveAudio] = useState<ConvertedAudio | null>(null);
  const [history, setHistory] = useState<ConvertedAudio[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMode, setUploadMode] = useState<'turbo' | 'original'>('turbo');
  const [uploadPhase, setUploadPhase] = useState<string>('Iniciando...');
  const [uploadSpeedText, setUploadSpeedText] = useState<string>('');
  const [uploadedBytesText, setUploadedBytesText] = useState<string>('');
  const [timeRemainingText, setTimeRemainingText] = useState<string>('');
  const [uploadingFileName, setUploadingFileName] = useState<string>('');
  const [uploadSavings, setUploadSavings] = useState<{
    originalSize: number;
    compressedSize: number;
    percent: number;
  } | null>(null);
  const activeXhrsRef = useRef<XMLHttpRequest[]>([]);
  const isCanceledRef = useRef<boolean>(false);

  const cancelUpload = () => {
    isCanceledRef.current = true;
    if (activeXhrsRef.current && activeXhrsRef.current.length > 0) {
      activeXhrsRef.current.forEach((xhr) => {
        try {
          xhr.abort();
        } catch {}
      });
      activeXhrsRef.current = [];
    }
    setIsUploading(false);
    setUploadProgress(0);
    setUploadPhase('');
    setUploadSavings(null);
  };
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Input Method Tab: 'upload' | 'remote' | 'mic' | 'presets'
  const [inputTab, setInputTab] = useState<'upload' | 'remote' | 'mic' | 'presets'>('upload');

  // Remote Web URL input state
  const [remoteUrlInput, setRemoteUrlInput] = useState('');
  const [remoteNameInput, setRemoteNameInput] = useState('');
  const [isImportingRemote, setIsImportingRemote] = useState(false);
  const [importPhase, setImportPhase] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  // Renaming active audio
  const [isEditingName, setIsEditingName] = useState(false);
  const [newFilenameInput, setNewFilenameInput] = useState('');

  // Search in History
  const [historySearch, setHistorySearch] = useState('');

  // Guide accordion toggle
  const [showUsageGuide, setShowUsageGuide] = useState(false);

  // Audio Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(false);

  // Verification / Health Check state
  const [healthStatus, setHealthStatus] = useState<{
    tested: boolean;
    checking: boolean;
    status?: number;
    statusText?: string;
    contentType?: string;
    contentLength?: string;
    acceptRanges?: string;
    latencyMs?: number;
    ok?: boolean;
  }>({ tested: false, checking: false });

  // Microphone Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Load existing audio records from server on mount
  useEffect(() => {
    fetchAudioList();
  }, []);

  const fetchAudioList = async () => {
    try {
      const res = await fetch('/api/audio/list');
      if (res.ok) {
        const data = await res.json();
        if (data.files && Array.isArray(data.files)) {
          const origin = window.location.origin;
          const mapped: ConvertedAudio[] = data.files.map((f: any) => ({
            id: f.id,
            filename: f.filename,
            url: f.url,
            fullUrl: `${origin}${f.url}`,
            size: f.size,
            mimeType: f.mimeType,
            duration: f.duration || 0,
            createdAt: f.createdAt,
          }));
          setHistory(mapped);
          if (mapped.length > 0 && !activeAudio) {
            setActiveAudio(mapped[0]);
          }
        }
      }
    } catch (e) {
      console.warn('Could not fetch audio list:', e);
    }
  };

  // Setup Audio element events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      if (!isLooping) {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration || 0);

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, [activeAudio, isLooping]);

  // Handle Play/Pause
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch((e) => console.warn('Autoplay prevented:', e));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 0.8;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const [isGeneratingBase64, setIsGeneratingBase64] = useState(false);

  // Convert File to MP3 URL via High-Speed Direct Streaming & Parallel Multi-Chunk Processor
  const processAudioFile = async (file: File | Blob, filename: string) => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadingFileName(filename);
    setUploadSpeedText('');
    setUploadedBytesText('');
    setTimeRemainingText('');
    setUploadSavings(null);
    isCanceledRef.current = false;
    activeXhrsRef.current = [];

    try {
      const targetFilename = filename.endsWith('.mp3') ? filename : `${filename.replace(/\.[^/.]+$/, '')}.mp3`;
      const mimeType = file.type || 'audio/mpeg';
      const fileSize = file.size;

      let data: any;

      // For small files (<= 1.5MB), use direct stream
      if (fileSize <= 1.5 * 1024 * 1024) {
        setUploadPhase('Transfiriendo archivo de audio...');
        data = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          activeXhrsRef.current = [xhr];

          xhr.open('POST', '/api/audio/upload', true);
          xhr.setRequestHeader('Content-Type', 'application/octet-stream');
          xhr.setRequestHeader('x-audio-filename', encodeURIComponent(targetFilename));
          xhr.setRequestHeader('x-audio-mime', mimeType);
          xhr.setRequestHeader('x-audio-optimize', uploadMode === 'turbo' ? 'true' : 'false');

          const startTime = performance.now();
          let lastLoaded = 0;
          let lastTime = startTime;

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && e.total > 0) {
              const now = performance.now();
              const timeDiff = (now - lastTime) / 1000;

              if (timeDiff >= 0.15) {
                const bytesDiff = e.loaded - lastLoaded;
                const speedBps = bytesDiff / timeDiff;
                lastLoaded = e.loaded;
                lastTime = now;

                if (speedBps > 0) {
                  const speedFormatted =
                    speedBps > 1024 * 1024
                      ? `${(speedBps / (1024 * 1024)).toFixed(1)} MB/s`
                      : `${Math.round(speedBps / 1024)} KB/s`;
                  setUploadSpeedText(speedFormatted);

                  const remainingBytes = e.total - e.loaded;
                  const remainingSecs = Math.max(0, Math.ceil(remainingBytes / speedBps));
                  setTimeRemainingText(remainingSecs > 0 ? `~${remainingSecs}s restantes` : 'Finalizando...');
                }
              }

              const loadedMb = (e.loaded / (1024 * 1024)).toFixed(1);
              const totalMb = (e.total / (1024 * 1024)).toFixed(1);
              setUploadedBytesText(`${loadedMb} MB / ${totalMb} MB`);

              const netPercent = 2 + Math.round((e.loaded / e.total) * 90);
              setUploadProgress(Math.min(92, netPercent));

              if (e.loaded >= e.total) {
                setUploadProgress(95);
                setUploadPhase('El servidor está verificando y procesando el MP3...');
                setTimeRemainingText('Un segundo...');
              }
            }
          };

          xhr.onload = () => {
            activeXhrsRef.current = [];
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                resolve(JSON.parse(xhr.responseText));
              } catch {
                reject(new Error('Respuesta del servidor no válida'));
              }
            } else {
              let errMsg = 'Error del servidor al procesar el audio';
              try {
                const errJson = JSON.parse(xhr.responseText);
                if (errJson.error) errMsg = errJson.error;
              } catch {}
              reject(new Error(errMsg));
            }
          };

          xhr.onerror = () => {
            activeXhrsRef.current = [];
            reject(new Error('Fallo de conexión al transferir el archivo'));
          };

          xhr.onabort = () => {
            activeXhrsRef.current = [];
            reject(new Error('Subida cancelada'));
          };

          xhr.ontimeout = () => {
            activeXhrsRef.current = [];
            reject(new Error('Tiempo de espera agotado'));
          };

          xhr.send(file);
        });
      } else {
        // High-Speed Multi-Channel Parallel Chunk Upload for larger files
        // 768KB chunks are ideal for mobile cellular radio buffers
        const CHUNK_SIZE = 768 * 1024;
        const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
        const uploadId = `up_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
        const CONCURRENCY = 3; // 3 parallel connections maximize 4G/LTE mobile bandwidth

        setUploadPhase(`Acelerando con ${CONCURRENCY} canales móviles (0/${totalChunks})...`);

        const chunkLoaded = new Array(totalChunks).fill(0);
        let completedChunks = 0;
        let finalServerResponse: any = null;

        const startTime = performance.now();
        let lastReportedTime = startTime;
        let lastReportedBytes = 0;

        const updateTelemetry = () => {
          const totalLoaded = chunkLoaded.reduce((a, b) => a + b, 0);
          const now = performance.now();
          const timeDiff = (now - lastReportedTime) / 1000;

          if (timeDiff >= 0.15) {
            const bytesDiff = totalLoaded - lastReportedBytes;
            const speedBps = bytesDiff / timeDiff;
            lastReportedBytes = totalLoaded;
            lastReportedTime = now;

            if (speedBps > 0) {
              const speedFormatted =
                speedBps > 1024 * 1024
                  ? `${(speedBps / (1024 * 1024)).toFixed(1)} MB/s`
                  : `${Math.round(speedBps / 1024)} KB/s`;
              setUploadSpeedText(speedFormatted);

              const remainingBytes = Math.max(0, fileSize - totalLoaded);
              const remainingSecs = Math.max(0, Math.ceil(remainingBytes / speedBps));
              setTimeRemainingText(remainingSecs > 0 ? `~${remainingSecs}s restantes` : 'Finalizando...');
            }
          }

          const loadedMb = (totalLoaded / (1024 * 1024)).toFixed(1);
          const totalMb = (fileSize / (1024 * 1024)).toFixed(1);
          setUploadedBytesText(`${loadedMb} MB / ${totalMb} MB`);

          const pct = Math.min(92, Math.round((totalLoaded / fileSize) * 92));
          setUploadProgress(pct);
        };

        const uploadSingleChunkWithRetry = async (chunkIndex: number, retries = 2): Promise<any> => {
          if (isCanceledRef.current) throw new Error('Subida cancelada');

          const start = chunkIndex * CHUNK_SIZE;
          const end = Math.min(fileSize, start + CHUNK_SIZE);
          const chunkBlob = file.slice(start, end);

          try {
            return await new Promise((resolve, reject) => {
              if (isCanceledRef.current) return reject(new Error('Subida cancelada'));

              const xhr = new XMLHttpRequest();
              activeXhrsRef.current.push(xhr);

              xhr.open('POST', '/api/audio/upload-chunk', true);
              xhr.setRequestHeader('Content-Type', 'application/octet-stream');
              xhr.setRequestHeader('x-upload-id', uploadId);
              xhr.setRequestHeader('x-chunk-index', String(chunkIndex));
              xhr.setRequestHeader('x-total-chunks', String(totalChunks));
              xhr.setRequestHeader('x-audio-filename', encodeURIComponent(targetFilename));
              xhr.setRequestHeader('x-audio-optimize', uploadMode === 'turbo' ? 'true' : 'false');

              xhr.upload.onprogress = (e) => {
                if (e.lengthComputable && !isCanceledRef.current) {
                  chunkLoaded[chunkIndex] = e.loaded;
                  updateTelemetry();
                }
              };

              xhr.onload = () => {
                activeXhrsRef.current = activeXhrsRef.current.filter((x) => x !== xhr);
                if (xhr.status >= 200 && xhr.status < 300) {
                  try {
                    const resJson = JSON.parse(xhr.responseText);
                    chunkLoaded[chunkIndex] = chunkBlob.size;
                    completedChunks++;
                    setUploadPhase(
                      `Acelerando con 3 canales paralelos (${completedChunks}/${totalChunks} bloques)...`
                    );
                    updateTelemetry();
                    if (resJson.complete) {
                      finalServerResponse = resJson;
                    }
                    resolve(resJson);
                  } catch {
                    reject(new Error('Respuesta del servidor no válida'));
                  }
                } else {
                  reject(new Error(`Error en bloque ${chunkIndex}: HTTP ${xhr.status}`));
                }
              };

              xhr.onerror = () => {
                activeXhrsRef.current = activeXhrsRef.current.filter((x) => x !== xhr);
                reject(new Error(`Fallo de red en bloque ${chunkIndex}`));
              };

              xhr.onabort = () => {
                activeXhrsRef.current = activeXhrsRef.current.filter((x) => x !== xhr);
                reject(new Error('Subida cancelada'));
              };

              xhr.send(chunkBlob);
            });
          } catch (err: any) {
            if (isCanceledRef.current || err?.message === 'Subida cancelada') {
              throw err;
            }
            if (retries > 0) {
              await new Promise((r) => setTimeout(r, 400));
              return uploadSingleChunkWithRetry(chunkIndex, retries - 1);
            }
            throw err;
          }
        };

        // Worker Pool with CONCURRENCY
        const chunkIndices = Array.from({ length: totalChunks }, (_, i) => i);
        let nextIndex = 0;

        const worker = async () => {
          while (nextIndex < chunkIndices.length) {
            if (isCanceledRef.current) break;
            const idx = chunkIndices[nextIndex++];
            await uploadSingleChunkWithRetry(idx);
          }
        };

        const workers = Array.from({ length: Math.min(CONCURRENCY, totalChunks) }, () => worker());
        await Promise.all(workers);

        if (isCanceledRef.current) throw new Error('Subida cancelada');

        setUploadProgress(96);
        setUploadPhase('El servidor está verificando y procesando el MP3...');
        setTimeRemainingText('Un segundo...');

        if (!finalServerResponse) {
          throw new Error('No se recibió la confirmación final del servidor');
        }

        data = finalServerResponse;
      }

      setUploadProgress(100);
      setUploadPhase('¡Enlace MP3 listo!');

      const origin = window.location.origin;
      const fullUrl = `${origin}${data.url}`;

      const newConverted: ConvertedAudio = {
        id: data.id,
        filename: data.filename,
        url: data.url,
        fullUrl,
        size: data.size,
        mimeType: data.mimeType || mimeType,
        duration: data.duration || 0,
        createdAt: data.createdAt,
      };

      if (data.savingsPercent && data.savingsPercent > 0) {
        setUploadSavings({
          originalSize: data.originalSize || file.size,
          compressedSize: data.size,
          percent: data.savingsPercent,
        });
      }

      setActiveAudio(newConverted);
      setHistory((prev) => [newConverted, ...prev.filter((i) => i.id !== newConverted.id)]);
      setHealthStatus({ tested: false, checking: false });

      // Trigger celebratory confetti
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: [theme.primary, '#38BDF8', '#34D399'],
      });
    } catch (err: any) {
      if (err?.message !== 'Subida cancelada') {
        alert(`Error al procesar el archivo MP3: ${err?.message || err}`);
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadPhase('');
      activeXhrsRef.current = [];
    }
  };

  // Handle File Input selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAudioFile(file, file.name);
    }
    e.target.value = '';
  };

  // Drag and Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processAudioFile(file, file.name);
    }
  };

  // Generate Sample Synthetic Audio (AudioBuffer synthesized locally -> WAV/MP3)
  const generateSampleAudio = async (
    type: 'synthwave' | 'cyberpunk' | 'lofi' | 'sfx'
  ) => {
    setIsUploading(true);
    setUploadProgress(30);

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const sampleRate = 44100;
      const durationSeconds = type === 'sfx' ? 2.5 : 6.0;
      const offlineCtx = new OfflineAudioContext(2, sampleRate * durationSeconds, sampleRate);

      if (type === 'synthwave') {
        // Upbeat Synthwave bassline & chords
        const bassNotes = [110, 110, 130.81, 146.83, 110, 110, 98, 110];
        bassNotes.forEach((freq, idx) => {
          const osc = offlineCtx.createOscillator();
          const gain = offlineCtx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.value = freq;
          const t = idx * 0.75;
          gain.gain.setValueAtTime(0.3, t);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.65);
          osc.connect(gain);
          gain.connect(offlineCtx.destination);
          osc.start(t);
          osc.stop(t + 0.7);
        });
      } else if (type === 'cyberpunk') {
        // Aggressive distorted synth arpeggio
        const freqs = [82.4, 98.0, 123.47, 164.81, 196.0, 246.94];
        for (let i = 0; i < 16; i++) {
          const osc = offlineCtx.createOscillator();
          const gain = offlineCtx.createGain();
          osc.type = 'square';
          osc.frequency.value = freqs[i % freqs.length] * (i % 2 === 0 ? 1 : 2);
          const t = i * 0.35;
          gain.gain.setValueAtTime(0.25, t);
          gain.gain.exponentialRampToValueAtTime(0.005, t + 0.3);
          osc.connect(gain);
          gain.connect(offlineCtx.destination);
          osc.start(t);
          osc.stop(t + 0.35);
        }
      } else if (type === 'lofi') {
        // Warm mellow sine chord
        const chord = [220, 261.63, 329.63, 392.0];
        chord.forEach((freq) => {
          const osc = offlineCtx.createOscillator();
          const gain = offlineCtx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.18, 0);
          gain.gain.exponentialRampToValueAtTime(0.01, durationSeconds - 0.5);
          osc.connect(gain);
          gain.connect(offlineCtx.destination);
          osc.start(0);
          osc.stop(durationSeconds);
        });
      } else {
        // Laser SFX sweep
        const osc = offlineCtx.createOscillator();
        const gain = offlineCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1800, 0);
        osc.frequency.exponentialRampToValueAtTime(80, 1.2);
        gain.gain.setValueAtTime(0.4, 0);
        gain.gain.exponentialRampToValueAtTime(0.01, 1.4);
        osc.connect(gain);
        gain.connect(offlineCtx.destination);
        osc.start(0);
        osc.stop(1.5);
      }

      setUploadProgress(60);
      const renderedBuffer = await offlineCtx.startRendering();

      // Encode rendered AudioBuffer to WAV/MP3 Blob
      const wavBlob = audioBufferToWavBlob(renderedBuffer);
      const filename = `sample_${type}_audio.mp3`;
      await processAudioFile(wavBlob, filename);
    } catch (e: any) {
      console.error('Error generating sample audio:', e);
      setIsUploading(false);
    }
  };

  // Convert AudioBuffer to standard PCM 16-bit WAV
  const audioBufferToWavBlob = (buffer: AudioBuffer): Blob => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const out = new DataView(new ArrayBuffer(length));
    const channels: Float32Array[] = [];
    let sampleRate = buffer.sampleRate;
    let offset = 0;
    let pos = 0;

    function setUint16(data: number) {
      out.setUint16(pos, data, true);
      pos += 2;
    }
    function setUint32(data: number) {
      out.setUint32(pos, data, true);
      pos += 4;
    }

    // RIFF chunk descriptor
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    // fmt sub-chunk
    setUint32(0x20746d66); // "fmt "
    setUint32(16); // subchunk1size (16 for PCM)
    setUint16(1); // audio format (1 = PCM)
    setUint16(numOfChan);
    setUint32(sampleRate);
    setUint32(sampleRate * 2 * numOfChan); // byte rate
    setUint16(numOfChan * 2); // block align
    setUint16(16); // bits per sample

    // data sub-chunk
    setUint32(0x61746164); // "data"
    setUint32(length - pos - 4);

    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (offset < buffer.length) {
      for (let i = 0; i < numOfChan; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
        out.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([out], { type: 'audio/mpeg' });
  };

  // Microphone Recording Handler
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mpeg' });
        const name = `grabacion_voz_${new Date().toISOString().slice(11, 19).replace(/:/g, '-')}.mp3`;
        processAudioFile(audioBlob, name);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds((sec) => sec + 1);
      }, 1000);
    } catch (err) {
      alert('No se pudo acceder al micrófono. Verifica los permisos del navegador.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordTimerRef.current);
    }
  };

  // Copy to clipboard helper with checkmark animation
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Copy Base64 on-demand so uploads remain lightning-fast
  const handleCopyBase64 = async () => {
    if (activeAudio?.dataUrl) {
      copyToClipboard(activeAudio.dataUrl, 'dataUrl');
      return;
    }
    if (!activeAudio?.url) return;
    setIsGeneratingBase64(true);
    try {
      const res = await fetch(activeAudio.url);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onload = () => {
        const b64 = reader.result as string;
        setActiveAudio((prev) => (prev ? { ...prev, dataUrl: b64 } : null));
        copyToClipboard(b64, 'dataUrl');
        setIsGeneratingBase64(false);
      };
      reader.onerror = () => {
        setIsGeneratingBase64(false);
        alert('No se pudo generar el Data URL Base64');
      };
      reader.readAsDataURL(blob);
    } catch {
      setIsGeneratingBase64(false);
      alert('Error al obtener el archivo para codificar en Base64');
    }
  };

  // Convert Remote Web URL to local direct MP3 streaming URL
  const handleImportRemoteUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const urlTrimmed = remoteUrlInput.trim();
    if (!urlTrimmed) return;

    const isYt = /youtube\.com|youtu\.be/i.test(urlTrimmed);
    setIsImportingRemote(true);
    setImportError(null);
    setImportPhase(
      isYt
        ? 'Conectando con YouTube y extrayendo audio de alta calidad...'
        : 'Descargando y procesando archivo de audio...'
    );

    let phaseTimer: any = null;
    if (isYt) {
      phaseTimer = setTimeout(() => {
        setImportPhase('Convirtiendo pista de YouTube a MP3 (320 kbps)...');
      }, 3500);
    }

    try {
      const res = await fetch('/api/audio/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: urlTrimmed,
          customName: remoteNameInput.trim() || undefined,
        }),
      });

      if (phaseTimer) clearTimeout(phaseTimer);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${res.status} al descargar el archivo de audio`);
      }

      const data = await res.json();
      const origin = window.location.origin;
      const fullUrl = `${origin}${data.url}`;

      const newConverted: ConvertedAudio = {
        id: data.id,
        filename: data.filename,
        url: data.url,
        fullUrl,
        size: data.size,
        mimeType: data.mimeType || 'audio/mpeg',
        duration: data.duration || 0,
        createdAt: data.createdAt,
      };

      if (newConverted.duration > 0) {
        setDuration(newConverted.duration);
      }

      setActiveAudio(newConverted);
      setHistory((prev) => [newConverted, ...prev.filter((i) => i.id !== newConverted.id)]);
      setHealthStatus({ tested: false, checking: false });
      setRemoteUrlInput('');
      setRemoteNameInput('');

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: [theme.primary, '#38BDF8', '#34D399'],
      });
    } catch (err: any) {
      if (phaseTimer) clearTimeout(phaseTimer);
      setImportError(err?.message || 'Error al descargar o procesar la URL');
    } finally {
      setIsImportingRemote(false);
      setImportPhase('');
    }
  };

  // Start renaming active audio
  const handleStartEditing = () => {
    if (!activeAudio) return;
    setNewFilenameInput(activeAudio.filename);
    setIsEditingName(true);
  };

  // Save renamed audio
  const handleSaveNewName = async () => {
    if (!activeAudio || !newFilenameInput.trim()) {
      setIsEditingName(false);
      return;
    }

    try {
      const res = await fetch(`/api/audio/rename/${activeAudio.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName: newFilenameInput.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        const origin = window.location.origin;
        const updatedFullUrl = `${origin}${data.url}`;

        setActiveAudio((prev) =>
          prev
            ? {
                ...prev,
                filename: data.filename,
                url: data.url,
                fullUrl: updatedFullUrl,
              }
            : null
        );

        setHistory((prev) =>
          prev.map((item) =>
            item.id === activeAudio.id
              ? { ...item, filename: data.filename, url: data.url, fullUrl: updatedFullUrl }
              : item
          )
        );
      }
    } catch (err) {
      console.warn('Error renaming audio:', err);
    } finally {
      setIsEditingName(false);
    }
  };

  // Health Check / Test Endpoint
  const testUrlHealth = async () => {
    if (!activeAudio) return;
    setHealthStatus({ tested: false, checking: true });

    const startTime = performance.now();
    try {
      const res = await fetch(activeAudio.url, { method: 'HEAD' });
      const latency = Math.round(performance.now() - startTime);

      setHealthStatus({
        tested: true,
        checking: false,
        status: res.status,
        statusText: res.statusText,
        contentType: res.headers.get('content-type') || 'audio/mpeg',
        contentLength: res.headers.get('content-length') || `${activeAudio.size}`,
        acceptRanges: res.headers.get('accept-ranges') || 'bytes',
        latencyMs: latency,
        ok: res.ok,
      });
    } catch (e: any) {
      setHealthStatus({
        tested: true,
        checking: false,
        ok: false,
        statusText: e?.message || 'Error de conexión',
      });
    }
  };

  // Delete audio from server & history
  const handleDeleteAudio = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/audio/file/${id}`, { method: 'DELETE' });
      setHistory((prev) => prev.filter((item) => item.id !== id));
      if (activeAudio?.id === id) {
        const remaining = history.filter((item) => item.id !== id);
        setActiveAudio(remaining[0] || null);
      }
    } catch (err) {
      console.warn('Error deleting audio:', err);
    }
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Format bytes to KB or MB
  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Draw dancing audio visualizer canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;
    const renderWave = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const mid = height / 2;
      const bars = 48;
      const barWidth = width / bars;

      for (let i = 0; i < bars; i++) {
        let barHeight = 6;
        if (isPlaying) {
          const wave = Math.sin(i * 0.25 + phase) * Math.cos(i * 0.15 - phase);
          barHeight = Math.max(6, Math.abs(wave) * (height * 0.75));
        } else {
          barHeight = 6 + (Math.sin(i * 0.4) + 1) * 6;
        }

        const x = i * barWidth;
        const progressFrac = duration > 0 ? currentTime / duration : 0;
        const isPassed = i / bars <= progressFrac;

        ctx.fillStyle = isPassed
          ? isPlaying
            ? '#38BDF8'
            : theme.primary
          : '#262638';

        ctx.beginPath();
        ctx.roundRect(x + 1.5, mid - barHeight / 2, barWidth - 3, barHeight, 2);
        ctx.fill();
      }

      phase += 0.08;
      animFrameRef.current = requestAnimationFrame(renderWave);
    };

    renderWave();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, currentTime, duration]);

  return (
    <div className="w-full h-full min-h-0 flex flex-col bg-[#0B0B11] text-zinc-100 overflow-y-auto font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Hidden Audio Element for actual playback */}
      {activeAudio && (
        <audio
          ref={audioRef}
          src={activeAudio.url}
          loop={isLooping}
          preload="metadata"
        />
      )}

      {/* Top Tool Header Banner */}
      <div className="bg-[#0F121E] border-b border-[#1E2538] px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div
            style={{ backgroundColor: theme.primary, boxShadow: `0 0 15px ${theme.primaryGlow}` }}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
          >
            <Music size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black tracking-tight text-white font-['Outfit']">
                Convertidor MP3 a URL Directa
              </h2>
              <span className="text-[10px] bg-red-950/50 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider font-mono">
                Streaming HTTP 206
              </span>
            </div>
            <p className="text-[11px] text-stone-400 hidden sm:block">
              Convierte archivos de audio locales en enlaces directos permanentes, streaming HTTP 206 y códigos embed.
            </p>
          </div>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-2">
          {(onClose || onBackToEditor) && (
            <button
              onClick={onClose || onBackToEditor}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#161B2C] hover:bg-[#20273E] text-stone-200 border border-[#242C3E] transition-all cursor-pointer active:scale-95"
            >
              <X size={14} className="text-stone-400" />
              <span>Cerrar Herramienta</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* SECTION 1: INPUT METHODS (TABS) */}
        <div className="bg-[#101322] border border-[#1E2538] rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
          {/* Tabs Navigation Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#1E2538]">
            <div className="flex items-center gap-1 sm:gap-1.5 p-1 bg-[#15192A] rounded-xl border border-[#222A3E]">
              <button
                onClick={() => setInputTab('upload')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  inputTab === 'upload'
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-950/40'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#222234]'
                }`}
              >
                <Upload size={14} />
                <span>Subir Archivo</span>
              </button>

              <button
                onClick={() => setInputTab('remote')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  inputTab === 'remote'
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-950/40'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#222234]'
                }`}
              >
                <Globe size={14} />
                <span>Desde Enlace Web</span>
              </button>

              <button
                onClick={() => setInputTab('mic')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  inputTab === 'mic'
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-950/40'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#222234]'
                }`}
              >
                <Mic size={14} />
                <span>Grabar Voz</span>
              </button>

              <button
                onClick={() => setInputTab('presets')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  inputTab === 'presets'
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-950/40'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#222234]'
                }`}
              >
                <Sparkles size={14} />
                <span>Audios de Muestra</span>
              </button>
            </div>

            <span className="text-[11px] text-zinc-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>HTTP 206 Streaming Activo</span>
            </span>
          </div>

          {/* TAB 1: LOCAL FILE UPLOAD */}
          {inputTab === 'upload' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Turbo Mode Selector Banner */}
              <div className="lg:col-span-3 bg-[#14192A] border border-[#222C44] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-2 rounded-xl transition-colors ${
                      uploadMode === 'turbo'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-md shadow-amber-950/30'
                        : 'bg-[#1E263C] text-zinc-400'
                    }`}
                  >
                    <Zap size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                      <span>Acelerador de Subida para Móvil y Redes 4G</span>
                      {uploadMode === 'turbo' && (
                        <span className="bg-gradient-to-r from-amber-500 to-red-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tight shadow-sm">
                          Hasta 10x Más Rápido
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      {uploadMode === 'turbo'
                        ? 'Optimización ultrarrápida en servidor (FFmpeg): reduce el peso y estandariza a MP3 ligero para streaming instantáneo sin saturar tu móvil.'
                        : 'Transfiere el archivo directamente conservando su tasa de bits original.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-[#0E1220] p-1 rounded-xl border border-[#1E263C]">
                  <button
                    type="button"
                    onClick={() => setUploadMode('turbo')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      uploadMode === 'turbo'
                        ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md shadow-red-950/50'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Zap size={13} className={uploadMode === 'turbo' ? 'text-amber-200' : ''} />
                    <span>Modo Turbo (Rápido)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUploadMode('original')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      uploadMode === 'original'
                        ? 'bg-[#222B40] text-zinc-100 shadow-sm border border-[#2E3A56]'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Sliders size={13} />
                    <span>Calidad Original</span>
                  </button>
                </div>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`lg:col-span-2 rounded-2xl border-2 border-dashed p-6 sm:p-8 flex flex-col items-center justify-center text-center transition-all relative overflow-hidden bg-[#121524] ${
                  dragOver
                    ? 'border-red-500 bg-[#161B2C] ring-4 ring-[#9D95FF]/20 scale-[1.005]'
                    : 'border-[#222A3E] hover:border-[#42425E]'
                }`}
              >
                {isUploading && (
                  <div className="absolute inset-0 bg-[#0A0D18]/95 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 space-y-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-4 border-red-500/20 border-t-red-500 animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Zap size={22} className="text-amber-400 animate-pulse" />
                      </div>
                    </div>

                    <div className="text-center space-y-1 max-w-sm">
                      <div className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                        <span>{uploadPhase || 'Procesando audio...'}</span>
                      </div>
                      <h4 className="text-sm sm:text-base font-black text-white truncate max-w-xs mx-auto">
                        {uploadingFileName || 'Archivo de audio'}
                      </h4>
                    </div>

                    {/* Progress Bar with dynamic glow */}
                    <div className="w-full max-w-xs space-y-1.5">
                      <div className="flex justify-between items-center text-[11px] font-mono text-zinc-300">
                        <span>Progreso</span>
                        <span className="font-bold text-red-400">{uploadProgress}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-[#1B2236] rounded-full overflow-hidden p-0.5 border border-[#2A3450]">
                        <div
                          className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-400 rounded-full transition-all duration-200"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>

                    {/* Real-time Telemetry Stats Pill Grid */}
                    <div className="grid grid-cols-3 gap-2 w-full max-w-xs text-center">
                      <div className="bg-[#141A2C] border border-[#222B44] rounded-xl p-2">
                        <span className="text-[10px] text-zinc-400 block">Datos</span>
                        <span className="text-xs font-mono font-bold text-zinc-100 truncate block">
                          {uploadedBytesText || '...'}
                        </span>
                      </div>
                      <div className="bg-[#141A2C] border border-[#222B44] rounded-xl p-2">
                        <span className="text-[10px] text-zinc-400 block">Velocidad</span>
                        <span className="text-xs font-mono font-bold text-amber-400 truncate block">
                          {uploadSpeedText || '⚡ Rápida'}
                        </span>
                      </div>
                      <div className="bg-[#141A2C] border border-[#222B44] rounded-xl p-2">
                        <span className="text-[10px] text-zinc-400 block">Tiempo</span>
                        <span className="text-xs font-mono font-bold text-emerald-400 truncate block">
                          {timeRemainingText || '...'}
                        </span>
                      </div>
                    </div>

                    {/* Turbo savings alert if compressed */}
                    {uploadSavings && uploadSavings.percent > 0 && (
                      <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl px-3 py-1.5 text-[11px] text-emerald-300 flex items-center gap-1.5 max-w-xs">
                        <Zap size={14} className="text-amber-400 shrink-0" />
                        <span>
                          <strong>Modo Turbo:</strong> Reducido de {formatBytes(uploadSavings.originalSize)} a {formatBytes(uploadSavings.compressedSize)} (-{uploadSavings.percent}%)
                        </span>
                      </div>
                    )}

                    {/* Cellular 4G Tip */}
                    <div className="bg-[#101524] border border-[#212C46] rounded-xl px-3 py-2 text-[11px] text-zinc-400 max-w-xs text-left flex items-start gap-2">
                      <Zap size={14} className="text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-zinc-200">Acelerador móvil 4G:</strong> 3 conexiones paralelas activas. Si tu señal es baja, también puedes usar la pestaña <button type="button" onClick={() => { cancelUpload(); setInputTab('remote'); }} className="text-red-400 font-bold underline hover:text-red-300">Importar URL</button> para convertir desde Google Drive o Dropbox al instante sin gastar datos.
                      </span>
                    </div>

                    {/* Cancel button */}
                    <button
                      type="button"
                      onClick={cancelUpload}
                      className="px-4 py-1.5 rounded-lg bg-[#222A3E] hover:bg-[#2D3852] text-zinc-300 hover:text-white text-xs font-semibold transition-colors mt-2"
                    >
                      Cancelar subida
                    </button>
                  </div>
                )}

                <div className="w-16 h-16 rounded-2xl bg-[#141828] border border-[#262F44] flex items-center justify-center mb-3 text-red-400 shadow-inner">
                  <Upload size={30} />
                </div>

                <h3 className="text-base sm:text-lg font-black text-white mb-1">
                  Arrastra y suelta tu archivo MP3 aquí
                </h3>
                <p className="text-xs text-zinc-400 max-w-md mb-4 leading-relaxed">
                  Convierte tu archivo local en un <strong className="text-zinc-200">enlace URL público directo</strong> para compartir en internet, streaming o incrustar en cualquier bot o aplicación.
                </p>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs cursor-pointer shadow-lg shadow-red-950/40 transition-transform active:scale-95">
                    <FileAudio size={16} />
                    <span>Elegir Archivo MP3 / Audio</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.webm"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                <span className="text-[10px] text-zinc-500 mt-4">
                  Formatos soportados: MP3, WAV, M4A, OGG, AAC, FLAC, WebM (Hasta 50 MB)
                </span>
              </div>

              {/* Fast specs panel */}
              <div className="bg-[#121524] border border-[#28283C] rounded-2xl p-4 flex flex-col justify-between space-y-3">
                <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                  <Activity size={14} className="text-[#38BDF8]" />
                  <span>Beneficios de la URL Generada</span>
                </span>
                <ul className="text-xs text-zinc-400 space-y-2 leading-relaxed">
                  <li className="flex items-start gap-1.5">
                    <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Streaming HTTP 206:</strong> Comienza a reproducir al instante sin esperar la descarga completa.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>CORS Abierto:</strong> Acceso permitido desde cualquier dominio web o script.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Sin caducidad forzada:</strong> Enlace estable y persistente en el servidor.</span>
                  </li>
                </ul>
                <div className="pt-2 border-t border-[#1E2538] text-[10px] text-zinc-500">
                  Ideal para bots de Discord, OBS, Roblox, videojuegos y reproductores HTML5.
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IMPORT FROM WEB URL */}
          {inputTab === 'remote' && (
            <div className="bg-[#121524] border border-[#222A3E] rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#201F34] border border-[#343058] flex items-center justify-center text-[#38BDF8] shrink-0">
                  <Globe size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-black text-white">
                      Convertir desde YouTube o Enlace Web a URL Directa
                    </h3>
                    <span className="text-[10px] bg-red-950/60 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-bold">
                      YouTube MP3 320k
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Pega enlaces de <strong>YouTube (Videos, Shorts o Music)</strong>, Google Drive, Dropbox o cualquier URL de audio directa (.mp3, .wav). El servidor extraerá la pista con sonido completo y generará tu URL directa con streaming HTTP 206.
                  </p>
                </div>
              </div>

              {/* Supported services tags */}
              <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-zinc-400">
                <span className="text-zinc-400 font-medium">Compatible:</span>
                <span className="bg-[#181D30] text-red-300 border border-red-900/40 px-2 py-0.5 rounded-md font-semibold">
                  ▶ YouTube / Shorts
                </span>
                <span className="bg-[#181D30] text-sky-300 border border-sky-900/40 px-2 py-0.5 rounded-md font-semibold">
                  📁 Google Drive / Dropbox
                </span>
                <span className="bg-[#181D30] text-emerald-300 border border-emerald-900/40 px-2 py-0.5 rounded-md font-semibold">
                  🎵 Enlaces directos .mp3/.wav
                </span>
              </div>

              <form onSubmit={handleImportRemoteUrl} className="space-y-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                    URL del video de YouTube o archivo de audio:
                  </label>
                  <input
                    type="url"
                    required
                    value={remoteUrlInput}
                    onChange={(e) => setRemoteUrlInput(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... o https://ejemplo.com/audio.mp3"
                    className="w-full bg-[#141828] border border-[#262F44] focus:border-red-500 px-3.5 py-2.5 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 font-mono focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                    Nombre personalizado para el archivo MP3 (Opcional):
                  </label>
                  <input
                    type="text"
                    value={remoteNameInput}
                    onChange={(e) => setRemoteNameInput(e.target.value)}
                    placeholder="mi_cancion_favorita.mp3"
                    className="w-full bg-[#141828] border border-[#262F44] focus:border-red-500 px-3.5 py-2 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none transition-colors"
                  />
                </div>

                {importPhase && isImportingRemote && (
                  <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-700/50 text-sky-300 text-xs flex items-center gap-2.5 animate-pulse">
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-sky-400 border-t-transparent animate-spin shrink-0" />
                    <span className="font-medium">{importPhase}</span>
                  </div>
                )}

                {importError && (
                  <div className="p-3 rounded-xl bg-red-950/60 border border-red-700/60 text-red-300 text-xs flex items-center gap-2">
                    <X size={15} className="shrink-0" />
                    <span>{importError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isImportingRemote || !remoteUrlInput.trim()}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-500 to-sky-500 text-white font-black text-xs shadow-lg shadow-red-950/40 hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {isImportingRemote ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>{importPhase || 'Procesando enlace...'}</span>
                    </>
                  ) : (
                    <>
                      <Link size={14} />
                      <span>Extraer Audio y Generar URL Directa</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: MICROPHONE RECORDER */}
          {inputTab === 'mic' && (
            <div className="bg-[#121524] border border-[#222A3E] rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4">
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                  isRecording
                    ? 'bg-red-500/20 text-red-400 ring-8 ring-red-500/20 animate-pulse'
                    : 'bg-[#141828] border border-[#262F44] text-red-400'
                }`}
              >
                <Mic size={34} />
              </div>

              <div>
                <h3 className="text-base font-black text-white">
                  {isRecording ? 'Grabando Audio en Vivo...' : 'Grabadora de Voz Directa a URL'}
                </h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-md">
                  {isRecording
                    ? `Tiempo grabado: ${formatTime(recordingSeconds)}. Pulsa detener para crear la URL pública de inmediato.`
                    : 'Habla a tu micrófono. Al terminar, se generará una URL con streaming MP3 lista para compartir.'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-lg shadow-red-950/60 transition-transform active:scale-95"
                  >
                    <Mic size={16} />
                    <span>Iniciar Grabación</span>
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 text-white font-black text-xs shadow-lg transition-transform active:scale-95 animate-pulse"
                  >
                    <Square size={16} />
                    <span>Detener y Convertir a URL ({formatTime(recordingSeconds)})</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: SAMPLE TRACKS */}
          {inputTab === 'presets' && (
            <div className="bg-[#121524] border border-[#222A3E] rounded-2xl p-5 space-y-3">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  <Sparkles size={15} className="text-red-400" />
                  <span>Audios de Muestra Sintetizados en Tiempo Real</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  ¿No tienes un MP3 a mano? Haz clic en cualquiera de estos estilos para sintetizar una pista y obtener su URL al instante:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                <button
                  onClick={() => generateSampleAudio('synthwave')}
                  disabled={isUploading}
                  className="p-3.5 rounded-xl bg-[#1C1C2C] hover:bg-[#25253C] border border-[#303048] text-left transition-all flex flex-col gap-1 disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#38BDF8]">Synthwave 80s</span>
                    <Radio size={14} className="text-[#38BDF8]" />
                  </div>
                  <span className="text-[11px] text-zinc-400">Arpeggio retro analógico</span>
                </button>

                <button
                  onClick={() => generateSampleAudio('cyberpunk')}
                  disabled={isUploading}
                  className="p-3.5 rounded-xl bg-[#1C1C2C] hover:bg-[#25253C] border border-[#303048] text-left transition-all flex flex-col gap-1 disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-red-400">Cyberpunk Beat</span>
                    <Activity size={14} className="text-red-400" />
                  </div>
                  <span className="text-[11px] text-zinc-400">Glow distorsión rítmica</span>
                </button>

                <button
                  onClick={() => generateSampleAudio('lofi')}
                  disabled={isUploading}
                  className="p-3.5 rounded-xl bg-[#1C1C2C] hover:bg-[#25253C] border border-[#303048] text-left transition-all flex flex-col gap-1 disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-400">Lofi Chill</span>
                    <Music size={14} className="text-amber-400" />
                  </div>
                  <span className="text-[11px] text-zinc-400">Acordes cálidos relajantes</span>
                </button>

                <button
                  onClick={() => generateSampleAudio('sfx')}
                  disabled={isUploading}
                  className="p-3.5 rounded-xl bg-[#1C1C2C] hover:bg-[#25253C] border border-[#303048] text-left transition-all flex flex-col gap-1 disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-400">Laser SFX</span>
                    <Sparkles size={14} className="text-emerald-400" />
                  </div>
                  <span className="text-[11px] text-zinc-400">Efecto de sonido futurista</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: CONVERTED AUDIO RESULT & PLAYER (WHEN ACTIVE) */}
        {activeAudio ? (
          <div className="bg-[#141420] border border-[#2B2B3E] rounded-2xl p-5 sm:p-6 space-y-6 shadow-2xl">
            {/* Header info with Inline Rename */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#252536]">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-12 h-12 rounded-xl bg-[#151928] border border-[#39345D] flex items-center justify-center text-red-400 shrink-0 shadow-inner">
                  <Music size={24} />
                </div>
                <div className="min-w-0 flex-1">
                  {isEditingName ? (
                    <div className="flex items-center gap-2 max-w-md">
                      <input
                        type="text"
                        value={newFilenameInput}
                        onChange={(e) => setNewFilenameInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveNewName();
                          if (e.key === 'Escape') setIsEditingName(false);
                        }}
                        autoFocus
                        className="flex-1 bg-[#141828] border border-red-500 px-2.5 py-1 rounded-lg text-sm text-white font-bold focus:outline-none"
                        placeholder="nombre_de_archivo.mp3"
                      />
                      <button
                        onClick={handleSaveNewName}
                        className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold hover:bg-red-500 transition-colors"
                        title="Guardar nuevo nombre"
                      >
                        <Save size={14} />
                      </button>
                      <button
                        onClick={() => setIsEditingName(false)}
                        className="p-1.5 bg-[#252538] text-zinc-300 rounded-lg hover:bg-[#32324A] transition-colors"
                        title="Cancelar"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-black text-white truncate max-w-[280px] sm:max-w-md">
                        {activeAudio.filename}
                      </h2>
                      <button
                        onClick={handleStartEditing}
                        className="p-1 text-zinc-400 hover:text-red-400 hover:bg-[#222232] rounded-md transition-colors"
                        title="Renombrar archivo (cambia la URL)"
                      >
                        <Edit2 size={13} />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono mt-0.5">
                    <span>{formatBytes(activeAudio.size)}</span>
                    <span>•</span>
                    <span>{activeAudio.mimeType}</span>
                    {activeAudio.duration ? (
                      <>
                        <span>•</span>
                        <span>{formatTime(activeAudio.duration)}</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2 self-start sm:self-center">
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-950/60 border border-emerald-700/60 text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>URL Activa & Streaming Online</span>
                </span>
              </div>
            </div>

            {/* AUDIO PLAYER & WAVEFORM VISUALIZER */}
            <div className="bg-[#0E0E16] border border-[#232334] rounded-xl p-4 space-y-3">
              {/* Waveform Canvas */}
              <div className="relative w-full h-14 bg-[#12121D] rounded-lg overflow-hidden flex items-center px-2">
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={56}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Scrubber slider */}
              <div className="space-y-1">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  step="0.05"
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-[#252538] rounded-lg appearance-none cursor-pointer accent-[#9D95FF]"
                />
                <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Playback Controls Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                {/* Left: Play/Pause, Rewind, Loop */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePlay}
                    className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-600 text-white flex items-center justify-center font-bold shadow-md hover:brightness-110 active:scale-95 transition-all"
                    title={isPlaying ? 'Pausar' : 'Reproducir'}
                  >
                    {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                  </button>

                  <button
                    onClick={() => {
                      if (audioRef.current) audioRef.current.currentTime = 0;
                    }}
                    className="w-8 h-8 rounded-lg bg-[#161B2C] hover:bg-[#252538] border border-[#2E2E42] text-zinc-300 flex items-center justify-center transition-colors"
                    title="Reiniciar"
                  >
                    <RotateCcw size={14} />
                  </button>

                  <button
                    onClick={() => setIsLooping(!isLooping)}
                    className={`px-2 py-1 rounded-lg text-xs font-bold border transition-colors ${
                      isLooping
                        ? 'bg-[#2B2352] text-red-400 border-[#53468E]'
                        : 'bg-[#161B2C] text-zinc-400 border-[#2E2E42] hover:text-zinc-200'
                    }`}
                    title="Repetir en bucle"
                  >
                    Bucle
                  </button>

                  {/* Playback Speed selector */}
                  <div className="flex items-center gap-1 bg-[#161B2C] p-0.5 rounded-lg border border-[#2E2E42]">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSpeedChange(s)}
                        className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded ${
                          playbackRate === s
                            ? 'bg-red-600 hover:bg-red-500 text-white'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right: Volume & Download */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={toggleMute}
                      className="text-zinc-400 hover:text-zinc-200 transition-colors"
                      title="Silenciar / Activar sonido"
                    >
                      {isMuted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-20 h-1 bg-[#252538] rounded appearance-none cursor-pointer accent-[#9D95FF]"
                    />
                  </div>

                  <a
                    href={activeAudio.url}
                    download={activeAudio.filename}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1F1F2E] hover:bg-[#2A2A3E] border border-[#262F44] text-zinc-200 text-xs font-bold transition-colors"
                    title="Descargar archivo MP3"
                  >
                    <Download size={13} />
                    <span>Descargar MP3</span>
                  </a>
                </div>
              </div>
            </div>

            {/* GENERATED URLS & EMBED CODES */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Link size={14} className="text-[#38BDF8]" />
                  <span>Formatos de URL Generados (Haz Clic Para Copiar)</span>
                </h3>

                <button
                  onClick={() => setShowUsageGuide(!showUsageGuide)}
                  className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                >
                  <HelpCircle size={13} />
                  <span>{showUsageGuide ? 'Ocultar Guía' : '¿Cómo usar este enlace?'}</span>
                </button>
              </div>

              {/* Collapsible Usage Guide */}
              {showUsageGuide && (
                <div className="bg-[#101322] border border-[#2D2D42] rounded-xl p-4 space-y-3 text-xs text-zinc-300">
                  <h4 className="font-bold text-white flex items-center gap-1.5">
                    <Share2 size={14} className="text-[#38BDF8]" />
                    <span>Guía rápida: ¿Dónde y cómo utilizar tu URL directa de MP3?</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-zinc-400">
                    <div className="bg-[#171724] p-3 rounded-lg border border-[#262638]">
                      <span className="font-bold text-white block mb-1">🤖 Discord & Bots de Música</span>
                      <p>Pega la URL directa en cualquier canal o chat. Discord mostrará el reproductor nativo directamente en el mensaje sin requerir descargas.</p>
                    </div>
                    <div className="bg-[#171724] p-3 rounded-lg border border-[#262638]">
                      <span className="font-bold text-white block mb-1">🎥 OBS Studio & Streaming</span>
                      <p>Agrega una fuente de tipo "Navegador" o "Fuente multimedia" desactivando archivo local e ingresando esta URL directa.</p>
                    </div>
                    <div className="bg-[#171724] p-3 rounded-lg border border-[#262638]">
                      <span className="font-bold text-white block mb-1">🌐 Sitios Web & HTML5</span>
                      <p>Copia el código embed de la etiqueta &lt;audio&gt; o utilízalo en WordPress, Notion, Webflow o Wix como audio externo.</p>
                    </div>
                    <div className="bg-[#171724] p-3 rounded-lg border border-[#262638]">
                      <span className="font-bold text-white block mb-1">🎮 Videojuegos & Roblox</span>
                      <p>Soporta peticiones HTTP GET y streaming instantáneo HTTP 206 para motores que cargan sonido desde la nube.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 1. Public Direct Streaming URL */}
              <div className="bg-[#101018] border border-[#27273A] rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-zinc-200">
                      1. URL Pública Directa (Direct Streaming Link)
                    </span>
                    <span className="text-[10px] bg-[#172554] text-[#60A5FA] border border-[#1E3A8A] px-1.5 py-0.5 rounded font-bold">
                      Recomendado
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400">Para Discord, bots, webs, juegos y reproductores</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={activeAudio.fullUrl}
                    className="flex-1 bg-[#181824] border border-[#2F2F44] px-3 py-2 rounded-lg text-xs font-mono text-[#38BDF8] select-all focus:outline-none"
                  />
                  <button
                    onClick={() => copyToClipboard(activeAudio.fullUrl, 'fullUrl')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
                      copiedKey === 'fullUrl'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-red-600 hover:bg-red-500 hover:bg-red-500 text-white'
                    }`}
                  >
                    {copiedKey === 'fullUrl' ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedKey === 'fullUrl' ? '¡Copiado!' : 'Copiar URL'}</span>
                  </button>

                  <a
                    href={activeAudio.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-[#1F1F2E] hover:bg-[#2A2A3E] border border-[#333348] text-zinc-300 transition-colors shrink-0"
                    title="Abrir URL en pestaña nueva"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>

              {/* Grid with 6 formats: HTML5, JS, Markdown, BBCode, Data URL and QR */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 2. HTML Embed Audio Tag */}
                <div className="bg-[#101018] border border-[#27273A] rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-300 flex items-center gap-1">
                      <Code size={13} className="text-red-400" />
                      <span>Reproductor HTML5 (&lt;audio&gt;)</span>
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `<audio controls src="${activeAudio.fullUrl}" preload="metadata"></audio>`,
                          'htmlEmbed'
                        )
                      }
                      className="text-[11px] text-red-400 hover:text-red-300 font-bold flex items-center gap-1"
                    >
                      {copiedKey === 'htmlEmbed' ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedKey === 'htmlEmbed' ? '¡Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                  <div className="bg-[#161622] p-2 rounded-lg border border-[#29293C] text-[11px] font-mono text-zinc-300 break-all select-all">
                    {`<audio controls src="${activeAudio.fullUrl}" preload="metadata"></audio>`}
                  </div>
                </div>

                {/* 3. JavaScript / Web Audio Code */}
                <div className="bg-[#101018] border border-[#27273A] rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-300 flex items-center gap-1">
                      <Terminal size={13} className="text-emerald-400" />
                      <span>Código JavaScript (Audio API)</span>
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `const sound = new Audio('${activeAudio.fullUrl}');\nsound.play();`,
                          'jsCode'
                        )
                      }
                      className="text-[11px] text-red-400 hover:text-red-300 font-bold flex items-center gap-1"
                    >
                      {copiedKey === 'jsCode' ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedKey === 'jsCode' ? '¡Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                  <div className="bg-[#161622] p-2 rounded-lg border border-[#29293C] text-[11px] font-mono text-zinc-300 break-all select-all">
                    {`const sound = new Audio('${activeAudio.fullUrl}'); sound.play();`}
                  </div>
                </div>

                {/* 4. Markdown Link */}
                <div className="bg-[#101018] border border-[#27273A] rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-300 flex items-center gap-1">
                      <FileAudio size={13} className="text-amber-400" />
                      <span>Enlace Markdown (GitHub / Docs)</span>
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `[🎧 Escuchar ${activeAudio.filename}](${activeAudio.fullUrl})`,
                          'markdown'
                        )
                      }
                      className="text-[11px] text-red-400 hover:text-red-300 font-bold flex items-center gap-1"
                    >
                      {copiedKey === 'markdown' ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedKey === 'markdown' ? '¡Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                  <div className="bg-[#161622] p-2 rounded-lg border border-[#29293C] text-[11px] font-mono text-zinc-300 break-all select-all">
                    {`[🎧 Escuchar ${activeAudio.filename}](${activeAudio.fullUrl})`}
                  </div>
                </div>

                {/* 5. BBCode for Forums */}
                <div className="bg-[#101018] border border-[#27273A] rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-300 flex items-center gap-1">
                      <MessageSquare size={13} className="text-[#38BDF8]" />
                      <span>BBCode (Foros y Comunidades)</span>
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `[audio]${activeAudio.fullUrl}[/audio]`,
                          'bbcode'
                        )
                      }
                      className="text-[11px] text-red-400 hover:text-red-300 font-bold flex items-center gap-1"
                    >
                      {copiedKey === 'bbcode' ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedKey === 'bbcode' ? '¡Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                  <div className="bg-[#161622] p-2 rounded-lg border border-[#29293C] text-[11px] font-mono text-zinc-300 break-all select-all">
                    {`[audio]${activeAudio.fullUrl}[/audio]`}
                  </div>
                </div>

                {/* 6. Data URL (Base64) */}
                <div className="bg-[#101018] border border-[#27273A] rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-300 flex items-center gap-1">
                      <ShieldCheck size={13} className="text-purple-400" />
                      <span>Data URL (Base64 Autónomo)</span>
                    </span>
                    <button
                      onClick={handleCopyBase64}
                      disabled={isGeneratingBase64}
                      className="text-[11px] text-red-400 hover:text-red-300 font-bold flex items-center gap-1 disabled:opacity-50"
                    >
                      {copiedKey === 'dataUrl' ? (
                        <>
                          <Check size={12} />
                          <span>¡Copiado!</span>
                        </>
                      ) : isGeneratingBase64 ? (
                        <span>Generando...</span>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>{activeAudio.dataUrl ? 'Copiar' : 'Generar y Copiar'}</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="bg-[#161622] p-2 rounded-lg border border-[#29293C] text-[10px] font-mono text-zinc-400 truncate">
                    {activeAudio.dataUrl
                      ? `${activeAudio.dataUrl.slice(0, 60)}... (${formatBytes(activeAudio.size)})`
                      : 'Embebible en CSS o JS (se genera bajo demanda para máxima velocidad de subida).'}
                  </div>
                </div>

                {/* 7. QR Code for Mobile Scanning */}
                <div className="bg-[#101018] border border-[#27273A] rounded-xl p-3 flex items-center gap-3">
                  <div className="w-16 h-16 bg-white p-1 rounded-lg shrink-0 flex items-center justify-center shadow">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                        activeAudio.fullUrl
                      )}`}
                      alt="QR Code"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-zinc-200 block flex items-center gap-1">
                      <QrCode size={13} className="text-[#38BDF8]" />
                      <span>Escanear con Celular</span>
                    </span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5 leading-tight">
                      Apunta la cámara de tu teléfono para escuchar o descargar este MP3 directamente.
                    </span>
                  </div>
                </div>
              </div>

              {/* HEALTH CHECK & STREAM VERIFIER */}
              <div className="bg-[#101322] border border-[#1E2538] rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Activity size={14} className="text-emerald-400" />
                    <span className="text-xs font-bold text-zinc-200">
                      Verificador de Conexión & Transmisión en Streaming
                    </span>
                  </div>
                  <button
                    onClick={testUrlHealth}
                    disabled={healthStatus.checking}
                    className="px-3 py-1 bg-[#1F1F30] hover:bg-[#2B2B42] border border-[#35354E] text-zinc-200 text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {healthStatus.checking ? 'Comprobando...' : 'Verificar Enlace Ahora'}
                  </button>
                </div>

                {healthStatus.tested ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div className="bg-[#0D0D14] p-2 rounded-lg border border-[#1F1F2E]">
                      <span className="text-[10px] text-zinc-500 block">Código HTTP</span>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {healthStatus.status || 200} OK
                      </span>
                    </div>
                    <div className="bg-[#0D0D14] p-2 rounded-lg border border-[#1F1F2E]">
                      <span className="text-[10px] text-zinc-500 block">Content-Type</span>
                      <span className="text-xs font-mono font-bold text-zinc-200 truncate block">
                        {healthStatus.contentType || 'audio/mpeg'}
                      </span>
                    </div>
                    <div className="bg-[#0D0D14] p-2 rounded-lg border border-[#1F1F2E]">
                      <span className="text-[10px] text-zinc-500 block">Byte-Ranges</span>
                      <span className="text-xs font-mono font-bold text-[#38BDF8]">
                        {healthStatus.acceptRanges || 'bytes (206)'}
                      </span>
                    </div>
                    <div className="bg-[#0D0D14] p-2 rounded-lg border border-[#1F1F2E]">
                      <span className="text-[10px] text-zinc-500 block">Latencia / Ping</span>
                      <span className="text-xs font-mono font-bold text-red-400">
                        {healthStatus.latencyMs || 12} ms
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-500">
                    Comprueba que la URL responde instantáneamente a peticiones HEAD, con cabeceras de rango parcial HTTP 206 y soporte de audio HTML5.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* SECTION 3: CONVERSION HISTORY & STORED MP3S */}
        {history.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-zinc-400" />
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Historial de Audios Convertidos ({history.length})
                </h3>
              </div>

              {/* Filter / Search input */}
              <div className="relative w-full sm:w-60">
                <Search size={13} className="absolute left-2.5 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Buscar audio..."
                  className="w-full bg-[#13131C] border border-[#272738] rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {history
                .filter((item) =>
                  historySearch
                    ? item.filename.toLowerCase().includes(historySearch.toLowerCase())
                    : true
                )
                .map((item) => {
                  const isCurrent = activeAudio?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setActiveAudio(item);
                        setHealthStatus({ tested: false, checking: false });
                      }}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-2.5 ${
                        isCurrent
                          ? 'bg-[#1D1B2E] border-red-500 ring-1 ring-[#9D95FF]/50 shadow-lg'
                          : 'bg-[#13131C] border-[#252536] hover:border-[#38384E] hover:bg-[#181824]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isCurrent
                                ? 'bg-red-600 hover:bg-red-500 text-white'
                                : 'bg-[#222232] text-zinc-300'
                            }`}
                          >
                            <Music size={15} />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-zinc-100 block truncate">
                              {item.filename}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              {formatBytes(item.size)}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={(e) => handleDeleteAudio(item.id, e)}
                          className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-[#252536] transition-colors"
                          title="Eliminar este audio"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {/* Quick URL snippet & copy */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#222230]">
                        <span className="text-[10px] font-mono text-[#38BDF8] truncate">
                          {item.url}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(item.fullUrl, item.id);
                          }}
                          className="px-2 py-1 bg-[#222234] hover:bg-[#2E2E44] text-zinc-200 text-[10px] font-bold rounded flex items-center gap-1 transition-colors shrink-0"
                        >
                          {copiedKey === item.id ? <Check size={11} /> : <Copy size={11} />}
                          <span>{copiedKey === item.id ? 'Copiado' : 'Copiar URL'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
