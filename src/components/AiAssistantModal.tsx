import React, { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import { useLanguage } from '../context/LanguageContext';
import {
  Sparkles,
  X,
  Send,
  Mic,
  MicOff,
  Paperclip,
  Download,
  ExternalLink,
  Volume2,
  VolumeX,
  CheckCircle2,
  Loader2,
  Trash2,
  ArrowRight,
  Sliders,
  Image as ImageIcon
} from 'lucide-react';
import { AikoHamsterLogo } from './AikoHamsterLogo';
import {
  removeImageBackground,
  convertUniversalFormat,
  applyEnhancedFilters,
  generateMemeImage,
  extractImagePalette,
  dataUrlToBlob
} from '../utils/mediaEngine';
import { saveToHistory } from '../utils/historyStorage';
import { notifyUser, playSuccessChime } from '../utils/notifications';

interface AiMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: number;
  result?: {
    blob: Blob;
    url: string;
    fileName: string;
    newSize: number;
    originalSize: number;
    width?: number;
    height?: number;
    format: string;
    extraInfo?: string;
  };
  attachedFile?: {
    name: string;
    previewUrl: string;
    size: number;
  };
}

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFile?: File | null;
  onSelectResultForWorkspace?: (file: File, toolId: string) => void;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  initialFile,
  onSelectResultForWorkspace
}) => {
  const { t, currentLanguageOption } = useLanguage();
  const [messages, setMessages] = useState<AiMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: t('ai.welcomeMessage', '¡Hola! Soy Aiko, tu asistente multimedia autónomo. Puedes subir cualquier archivo y decirme lo que quieres (por ejemplo: "elimina el fondo", "conviértelo a WebP" o "aplica un filtro cyberpunk"). Yo lo procesaré de inmediato.'),
      timestamp: Date.now()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(initialFile || null);
  const [attachedFilePreview, setAttachedFilePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Sync initial file when modal opens
  useEffect(() => {
    if (initialFile && isOpen) {
      setAttachedFile(initialFile);
      const url = URL.createObjectURL(initialFile);
      setAttachedFilePreview(url);
    }
  }, [initialFile, isOpen]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages, isProcessing, isOpen]);

  // Speech Recognition setup (Web Speech API)
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = currentLanguageOption.speechCode || 'es-ES';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
        // Automatically send after voice capture if there's text
        if (transcript.trim()) {
          handleSendMessage(transcript.trim());
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [currentLanguageOption]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('El reconocimiento de voz no está soportado en este navegador. Puedes escribir tu instrucción.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.lang = currentLanguageOption.speechCode || 'es-ES';
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Speech recognition error:', err);
      }
    }
  };

  const speakText = (text: string) => {
    if (!ttsEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = currentLanguageOption.speechCode || 'es-ES';
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      setAttachedFile(file);
      const url = URL.createObjectURL(file);
      setAttachedFilePreview(url);
    }
  };

  const handleClearAttached = () => {
    if (attachedFilePreview) {
      URL.revokeObjectURL(attachedFilePreview);
    }
    setAttachedFile(null);
    setAttachedFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Autonomous execution of requested tool
  const executeAutonomousAction = async (action: any, file?: File, promptText?: string) => {
    let result: any = null;
    let toolName = 'Proceso IA';

    switch (action.type) {
      case 'generate_image': {
        toolName = 'Generador de Imágenes IA';
        const imgPrompt = action.params?.prompt || promptText || 'Arte conceptual';
        const style = action.params?.style || 'vibrant';
        const aspectRatio = action.params?.aspectRatio || '1:1';

        const genRes = await fetch('/api/gemini/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: imgPrompt,
            style,
            aspectRatio,
            outputFormat: 'webp'
          })
        });

        const genData = await genRes.json();
        if (genData.imageUrl) {
          let blob: Blob;
          if (genData.imageUrl.startsWith('data:')) {
            blob = dataUrlToBlob(genData.imageUrl);
          } else {
            const blobRes = await fetch(genData.imageUrl);
            blob = await blobRes.blob();
          }
          const fileName = `aiko_ia_${Date.now()}.webp`;

          result = {
            blob,
            url: genData.imageUrl,
            fileName,
            newSize: blob.size || 45000,
            originalSize: 0,
            width: aspectRatio === '16:9' ? 1280 : 1024,
            height: aspectRatio === '16:9' ? 720 : 1024,
            format: 'WEBP (IA)',
            timeTakenMs: 150,
            extraInfo: `Generado por Gemini AI: "${imgPrompt}"`
          };
        }
        break;
      }
      case 'remove_background': {
        if (!file) break;
        toolName = 'Eliminar Fondo';
        result = await removeImageBackground(file, {
          tolerance: action.params?.tolerance ?? 28,
          feather: action.params?.feather ?? 2,
          mode: action.params?.mode ?? 'flood'
        });
        break;
      }
      case 'convert': {
        if (!file) break;
        const fmt = action.params?.targetFormat || 'webp';
        toolName = `Conversión ${fmt.toUpperCase()}`;
        result = await convertUniversalFormat(file, {
          targetFormat: fmt,
          quality: action.params?.quality ?? 0.85
        });
        break;
      }
      case 'effects': {
        if (!file) break;
        const preset = action.params?.preset || 'cyberpunk';
        toolName = `Filtro ${preset.toUpperCase()}`;
        result = await applyEnhancedFilters(file, {
          preset: preset,
          brightness: action.params?.brightness ?? 100,
          contrast: action.params?.contrast ?? 120,
          saturation: action.params?.saturation ?? 120
        });
        break;
      }
      case 'compress': {
        if (!file) break;
        toolName = 'Compresor Inteligente';
        result = await convertUniversalFormat(file, {
          targetFormat: 'webp',
          quality: action.params?.quality ?? 0.65
        });
        break;
      }
      case 'meme': {
        if (!file) break;
        toolName = 'Generador de Memes';
        const topText = action.params?.topText || 'CUANDO USAS AIKOTOOLS';
        const bottomText = action.params?.bottomText || 'Y TODO ES 100% LOCAL';
        result = await generateMemeImage(file, topText, bottomText, 0.08, '#FFFFFF');
        break;
      }
      case 'palette': {
        if (!file) break;
        toolName = 'Paleta de Colores';
        const palRes = await extractImagePalette(file, 6);
        result = {
          blob: palRes.paletteImageBlob,
          url: palRes.paletteImageUrl,
          fileName: `aiko_paleta_${file.name.substring(0, file.name.lastIndexOf('.')) || 'img'}.png`,
          newSize: palRes.paletteImageBlob.size,
          originalSize: file.size,
          width: 600,
          height: 180,
          format: 'PNG',
          timeTakenMs: 30,
          extraInfo: `Dominante: ${palRes.dominant} | Paleta: ${palRes.palette.map((p) => p.hex).join(', ')}`
        };
        break;
      }
      default: {
        if (file) {
          result = await convertUniversalFormat(file, { targetFormat: 'webp', quality: 0.85 });
        }
      }
    }

    if (result && result.blob) {
      // Save to local history
      await saveToHistory(
        {
          blob: result.blob,
          url: result.url,
          fileName: result.fileName,
          newSize: result.newSize,
          originalSize: result.originalSize || (file ? file.size : 0),
          width: result.width,
          height: result.height,
          format: result.format || 'WEBP',
          timeTakenMs: result.timeTakenMs || 50
        },
        toolName
      );

      // Trigger chime and notification toast
      playSuccessChime();
      notifyUser({
        title: `¡${toolName} completado por IA!`,
        body: `Archivo listo: ${result.fileName} (${Math.round(result.newSize / 1024)} KB)`,
        previewUrl: result.url
      });
    }

    return result;
  };

  const handleChainTransformOnResult = async (res: any, actionType: string) => {
    if (!res?.blob) return;
    const generatedFile = new File([res.blob], res.fileName, { type: res.blob.type || 'image/png' });
    let action: any = null;
    let desc = '';

    if (actionType === 'remove_bg') {
      action = { type: 'remove_background', toolId: 'bg-remover', params: { tolerance: 28, feather: 2, mode: 'flood' } };
      desc = 'Eliminar fondo transparente';
    } else if (actionType === 'cyberpunk') {
      action = { type: 'effects', toolId: 'effects-tools', params: { preset: 'cyberpunk', brightness: 100, contrast: 120, saturation: 130 } };
      desc = 'Filtro Cyberpunk';
    } else if (actionType === 'palette') {
      action = { type: 'palette', toolId: 'palette-tools', params: { count: 6 } };
      desc = 'Extracción de paleta';
    }

    if (action) {
      setIsProcessing(true);
      try {
        const chainedResult = await executeAutonomousAction(action, generatedFile);
        if (chainedResult) {
          setMessages((prev) => [
            ...prev,
            {
              id: 'ai-chain-' + Date.now(),
              sender: 'ai',
              text: `✨ **${desc} aplicado a la imagen:**`,
              timestamp: Date.now(),
              result: chainedResult
            }
          ]);
        }
      } catch (e) {
        console.error('Error in chain transform:', e);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!prompt && !attachedFile) return;

    const currentAttached = attachedFile;
    const currentPreview = attachedFilePreview;

    // Add user message to state
    const userMsg: AiMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: prompt || 'Procesa este archivo adjunto.',
      timestamp: Date.now(),
      attachedFile: currentAttached
        ? {
            name: currentAttached.name,
            previewUrl: currentPreview || '',
            size: currentAttached.size
          }
        : undefined
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsProcessing(true);

    try {
      // If image is attached, convert small preview to base64 for multimodal vision reasoning
      let base64Image: string | undefined = undefined;
      if (currentAttached && currentAttached.type.startsWith('image/')) {
        try {
          base64Image = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Error al leer imagen'));
            reader.readAsDataURL(currentAttached);
          });
        } catch {
          // ignore if read fails
        }
      }

      // Call backend Gemini AI assistant endpoint
      const response = await fetch('/api/gemini/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          hasFile: !!currentAttached,
          fileName: currentAttached?.name,
          fileType: currentAttached?.type,
          base64Image: base64Image?.length && base64Image.length < 4000000 ? base64Image : undefined
        })
      });

      let aiData: any = null;
      if (response.ok) {
        aiData = await response.json();
      } else {
        // Offline heuristic fallback
        aiData = {
          reply: 'He entendido tu petición y procedo a procesar tu solicitud de inmediato.',
          action: prompt.toLowerCase().includes('fondo')
            ? { type: 'remove_background', toolId: 'remove-bg', params: {} }
            : prompt.toLowerCase().includes('imagen') || prompt.toLowerCase().includes('genera')
            ? { type: 'generate_image', toolId: 'ai-image-generator', params: { prompt } }
            : { type: 'convert', toolId: 'universal-converter', params: { targetFormat: 'webp' } }
        };
      }

      let executionResult: any = null;

      // If action is generate_image or file is attached
      if (aiData.action?.type === 'generate_image') {
        try {
          executionResult = await executeAutonomousAction(aiData.action, undefined, prompt);
        } catch (execErr) {
          console.error('AI image generation error:', execErr);
          aiData.reply += ' (Hubo un problema al generar la imagen).';
        }
      } else if (currentAttached && aiData.action) {
        try {
          executionResult = await executeAutonomousAction(aiData.action, currentAttached, prompt);
        } catch (execErr) {
          console.error('Execution error:', execErr);
          aiData.reply += ' (Hubo un detalle en el procesamiento local, verifica el formato de la imagen).';
        }
      } else if (!currentAttached && aiData.action) {
        aiData.reply += ' Por favor, adjunta o arrastra la imagen que deseas que procese con el botón del clip 📎.';
      }

      // Add AI response message
      const aiMsg: AiMessage = {
        id: 'ai-' + Date.now(),
        sender: 'ai',
        text: aiData.reply,
        timestamp: Date.now(),
        result: executionResult
          ? {
              blob: executionResult.blob,
              url: executionResult.url,
              fileName: executionResult.fileName,
              newSize: executionResult.newSize,
              originalSize: executionResult.originalSize,
              width: executionResult.width,
              height: executionResult.height,
              format: executionResult.format,
              extraInfo: executionResult.extraInfo
            }
          : undefined
      };

      setMessages((prev) => [...prev, aiMsg]);
      speakText(aiData.reply);
    } catch (err) {
      console.error('Assistant error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          sender: 'ai',
          text: 'He procesado tu comando. Puedes pedirme información técnica o generar imágenes.',
          timestamp: Date.now()
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenInEditor = (result: any) => {
    if (onSelectResultForWorkspace && result.blob) {
      const newFile = new File([result.blob], result.fileName, { type: result.blob.type });
      onSelectResultForWorkspace(newFile, 'universal-converter');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-lg bg-[#0D0F16] border border-[#242A3E] rounded-3xl text-white flex flex-col h-[90vh] max-h-[700px] shadow-[0_20px_60px_rgba(0,0,0,0.9)] z-10 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-4.5 border-b border-[#242A3E] flex items-center justify-between bg-[#121522]">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="h-10 w-10 rounded-2xl bg-[#10B981]/20 border border-[#10B981]/40 flex items-center justify-center text-[#10B981] shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <AikoHamsterLogo size={28} showText={false} color="#FFFFFF" accentColor="#10B981" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#10B981]"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white font-['Syne']">
                  {t('ai.title', 'Asistente IA Multimedia')}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30">
                  {t('ai.autonomous', 'AUTÓNOMO')}
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                {t('ai.subtitle', 'Pide en lenguaje natural y la IA ejecutará la herramienta por ti.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setTtsEnabled(!ttsEnabled)}
              className={`p-2 rounded-xl border transition-colors ${
                ttsEnabled
                  ? 'bg-[#10B981]/20 border-[#10B981]/40 text-[#10B981]'
                  : 'bg-[#181D2A] border-[#262C3E] text-stone-400'
              }`}
              title={ttsEnabled ? t('ai.voiceEnabled', 'Voz activada') : t('ai.voiceDisabled', 'Voz desactivada')}
            >
              {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>

            <button
              onClick={() => setMessages([messages[0]])}
              className="p-2 rounded-xl bg-[#181D2A] border border-[#262C3E] text-stone-400 hover:text-white transition-colors"
              title={t('ai.clearChat', 'Limpiar chat')}
            >
              <Trash2 className="h-4 w-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-[#1E2536] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Chat Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 divide-y divide-transparent">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-[#10B981] text-black font-semibold rounded-br-none shadow-[0_4px_20px_rgba(16,185,129,0.3)]'
                    : 'bg-[#161B29] border border-[#262C3E] text-stone-200 rounded-bl-none shadow-md'
                }`}
              >
                {/* Attached File Preview if present */}
                {m.attachedFile && (
                  <div className="mb-2 p-2 rounded-xl bg-black/40 border border-black/20 flex items-center gap-2">
                    {m.attachedFile.previewUrl && (
                      <img
                        src={m.attachedFile.previewUrl}
                        alt="Adjunto"
                        className="h-10 w-10 rounded-lg object-contain bg-black/50"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-white truncate">
                        {m.attachedFile.name}
                      </p>
                      <p className="text-[9px] text-stone-300 font-mono">
                        {Math.round(m.attachedFile.size / 1024)} KB
                      </p>
                    </div>
                  </div>
                )}

                {m.sender === 'user' ? (
                  <p className="whitespace-pre-wrap">{m.text}</p>
                ) : (
                  <div className="markdown-content text-xs leading-relaxed space-y-1.5 [&>p]:mb-1.5 [&>ul]:list-disc [&>ul]:pl-4 [&>ul]:space-y-1 [&>ol]:list-decimal [&>ol]:pl-4 [&>h3]:text-sm [&>h3]:font-bold [&>h3]:text-[#34D399] [&>strong]:text-white">
                    <Markdown>{m.text}</Markdown>
                  </div>
                )}

                {/* Autonomous Result Card */}
                {m.result && (
                  <div className="mt-3 p-3 rounded-xl bg-[#0F121C] border border-[#10B981]/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#10B981]/20 text-[#34D399] font-bold text-[10px] border border-[#10B981]/30">
                        <CheckCircle2 className="h-3 w-3" />
                        {m.result.format} {t('ai.processed', 'PROCESADO')}
                      </span>
                      <span className="text-[10px] font-mono text-stone-400">
                        {Math.round(m.result.newSize / 1024)} KB
                        {m.result.width && ` • ${m.result.width}x${m.result.height}px`}
                      </span>
                    </div>

                    {/* Result image thumbnail */}
                    <div className="relative rounded-lg overflow-hidden border border-[#262C3E] bg-black/60 flex items-center justify-center max-h-48">
                      <img
                        src={m.result.url}
                        alt={m.result.fileName}
                        className="max-h-44 w-auto object-contain"
                      />
                    </div>

                    {m.result.extraInfo && (
                      <p className="text-[10px] text-stone-400 font-mono bg-black/40 p-1.5 rounded-md border border-[#222838]">
                        {m.result.extraInfo}
                      </p>
                    )}

                    {/* Chained Action Shortcuts for Generated Images */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#1C2234]">
                      <span className="text-[10px] text-stone-400 font-semibold">{t('ai.transform', 'Transformar:')}</span>
                      <button
                        type="button"
                        onClick={() => handleChainTransformOnResult(m.result, 'remove_bg')}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#1A2234] hover:bg-[#25314C] text-[#34D399] border border-[#2B3A5A] transition-colors flex items-center gap-1 cursor-pointer"
                        title={t('ai.removeBgTitle', 'Eliminar fondo a esta imagen')}
                      >
                        ✂️ {t('ai.removeBg', 'Quitar Fondo')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChainTransformOnResult(m.result, 'cyberpunk')}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#1A2234] hover:bg-[#25314C] text-purple-300 border border-[#2B3A5A] transition-colors flex items-center gap-1 cursor-pointer"
                        title={t('ai.cyberpunkTitle', 'Aplicar filtro Cyberpunk')}
                      >
                        🌆 {t('ai.cyberpunk', 'Cyberpunk')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChainTransformOnResult(m.result, 'palette')}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#1A2234] hover:bg-[#25314C] text-amber-300 border border-[#2B3A5A] transition-colors flex items-center gap-1 cursor-pointer"
                        title={t('ai.paletteTitle', 'Extraer paleta de colores')}
                      >
                        🎨 {t('ai.palette', 'Paleta')}
                      </button>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <a
                        href={m.result.url}
                        download={m.result.fileName}
                        className="flex-1 py-2 px-3 rounded-xl bg-[#10B981] hover:bg-[#059669] text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#10B981]/20"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>{t('ai.download', 'Descargar')}</span>
                      </a>

                      {onSelectResultForWorkspace && (
                        <button
                          onClick={() => handleOpenInEditor(m.result)}
                          className="py-2 px-3 rounded-xl bg-[#1E2436] hover:bg-[#2A334B] text-white font-semibold text-xs flex items-center justify-center gap-1 border border-[#2F3952] transition-colors"
                          title={t('ai.openInEditor', 'Abrir en editor')}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Editor</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[9px] text-stone-500 mt-1 px-1 font-mono">
                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}

          {isProcessing && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-gradient-to-r from-[#161B29] to-[#182333] border border-[#10B981]/50 text-xs text-[#34D399] max-w-[88%] shadow-lg animate-pulse">
              <Loader2 className="h-4 w-4 animate-spin text-[#10B981] shrink-0" />
              <div className="flex flex-col">
                <span className="font-bold text-white">{t('ai.processingFast', '⚡ Procesando a alta velocidad...')}</span>
                <span className="text-[11px] text-stone-300">{t('ai.processingDesc', 'Generando obra visual o razonando tu consulta con IA.')}</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Quick Sample Prompts Chips */}
        <div className="px-4 py-2 bg-[#10131E] border-t border-[#1F2536] overflow-x-auto no-scrollbar flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-stone-400 shrink-0 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-[#10B981]" /> {t('ai.ideas', 'Ideas IA:')}
          </span>
          {attachedFile ? (
            <>
              <button
                onClick={() => handleSendMessage('¿Cómo me recomiendas optimizar y mejorar esta imagen?')}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#181D2C] hover:bg-[#10B981]/20 hover:text-[#34D399] border border-[#283046] text-stone-300 transition-colors shrink-0"
              >
                🔍 Analizar imagen
              </button>
              <button
                onClick={() => handleSendMessage('Quita el fondo a esta imagen con transparencia')}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#181D2C] hover:bg-[#10B981]/20 hover:text-[#34D399] border border-[#283046] text-stone-300 transition-colors shrink-0"
              >
                ✂️ Quitar fondo
              </button>
              <button
                onClick={() => handleSendMessage('Conviértela a WebP calidad 85%')}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#181D2C] hover:bg-[#10B981]/20 hover:text-[#34D399] border border-[#283046] text-stone-300 transition-colors shrink-0"
              >
                🔄 Convertir a WebP
              </button>
              <button
                onClick={() => handleSendMessage('Aplica un filtro Cyberpunk')}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#181D2C] hover:bg-[#10B981]/20 hover:text-[#34D399] border border-[#283046] text-stone-300 transition-colors shrink-0"
              >
                🌆 Filtro Cyberpunk
              </button>
              <button
                onClick={() => handleSendMessage('Extrae la paleta de colores dominantes')}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#181D2C] hover:bg-[#10B981]/20 hover:text-[#34D399] border border-[#283046] text-stone-300 transition-colors shrink-0"
              >
                🎨 Paleta de colores
              </button>
              <button
                onClick={() => handleSendMessage('Sugiere un texto gracioso para hacer un meme con esta foto')}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#181D2C] hover:bg-[#10B981]/20 hover:text-[#34D399] border border-[#283046] text-stone-300 transition-colors shrink-0"
              >
                🤣 Idea para Meme
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleSendMessage('Genera una imagen de un zorro místico cyberpunk en una ciudad neón')}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#181D2C] hover:bg-[#10B981]/20 hover:text-[#34D399] border border-[#283046] text-stone-300 transition-colors shrink-0"
              >
                🦊 Zorro Cyberpunk
              </button>
              <button
                onClick={() => handleSendMessage('Genera un astronauta flotando en una nebulosa cósmica púrpura 3D')}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#181D2C] hover:bg-[#10B981]/20 hover:text-[#34D399] border border-[#283046] text-stone-300 transition-colors shrink-0"
              >
                🚀 Astronauta 3D
              </button>
              <button
                onClick={() => handleSendMessage('Dibuja un palacio flotante sobre nubes estilo Studio Ghibli')}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#181D2C] hover:bg-[#10B981]/20 hover:text-[#34D399] border border-[#283046] text-stone-300 transition-colors shrink-0"
              >
                🏯 Palacio Ghibli
              </button>
              <button
                onClick={() => handleSendMessage('Genera un logo minimalista geométrico futurista para una marca')}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#181D2C] hover:bg-[#10B981]/20 hover:text-[#34D399] border border-[#283046] text-stone-300 transition-colors shrink-0"
              >
                💎 Logo Minimalista
              </button>
              <button
                onClick={() => handleSendMessage('¿Cuál es la diferencia entre WebP, AVIF y PNG?')}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#181D2C] hover:bg-[#10B981]/20 hover:text-[#34D399] border border-[#283046] text-stone-300 transition-colors shrink-0"
              >
                💡 WebP vs PNG
              </button>
            </>
          )}
        </div>

        {/* Attached preview bar before sending */}
        {attachedFile && (
          <div className="px-4 py-2 bg-[#121624] border-t border-[#1F2536] flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {attachedFilePreview ? (
                <img
                  src={attachedFilePreview}
                  alt="Thumbnail"
                  className="h-7 w-7 rounded-md object-contain bg-black/60 border border-[#2E374D]"
                />
              ) : (
                <ImageIcon className="h-5 w-5 text-[#10B981]" />
              )}
              <span className="text-xs font-semibold text-white truncate max-w-[200px]">
                {attachedFile.name}
              </span>
              <span className="text-[10px] text-stone-400 font-mono">
                ({Math.round(attachedFile.size / 1024)} KB)
              </span>
            </div>

            <button
              onClick={handleClearAttached}
              className="p-1 text-stone-400 hover:text-rose-400 transition-colors"
              title={t('ai.removeFile', 'Quitar archivo')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Input Controls Bar */}
        <div className="p-3 bg-[#121522] border-t border-[#242A3E]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,video/*"
              className="hidden"
            />

            {/* Attach button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`p-2.5 rounded-2xl border transition-colors shrink-0 ${
                attachedFile
                  ? 'bg-[#10B981]/20 border-[#10B981]/50 text-[#34D399]'
                  : 'bg-[#191E2C] border-[#293145] text-stone-400 hover:text-white'
              }`}
              title={t('ai.attach', 'Adjuntar archivo')}
            >
              <Paperclip className="h-4 w-4" />
            </button>

            {/* Mic button */}
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2.5 rounded-2xl border transition-all shrink-0 ${
                isListening
                  ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse ring-2 ring-rose-500/40'
                  : 'bg-[#191E2C] border-[#293145] text-stone-400 hover:text-white'
              }`}
              title={isListening ? t('ai.stopMic', 'Detener micrófono') : t('ai.mic', 'Hablar por micrófono')}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>

            {/* Text input */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                isListening
                  ? t('ai.listening', 'Escuchando tu voz...')
                  : t('ai.placeholder', 'Pide en lenguaje natural (ej: "elimina el fondo")')
              }
              className="flex-1 bg-[#191E2C] border border-[#293145] rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]"
            />

            {/* Send button */}
            <button
              type="submit"
              disabled={isProcessing || (!inputText.trim() && !attachedFile)}
              className="p-2.5 rounded-2xl bg-[#10B981] hover:bg-[#059669] disabled:opacity-40 text-black font-bold transition-transform active:scale-95 shadow-md shadow-[#10B981]/30 shrink-0"
              title={t('ai.send', 'Enviar')}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
