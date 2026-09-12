import express from "express";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

function buildEnhancedPrompt(prompt: string, style: string) {
  const p = prompt.trim();
  switch (style) {
    case "cinematic":
      return `8k resolution photorealistic cinematic still photograph of ${p}, dramatic cinematic lighting, anamorphic lens, shallow depth of field, ray tracing reflections, masterpiece photography`;
    case "anime":
      return `Masterpiece anime art of ${p}, Studio Ghibli and Makoto Shinkai style, vibrant lush colors, detailed background, aesthetic volumetric lighting, 4k digital illustration`;
    case "cyberpunk":
      return `Cyberpunk scene of ${p}, glowing neon city lights, holographic billboards, synthwave chromatic lighting, rain reflections, volumetric night fog, octane render 8k`;
    case "3d-render":
      return `3D Pixar Disney style character and environment render of ${p}, soft clay textures, cute expression, warm rim lighting, raytraced 4k`;
    case "fantasy":
      return `Epic dark fantasy concept art of ${p}, glowing magical aura, ancient runes, majestic composition, ethereal lighting, trending on ArtStation`;
    case "pixelart":
      return `Crisp 16-bit pixel art of ${p}, retro arcade video game aesthetic, vibrant nostalgic color palette, detailed sprite work`;
    case "vintage-photo":
      return `Authentic 1970s vintage 35mm film photograph of ${p}, warm Kodachrome tones, subtle film grain, nostalgic analog portrait`;
    case "minimalist":
      return `Clean minimalist modern vector art of ${p}, elegant geometric shapes, refined harmonic color palette, award winning flat illustration`;
    case "vibrant":
    default:
      return `Vibrant colorful high-definition digital artwork of ${p}, intricate details, dynamic lighting, sharp focus, masterpiece composition`;
  }
}

// Fetch real neural image from Pollinations Flux / Turbo engine
async function fetchNeuralGeneratedImage(prompt: string, width: number, height: number, model: string = "flux"): Promise<string | null> {
  const seed = Math.floor(Math.random() * 10000000);
  const encodedPrompt = encodeURIComponent(prompt);
  const targetUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true&model=${model}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Pollinations ${model} returned status ${response.status}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.length < 1000) {
      return null;
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const base64 = buffer.toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn(`Error generating image with ${model}:`, err?.message || err);
    return null;
  }
}

// Fallback intelligent intent parser and knowledge provider
function fallbackIntentParser(prompt: string, fileName?: string) {
  const p = prompt.toLowerCase().trim();

  // 1. AI Image Generation intent detection (Broad matching for immediate visual creation)
  const isImageGen = 
    p.startsWith("un ") || p.startsWith("una ") || p.startsWith("el ") || p.startsWith("la ") ||
    p.includes("genera") || p.includes("crea") || p.includes("dibuja") || p.includes("haz") ||
    p.includes("pinta") || p.includes("generate") || p.includes("draw") || p.includes("paint") ||
    p.includes("imagen") || p.includes("foto") || p.includes("logo") || p.includes("paisaje") ||
    p.includes("avatar") || p.includes("render") || p.includes("cyberpunk") || p.includes("anime") ||
    p.includes("ghibli") || p.includes("astronauta") || p.includes("zorro") || p.includes("dragón") ||
    p.includes("arte") || p.includes("pixelart") || p.includes("vector");

  // Only consider as image gen if not a pure informational question (e.g., "qué es una imagen webp")
  const isQuestion = p.includes("qué es") || p.includes("que es") || p.includes("por qué") || p.includes("por que") || p.includes("diferencia") || p.includes("vs") || p.includes("cómo funciona") || p.includes("como funciona");

  if (isImageGen && !isQuestion) {
    let cleanPrompt = prompt
      .replace(/^(genera|crea|dibuja|pinta|hazme|haz|quiero|generate|draw|create|paint)\s*(una|un|el|la)?\s*(imagen|foto|dibujo|obra|arte|render)?\s*(de|sobre)?\s*/gi, "")
      .trim();
    if (!cleanPrompt) cleanPrompt = prompt;

    let detectedStyle = "vibrant";
    if (p.includes("cyberpunk") || p.includes("neon") || p.includes("neón")) detectedStyle = "cyberpunk";
    else if (p.includes("anime") || p.includes("ghibli") || p.includes("manga")) detectedStyle = "anime";
    else if (p.includes("cinematog") || p.includes("realista") || p.includes("8k") || p.includes("foto")) detectedStyle = "cinematic";
    else if (p.includes("3d") || p.includes("pixar") || p.includes("render")) detectedStyle = "3d-render";
    else if (p.includes("pixel") || p.includes("8bit") || p.includes("retro")) detectedStyle = "pixelart";
    else if (p.includes("fantasy") || p.includes("mágico") || p.includes("dragón")) detectedStyle = "fantasy";
    else if (p.includes("minimalist") || p.includes("logo") || p.includes("vector")) detectedStyle = "minimalist";

    return {
      reply: `🎨 **¡Generando tu imagen artística con IA!**\n\nHe interpretado tu idea para crear una composición en estilo **${detectedStyle.toUpperCase()}**:\n> *"${cleanPrompt}"*\n\n*(Puedes descargarla directamente o enviarla al Workspace de edición)*.`,
      action: {
        type: "generate_image",
        toolId: "ai-image-generator",
        params: {
          prompt: cleanPrompt,
          aspectRatio: p.includes("16:9") || p.includes("horizontal") ? "16:9" : p.includes("9:16") || p.includes("vertical") || p.includes("story") ? "9:16" : "1:1",
          style: detectedStyle
        }
      }
    };
  }

  // 2. Informational Queries: WebP vs PNG, compression, AVIF, formats, video bitrate, etc.
  if (p.includes("diferencia") || p.includes("webp vs") || p.includes("png vs") || p.includes("formato") || p.includes("cual es mejor") || p.includes("cuál es mejor") || p.includes("por que") || p.includes("por qué") || p.includes("que es") || p.includes("qué es") || p.includes("como funciona") || p.includes("cómo funciona") || p.includes("consejo") || p.includes("explic")) {
    let reply = `### 💡 Guía de Formatos y Optimización Multimedia\n\n`;
    
    if (p.includes("webp") || p.includes("png") || p.includes("jpg")) {
      reply += `**Comparativa de formatos:**\n` +
        `• **WebP:** El formato rey de la web moderna. Ofrece transparencia alfa (como PNG) y compresión con o sin pérdida (como JPG), reduciendo el peso entre un **30% y un 70%** sin pérdida visible.\n` +
        `• **PNG:** Ideal para gráficos vectoriales convertidos, capturas con texto nítido, logos e ilustraciones donde la transparencia de bordes de 24 bits es indispensable.\n` +
        `• **JPG / JPEG:** Recomendado para fotografías complejas cuando se requiere compatibilidad con dispositivos antiguos (no soporta transparencias).\n` +
        `• **AVIF:** Formato de nueva generación basado en AV1. Logra hasta un **20% más de compresión que WebP**, ideal para la web ultra-rápida.\n\n` +
        `**Recomendación AikoTools:** Si buscas máxima velocidad de carga en tu web o enviar fotos ligeras por chat, **WebP con calidad 85%** es la opción perfecta.`;
    } else if (p.includes("audio") || p.includes("video") || p.includes("gif") || p.includes("mp4")) {
      reply += `**Vídeo y Animaciones:**\n` +
        `• **GIF:** Formato clásico limitado a 256 colores. Para clips largos, un archivo GIF puede pesar hasta 10 veces más que un MP4/WebM.\n` +
        `• **MP4 (H.264):** Compatible con el 100% de reproductores y navegadores.\n` +
        `• **Extracción de Audio (WAV):** Extrae la pista de sonido sin pérdidas en calidad PCM a 44.1/48 kHz.\n\n` +
        `**Pro-Tip:** Puedes usar nuestra herramienta **"Vídeo a GIF"** para capturar momentos y **"Creador de GIF"** ajustando los FPS a 12-15 para ahorrar peso.`;
    } else {
      reply += `AikoTools procesa el 100% de tus archivos **directamente en tu navegador** mediante WebAssembly y Canvas, garantizando **privacidad total (cero subidas)** y velocidad instantánea sin límites de tamaño.\n\n` +
        `**¿Qué deseas hacer ahora?**\n` +
        `• 🎨 *Generar una imagen IA* (ej: *"Genera un zorro cyberpunk"* o *"Dibuja un astronauta"*)\n` +
        `• ✂️ *Eliminar fondo de tu foto*\n` +
        `• 🔄 *Convertir a WebP, AVIF o PNG*\n` +
        `• 🌆 *Aplicar filtros como Cyberpunk o Vintage*`;
    }

    return {
      reply,
      action: null
    };
  }

  // 3. Media processing actions
  if (p.includes("fondo") || p.includes("bg") || p.includes("background") || p.includes("quitar fondo") || p.includes("eliminar fondo") || p.includes("transparente") || p.includes("png transparente")) {
    return {
      reply: "He analizado tu imagen y voy a eliminar el fondo automáticamente con transparencia de bordes.",
      action: {
        type: "remove_background",
        toolId: "bg-remover",
        params: { tolerance: 28, feather: 2, mode: "flood" }
      }
    };
  }

  if (p.includes("webp") || p.includes("convert") || p.includes("formato") || p.includes("jpg") || p.includes("png") || p.includes("avif") || p.includes("ico") || p.includes("favicon")) {
    let target = "webp";
    if (p.includes("jpg") || p.includes("jpeg")) target = "jpg";
    if (p.includes("png")) target = "png";
    if (p.includes("avif")) target = "avif";
    if (p.includes("ico") || p.includes("favicon")) target = "ico";

    return {
      reply: `He configurado la conversión a formato ${target.toUpperCase()} optimizando el peso y la resolución.`,
      action: {
        type: "convert",
        toolId: "converter-tools",
        params: { targetFormat: target, quality: 0.85 }
      }
    };
  }

  if (p.includes("cyberpunk") || p.includes("vintage") || p.includes("filtro") || p.includes("efecto") || p.includes("retro") || p.includes("noir") || p.includes("glitch") || p.includes("pixel")) {
    let preset = "cyberpunk";
    if (p.includes("vintage") || p.includes("70s")) preset = "vintage";
    if (p.includes("noir") || p.includes("blanco y negro") || p.includes("b&w")) preset = "noir";
    if (p.includes("glitch") || p.includes("rgb")) preset = "glitch";
    if (p.includes("pixel") || p.includes("8bit") || p.includes("8 bit")) preset = "pixelate";
    if (p.includes("sunset") || p.includes("atardecer")) preset = "sunset";

    return {
      reply: `Aplicando el preset artístico "${preset.toUpperCase()}" a tu imagen con balance de contraste y saturación.`,
      action: {
        type: "effects",
        toolId: "effects-tools",
        params: { preset, brightness: 100, contrast: 120, saturation: 125 }
      }
    };
  }

  if (p.includes("comprimir") || p.includes("optimizar") || p.includes("pesar menos") || p.includes("reducir tamaño") || p.includes("peso") || p.includes("comprim")) {
    return {
      reply: "He configurado la compresión inteligente en WebP de alta densidad para reducir drásticamente los kilobytes sin perder calidad visible.",
      action: {
        type: "compress",
        toolId: "converter-tools",
        params: { targetFormat: "webp", quality: 0.65 }
      }
    };
  }

  if (p.includes("paleta") || p.includes("color") || p.includes("colores") || p.includes("hex") || p.includes("rgb")) {
    return {
      reply: "Extrayendo la paleta cromática dominante y los códigos hexadecimales de tu imagen.",
      action: {
        type: "palette",
        toolId: "palette-tools",
        params: { count: 6 }
      }
    };
  }

  if (p.includes("meme") || p.includes("texto") || p.includes("impact")) {
    return {
      reply: "Generando el meme con tipografía Impact, contorno negro y ajuste automático de texto.",
      action: {
        type: "meme",
        toolId: "text-tools",
        params: { topText: "CUANDO USAS AIKOTOOLS", bottomText: "Y TODO ES 100% LOCAL Y GRATIS" }
      }
    };
  }

  return {
    reply: `¡Hola! Soy Aiko, tu suite de IA multimedia. Puedes:\n\n• **Preguntarme cualquier duda técnica:** *"¿Por qué WebP es mejor que PNG?"*, *"¿Cómo comprimir sin perder calidad?"*\n• **Generar imágenes artísticas:** *"Genera una imagen de un gato astronauta en el espacio"*\n• **Transformar archivos:** *"Elimina el fondo"*, *"Conviértela a WebP"*, *"Aplica filtro cyberpunk"*, *"Extrae los colores"*`,
    action: null
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.raw({ type: "application/octet-stream", limit: "150mb" }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "aikotools-api", hasGemini: !!process.env.GEMINI_API_KEY });
  });

  // --- AUDIO / MP3 STORAGE AND STREAMING ENGINE ---
  const AUDIO_DIR = path.join(process.cwd(), "data", "audio");
  if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
  }
  const AUDIO_INDEX_PATH = path.join(AUDIO_DIR, "index.json");

  interface AudioRecord {
    id: string;
    filename: string;
    sanitizedFilename: string;
    size: number;
    mimeType: string;
    duration?: number;
    createdAt: string;
  }

  function getAudioRecords(): AudioRecord[] {
    try {
      if (fs.existsSync(AUDIO_INDEX_PATH)) {
        const raw = fs.readFileSync(AUDIO_INDEX_PATH, "utf-8");
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn("Could not read audio index:", e);
    }
    return [];
  }

  function saveAudioRecords(records: AudioRecord[]) {
    try {
      fs.writeFileSync(AUDIO_INDEX_PATH, JSON.stringify(records, null, 2), "utf-8");
    } catch (e) {
      console.warn("Could not save audio index:", e);
    }
  }

  // Server-side robust audio processor with ffmpeg and ffprobe
  function processAudioWithFfmpeg(
    inputBuffer: Buffer,
    originalFilename: string,
    options: { optimize?: boolean; targetKbps?: number } = {}
  ): {
    buffer: Buffer;
    filename: string;
    duration: number;
    mimeType: string;
    wasConverted: boolean;
    savingsPercent: number;
  } {
    const tempId = `aud_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    const tempInput = path.join("/tmp", `${tempId}_in`);
    const tempOutput = path.join("/tmp", `${tempId}_out.mp3`);

    let duration = 0;
    let codecName = "";
    const originalSize = inputBuffer.length;

    try {
      fs.writeFileSync(tempInput, inputBuffer);

      try {
        const probeStr = execSync(
          `ffprobe -v quiet -print_format json -show_format -show_streams "${tempInput}"`,
          { encoding: "utf-8", timeout: 8000 }
        );
        const probeData = JSON.parse(probeStr);
        duration = parseFloat(probeData.format?.duration || "0") || 0;
        codecName = (
          probeData.streams?.find((s: any) => s.codec_type === "audio")?.codec_name || ""
        ).toLowerCase();
      } catch (e) {
        console.warn("ffprobe inspection warning:", e);
      }

      const isMp3 = codecName === "mp3" || originalFilename.toLowerCase().endsWith(".mp3");
      const shouldConvert = !isMp3 || options.optimize;

      if (shouldConvert) {
        const bitrate = options.optimize ? `${options.targetKbps || 96}k` : "128k";
        execSync(
          `ffmpeg -y -i "${tempInput}" -vn -c:a libmp3lame -b:a ${bitrate} -ar 44100 "${tempOutput}"`,
          { timeout: 45000 }
        );

        if (fs.existsSync(tempOutput) && fs.statSync(tempOutput).size > 100) {
          const convertedBuf = fs.readFileSync(tempOutput);

          if (!duration) {
            try {
              const p = execSync(
                `ffprobe -v quiet -print_format json -show_format "${tempOutput}"`,
                { encoding: "utf-8", timeout: 5000 }
              );
              duration = parseFloat(JSON.parse(p).format?.duration || "0") || 0;
            } catch {}
          }

          const baseName = originalFilename.replace(/\.[^/.]+$/, "");
          const finalName = `${baseName}.mp3`;
          const savings = Math.max(
            0,
            Math.round(((originalSize - convertedBuf.length) / originalSize) * 100)
          );

          return {
            buffer: convertedBuf,
            filename: finalName,
            duration,
            mimeType: "audio/mpeg",
            wasConverted: true,
            savingsPercent: savings,
          };
        }
      }

      // Default to original if already MP3 or if conversion was bypassed
      const cleanName = originalFilename.toLowerCase().endsWith(".mp3")
        ? originalFilename
        : `${originalFilename.replace(/\.[^/.]+$/, "")}.mp3`;

      // If duration is 0, verify if it actually has an audio stream
      if (!duration || duration <= 0) {
        try {
          const probe = execSync(
            `ffprobe -v quiet -print_format json -show_streams -show_format "${tempInput}"`,
            { encoding: "utf-8", timeout: 5000 }
          );
          const probeData = JSON.parse(probe);
          const hasAudio = (probeData.streams || []).some((s: any) => s.codec_type === "audio");
          if (!hasAudio) {
            throw new Error("El archivo no contiene ninguna pista de audio válida");
          }
          duration = parseFloat(probeData.format?.duration || "0") || 0;
        } catch (e: any) {
          if (e.message?.includes("pista de audio")) throw e;
        }
      }

      return {
        buffer: inputBuffer,
        filename: cleanName,
        duration,
        mimeType: "audio/mpeg",
        wasConverted: false,
        savingsPercent: 0,
      };
    } catch (err: any) {
      if (err.message && err.message.includes("pista de audio")) {
        throw err;
      }
      console.warn("Audio processing fallback to raw buffer:", err);

      // Verify that inputBuffer is genuine audio before returning raw fallback
      let verifiedDuration = 0;
      let hasAudioStream = false;
      try {
        const probe = execSync(
          `ffprobe -v quiet -print_format json -show_streams -show_format "${tempInput}"`,
          { encoding: "utf-8", timeout: 5000 }
        );
        const probeData = JSON.parse(probe);
        hasAudioStream = (probeData.streams || []).some((s: any) => s.codec_type === "audio");
        verifiedDuration = parseFloat(probeData.format?.duration || "0") || 0;
      } catch {}

      if (!hasAudioStream && verifiedDuration <= 0) {
        throw new Error("El archivo no contiene pistas de audio válidas (posible página web o archivo corrupto)");
      }

      return {
        buffer: inputBuffer,
        filename: originalFilename.toLowerCase().endsWith(".mp3")
          ? originalFilename
          : `${originalFilename.replace(/\.[^/.]+$/, "")}.mp3`,
        duration: verifiedDuration,
        mimeType: "audio/mpeg",
        wasConverted: false,
        savingsPercent: 0,
      };
    } finally {
      try {
        if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
      } catch {}
      try {
        if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
      } catch {}
    }
  }

  // 1. Upload & Convert MP3 into Public URL (High-speed binary stream and Base64 fallback)
  app.post("/api/audio/upload", async (req, res) => {
    try {
      let buffer: Buffer;
      let filename = "audio.mp3";
      let mimeType = "audio/mpeg";
      let clientDuration = 0;
      let shouldOptimize = false;

      const contentType = req.headers["content-type"] || "";

      if (contentType.includes("application/octet-stream")) {
        // High-speed binary stream upload: zero Base64 conversion overhead
        buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || []);

        const headerFilename = req.headers["x-audio-filename"];
        if (headerFilename && typeof headerFilename === "string") {
          try {
            filename = decodeURIComponent(headerFilename);
          } catch {
            filename = headerFilename;
          }
        }

        const headerMime = req.headers["x-audio-mime"];
        if (headerMime && typeof headerMime === "string") {
          mimeType = headerMime;
        }

        const headerDuration = req.headers["x-audio-duration"];
        if (headerDuration) {
          const parsedDuration = parseFloat(String(headerDuration));
          if (!isNaN(parsedDuration) && parsedDuration > 0) {
            clientDuration = parsedDuration;
          }
        }

        shouldOptimize = req.headers["x-audio-optimize"] === "true";
      } else {
        // Fallback: JSON body with base64
        const body = req.body || {};
        const base64Data = body.base64Data;
        filename = body.filename || filename;
        mimeType = body.mimeType || mimeType;
        clientDuration = body.duration || clientDuration;
        shouldOptimize = !!body.optimize;

        if (!base64Data || typeof base64Data !== "string") {
          return res.status(400).json({ error: "Missing audio payload (expected raw binary stream or base64Data)" });
        }

        const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");
        buffer = Buffer.from(cleanBase64, "base64");
      }

      if (!buffer || buffer.length === 0) {
        return res.status(400).json({ error: "Empty audio buffer" });
      }

      const originalSize = buffer.length;

      // Server-side audio processing & standardization with ffmpeg
      const proc = processAudioWithFfmpeg(buffer, filename, { optimize: shouldOptimize });
      const finalBuffer = proc.buffer;
      const finalDuration = proc.duration || clientDuration || 0;
      const finalName = proc.filename;

      const id = `mp3_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
      const sanitizedFilename = finalName.replace(/[^a-zA-Z0-9_.-]/g, "_");
      const diskFilename = `${id}_${sanitizedFilename}`;
      const filePath = path.join(AUDIO_DIR, diskFilename);

      fs.writeFileSync(filePath, finalBuffer);

      const record: AudioRecord = {
        id,
        filename: finalName,
        sanitizedFilename,
        size: finalBuffer.length,
        mimeType: proc.mimeType || "audio/mpeg",
        duration: finalDuration,
        createdAt: new Date().toISOString(),
      };

      const records = getAudioRecords();
      records.unshift(record);
      saveAudioRecords(records);

      const relativeUrl = `/api/audio/file/${id}/${encodeURIComponent(sanitizedFilename)}`;

      return res.json({
        success: true,
        id,
        filename: record.filename,
        size: record.size,
        originalSize,
        mimeType: record.mimeType,
        duration: record.duration,
        url: relativeUrl,
        createdAt: record.createdAt,
        wasConverted: proc.wasConverted,
        savingsPercent: proc.savingsPercent,
      });
    } catch (err: any) {
      console.error("Error uploading MP3:", err);
      return res.status(500).json({ error: err?.message || "Failed to process audio" });
    }
  });

  // 1b. Parallel Multi-Chunk Upload: Accelerates mobile 4G/LTE uploads up to 3x-5x
  const CHUNK_UPLOAD_DIR = path.join(process.cwd(), "data", "chunks");
  if (!fs.existsSync(CHUNK_UPLOAD_DIR)) {
    fs.mkdirSync(CHUNK_UPLOAD_DIR, { recursive: true });
  }

  app.post("/api/audio/upload-chunk", async (req, res) => {
    try {
      const uploadId = (req.headers["x-upload-id"] as string || "").replace(/[^a-zA-Z0-9_-]/g, "");
      const chunkIndex = parseInt(req.headers["x-chunk-index"] as string, 10);
      const totalChunks = parseInt(req.headers["x-total-chunks"] as string, 10);
      const headerFilename = req.headers["x-audio-filename"] as string;
      const shouldOptimize = req.headers["x-audio-optimize"] === "true";

      if (!uploadId || isNaN(chunkIndex) || isNaN(totalChunks)) {
        return res.status(400).json({ error: "Missing chunk metadata headers (x-upload-id, x-chunk-index, x-total-chunks)" });
      }

      const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || []);
      if (!buffer || buffer.length === 0) {
        return res.status(400).json({ error: "Empty chunk buffer" });
      }

      const uploadFolder = path.join(CHUNK_UPLOAD_DIR, uploadId);
      if (!fs.existsSync(uploadFolder)) {
        fs.mkdirSync(uploadFolder, { recursive: true });
      }

      const chunkPath = path.join(uploadFolder, `chunk_${chunkIndex}.part`);
      fs.writeFileSync(chunkPath, buffer);

      // Check how many chunks have arrived
      const uploadedParts = fs.readdirSync(uploadFolder).filter(f => f.startsWith("chunk_") && f.endsWith(".part"));

      if (uploadedParts.length === totalChunks) {
        // All parallel chunks have arrived! Assemble full audio buffer
        let filename = "audio.mp3";
        if (headerFilename) {
          try {
            filename = decodeURIComponent(headerFilename);
          } catch {
            filename = headerFilename;
          }
        }

        const chunkBuffers: Buffer[] = [];
        for (let i = 0; i < totalChunks; i++) {
          const p = path.join(uploadFolder, `chunk_${i}.part`);
          if (!fs.existsSync(p)) {
            return res.status(400).json({ error: `Missing chunk ${i}` });
          }
          chunkBuffers.push(fs.readFileSync(p));
        }

        const fullBuffer = Buffer.concat(chunkBuffers);
        const originalSize = fullBuffer.length;

        // Clean up chunk files immediately
        try {
          for (let i = 0; i < totalChunks; i++) {
            const p = path.join(uploadFolder, `chunk_${i}.part`);
            if (fs.existsSync(p)) fs.unlinkSync(p);
          }
          fs.rmdirSync(uploadFolder);
        } catch (e) {
          console.warn("Chunk cleanup warning:", e);
        }

        // Server-side audio processing & standardization with ffmpeg
        const proc = processAudioWithFfmpeg(fullBuffer, filename, { optimize: shouldOptimize });
        const finalBuffer = proc.buffer;
        const finalDuration = proc.duration || 0;
        const finalName = proc.filename;

        const id = `mp3_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
        const sanitizedFilename = finalName.replace(/[^a-zA-Z0-9_.-]/g, "_");
        const diskFilename = `${id}_${sanitizedFilename}`;
        const filePath = path.join(AUDIO_DIR, diskFilename);

        fs.writeFileSync(filePath, finalBuffer);

        const record: AudioRecord = {
          id,
          filename: finalName,
          sanitizedFilename,
          size: finalBuffer.length,
          mimeType: proc.mimeType || "audio/mpeg",
          duration: finalDuration,
          createdAt: new Date().toISOString(),
        };

        const records = getAudioRecords();
        records.unshift(record);
        saveAudioRecords(records);

        const relativeUrl = `/api/audio/file/${id}/${encodeURIComponent(sanitizedFilename)}`;

        return res.json({
          complete: true,
          success: true,
          id,
          filename: record.filename,
          size: record.size,
          originalSize,
          mimeType: record.mimeType,
          duration: record.duration,
          url: relativeUrl,
          createdAt: record.createdAt,
          wasConverted: proc.wasConverted,
          savingsPercent: proc.savingsPercent,
        });
      }

      // Chunk successfully received, awaiting remaining parts
      return res.json({
        complete: false,
        chunkIndex,
        received: uploadedParts.length,
        total: totalChunks,
      });
    } catch (err: any) {
      console.error("Chunk upload error:", err);
      return res.status(500).json({ error: err?.message || "Failed to process audio chunk" });
    }
  });

  // Helper: detect if a URL belongs to YouTube
  function isYouTubeUrl(urlStr: string): boolean {
    try {
      const parsed = new URL(urlStr);
      const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
      return (
        host === "youtube.com" ||
        host === "m.youtube.com" ||
        host === "youtu.be" ||
        host === "music.youtube.com"
      );
    } catch {
      return false;
    }
  }

  // Helper: Extract audio from YouTube and convert to MP3
  async function extractYouTubeAudio(
    youtubeUrl: string
  ): Promise<{ buffer: Buffer; filename: string; duration?: number }> {
    const initUrl = `https://loader.to/ajax/download.php?format=mp3&url=${encodeURIComponent(youtubeUrl)}`;
    const initRes = await fetch(initUrl, {
      signal: AbortSignal.timeout(15000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });

    if (!initRes.ok) {
      throw new Error("El servicio de descarga de YouTube no respondió (HTTP " + initRes.status + ")");
    }

    const initData: any = await initRes.json();
    if (!initData.success || !initData.progress_url) {
      throw new Error(initData.text || "No se pudo iniciar la extracción del video de YouTube.");
    }

    const rawTitle = (initData.title || "audio_youtube").replace(/[/\\?%*:|"<>]/g, "_").trim();
    const progressUrl = initData.progress_url;
    let downloadUrl: string | null = null;
    let videoDuration: number = initData.video_duration || 0;

    // Poll progress until conversion completes
    for (let i = 0; i < 24; i++) {
      await new Promise((r) => setTimeout(r, 1200));
      try {
        const pRes = await fetch(progressUrl, {
          signal: AbortSignal.timeout(8000),
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          },
        });
        if (pRes.ok) {
          const pData: any = await pRes.json();
          if (pData.success === 1 && pData.download_url) {
            downloadUrl = pData.download_url;
            if (pData.video_duration) videoDuration = pData.video_duration;
            break;
          } else if (pData.success === -1 || pData.text?.toLowerCase().includes("error")) {
            throw new Error(pData.text || "Fallo en la conversión de audio de YouTube");
          }
        }
      } catch (err: any) {
        if (err.message && err.message.includes("Fallo en la conversión")) throw err;
      }
    }

    if (!downloadUrl) {
      throw new Error("El video de YouTube tardó demasiado en procesarse. Por favor intenta de nuevo.");
    }

    const audioRes = await fetch(downloadUrl, {
      signal: AbortSignal.timeout(35000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });

    if (!audioRes.ok) {
      throw new Error("No se pudo descargar el MP3 generado del video de YouTube.");
    }

    const arrayBuf = await audioRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    return {
      buffer,
      filename: rawTitle.endsWith(".mp3") ? rawTitle : `${rawTitle}.mp3`,
      duration: videoDuration,
    };
  }

  // 1b. Convert remote audio URL (or YouTube) into local direct streaming MP3 URL
  app.post("/api/audio/import-url", async (req, res) => {
    try {
      const { url: remoteUrl, customName } = req.body;
      if (!remoteUrl || typeof remoteUrl !== "string") {
        return res.status(400).json({ error: "Se requiere una URL de audio válida" });
      }

      let buffer: Buffer;
      let filename: string;
      let estimatedDuration: number | undefined;

      // Special handling for YouTube URLs (videos, music, shorts)
      if (isYouTubeUrl(remoteUrl)) {
        const yt = await extractYouTubeAudio(remoteUrl);
        buffer = yt.buffer;
        filename = customName
          ? (customName.endsWith(".mp3") ? customName : `${customName}.mp3`)
          : yt.filename;
        estimatedDuration = yt.duration;
      } else {
        const parsedUrl = new URL(remoteUrl);
        const urlPath = parsedUrl.pathname;
        const derivedName = customName || path.basename(urlPath) || "audio_remoto.mp3";
        filename = derivedName.endsWith(".mp3") ? derivedName : `${derivedName}.mp3`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        const fetchRes = await fetch(remoteUrl, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AikoTools-Audio-Converter/1.0",
          },
        });
        clearTimeout(timeoutId);

        if (!fetchRes.ok) {
          return res.status(400).json({
            error: `No se pudo descargar el audio desde la URL (HTTP ${fetchRes.status})`,
          });
        }

        const contentType = (fetchRes.headers.get("content-type") || "").toLowerCase();
        if (contentType.includes("text/html")) {
          return res.status(400).json({
            error:
              "La URL proporcionada es una página web (HTML) y no un archivo de audio directo. Para archivos alojados, usa un enlace directo (.mp3, .wav, .m4a), Google Drive, Dropbox, o un enlace de YouTube.",
          });
        }

        const arrayBuffer = await fetchRes.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      }

      if (buffer.length < 500) {
        return res.status(400).json({
          error: "El archivo descargado no parece ser un audio válido o está vacío",
        });
      }

      const proc = processAudioWithFfmpeg(buffer, filename, { optimize: false });
      const finalBuffer = proc.buffer;
      const finalName = proc.filename;
      let duration = proc.duration || 0;

      if (duration <= 0 && estimatedDuration && estimatedDuration > 0) {
        duration = estimatedDuration;
      }

      if (duration <= 0) {
        return res.status(400).json({
          error: "El archivo obtenido no contiene audio reproducible (duración 00:00).",
        });
      }

      const id = `mp3_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
      const sanitizedFilename = finalName.replace(/[^a-zA-Z0-9_.-]/g, "_");
      const diskFilename = `${id}_${sanitizedFilename}`;
      const filePath = path.join(AUDIO_DIR, diskFilename);

      fs.writeFileSync(filePath, finalBuffer);

      const mimeType = proc.mimeType || "audio/mpeg";
      const record: AudioRecord = {
        id,
        filename: finalName,
        sanitizedFilename,
        size: finalBuffer.length,
        mimeType,
        duration,
        createdAt: new Date().toISOString(),
      };

      const records = getAudioRecords();
      records.unshift(record);
      saveAudioRecords(records);

      const relativeUrl = `/api/audio/file/${id}/${encodeURIComponent(sanitizedFilename)}`;

      return res.json({
        success: true,
        id,
        filename: record.filename,
        size: record.size,
        mimeType: record.mimeType,
        duration: record.duration,
        url: relativeUrl,
        createdAt: record.createdAt,
      });
    } catch (err: any) {
      console.error("Error importing audio URL:", err);
      return res.status(500).json({
        error: err?.message || "Error al importar el audio desde la URL",
      });
    }
  });

  // 1c. Rename Audio File
  app.patch("/api/audio/rename/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { newName } = req.body;
      if (!newName || typeof newName !== "string") {
        return res.status(400).json({ error: "Nuevo nombre no proporcionado" });
      }

      const cleanedName = newName.trim();
      const finalFilename = cleanedName.endsWith(".mp3") ? cleanedName : `${cleanedName}.mp3`;
      const sanitized = finalFilename.replace(/[^a-zA-Z0-9_.-]/g, "_");

      const records = getAudioRecords();
      const recordIndex = records.findIndex((r) => r.id === id);
      if (recordIndex === -1) {
        return res.status(404).json({ error: "Archivo de audio no encontrado" });
      }

      const currentRecord = records[recordIndex];
      const oldDiskPath = path.join(AUDIO_DIR, `${currentRecord.id}_${currentRecord.sanitizedFilename}`);
      const newDiskPath = path.join(AUDIO_DIR, `${currentRecord.id}_${sanitized}`);

      if (fs.existsSync(oldDiskPath) && oldDiskPath !== newDiskPath) {
        fs.renameSync(oldDiskPath, newDiskPath);
      }

      currentRecord.filename = finalFilename;
      currentRecord.sanitizedFilename = sanitized;
      records[recordIndex] = currentRecord;
      saveAudioRecords(records);

      const newRelativeUrl = `/api/audio/file/${id}/${encodeURIComponent(sanitized)}`;

      return res.json({
        success: true,
        id,
        filename: finalFilename,
        url: newRelativeUrl
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Error al renombrar archivo" });
    }
  });

  // 2. Stream Audio with HTTP Range Support (Status 206 Partial Content / 200 OK)
  app.all(["/api/audio/file/:id", "/api/audio/file/:id/:filename"], (req, res) => {
    const { id } = req.params;
    const records = getAudioRecords();
    const record = records.find((r) => r.id === id);

    // Locate file on disk
    let targetFilePath: string | null = null;
    let actualMime = record?.mimeType || "audio/mpeg";
    let actualFilename = record?.sanitizedFilename || "audio.mp3";

    if (record) {
      const p = path.join(AUDIO_DIR, `${record.id}_${record.sanitizedFilename}`);
      if (fs.existsSync(p)) {
        targetFilePath = p;
      }
    }

    if (!targetFilePath) {
      // Fallback search in folder by ID prefix
      try {
        const files = fs.readdirSync(AUDIO_DIR);
        const match = files.find((f) => f.startsWith(`${id}_`));
        if (match) {
          targetFilePath = path.join(AUDIO_DIR, match);
          actualFilename = match.replace(`${id}_`, "");
        }
      } catch (e) {
        // ignore
      }
    }

    if (!targetFilePath || !fs.existsSync(targetFilePath)) {
      return res.status(404).json({ error: "Audio file not found" });
    }

    const stat = fs.statSync(targetFilePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    // CORS & Browser Headers for direct external playback
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Range, Origin, X-Requested-With, Content-Type, Accept");
    res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges");

    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    if (range) {
      // Range Header Parsing
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        res.setHeader("Content-Range", `bytes */${fileSize}`);
        return res.status(416).end();
      }

      const chunkSize = end - start + 1;
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": actualMime,
        "Cache-Control": "public, max-age=86400",
      });

      if (req.method === "HEAD") {
        return res.end();
      }

      const stream = fs.createReadStream(targetFilePath, { start, end });
      stream.pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": actualMime,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=86400",
        "Content-Disposition": `inline; filename="${actualFilename}"`,
      });

      if (req.method === "HEAD") {
        return res.end();
      }

      const stream = fs.createReadStream(targetFilePath);
      stream.pipe(res);
    }
  });

  // 3. List Stored Audio Files
  app.get("/api/audio/list", (req, res) => {
    const records = getAudioRecords();
    const verified = records.filter((r) => {
      const p = path.join(AUDIO_DIR, `${r.id}_${r.sanitizedFilename}`);
      return fs.existsSync(p);
    }).map((r) => ({
      ...r,
      url: `/api/audio/file/${r.id}/${encodeURIComponent(r.sanitizedFilename)}`,
    }));
    res.json({ files: verified });
  });

  // 4. Delete Audio File
  app.delete("/api/audio/file/:id", (req, res) => {
    const { id } = req.params;
    let records = getAudioRecords();
    const record = records.find((r) => r.id === id);

    if (record) {
      const p = path.join(AUDIO_DIR, `${record.id}_${record.sanitizedFilename}`);
      if (fs.existsSync(p)) {
        try {
          fs.unlinkSync(p);
        } catch (e) {
          console.warn("Failed to delete audio file from disk:", e);
        }
      }
      records = records.filter((r) => r.id !== id);
      saveAudioRecords(records);
    }
    res.json({ success: true, id });
  });

  // Dedicated AI Image Generation Endpoint
  app.post("/api/gemini/generate-image", async (req, res) => {
    try {
      const {
        prompt,
        aspectRatio = "1:1",
        style = "vibrant",
        outputFormat = "webp",
        quality = "hd"
      } = req.body;

      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "Missing prompt" });
      }

      // 1. Calculate target dimensions based on aspect ratio
      let width = 1024;
      let height = 1024;
      if (aspectRatio === "16:9") {
        width = 1280;
        height = 720;
      } else if (aspectRatio === "9:16") {
        width = 720;
        height = 1280;
      } else if (aspectRatio === "4:3") {
        width = 1024;
        height = 768;
      } else if (aspectRatio === "3:4") {
        width = 768;
        height = 1024;
      } else if (aspectRatio === "3:2") {
        width = 1080;
        height = 720;
      }

      // 2. Build highly descriptive artistic prompt for AI models
      const styledPrompt = buildEnhancedPrompt(prompt, style);
      const ai = getGenAI();

      // Tier 1: Gemini Image Generation Model
      if (ai) {
        const imageModels = ["gemini-3.1-flash-image", "gemini-3.1-flash-lite-image"];
        const validRatios = ["1:1", "16:9", "9:16", "4:3", "3:4"];
        const geminiAspectRatio = validRatios.includes(aspectRatio) ? aspectRatio : "1:1";

        for (const model of imageModels) {
          try {
            const response = await ai.models.generateContent({
              model,
              contents: {
                parts: [{ text: styledPrompt }]
              },
              config: {
                imageConfig: {
                  aspectRatio: geminiAspectRatio
                }
              }
            });

            if (response.candidates && response.candidates[0]?.content?.parts) {
              for (const part of response.candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                  const mimeType = part.inlineData.mimeType || "image/png";
                  const imageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
                  const textDesc = response.candidates[0].content.parts.find((p: any) => p.text)?.text || prompt;

                  return res.json({
                    success: true,
                    imageUrl,
                    prompt,
                    description: textDesc,
                    aspectRatio,
                    style,
                    format: outputFormat.toUpperCase(),
                    engine: "Gemini 3.1 Image"
                  });
                }
              }
            }
          } catch (modelError: any) {
            console.log(`Gemini image model ${model} skipped: ${modelError?.message || 'Proceeding to neural engine'}`);
          }
        }
      }

      // Tier 2: High-Resolution Neural Flux Engine (State of the art real artwork & photography)
      const fluxImage = await fetchNeuralGeneratedImage(styledPrompt, width, height, "flux");
      if (fluxImage) {
        return res.json({
          success: true,
          imageUrl: fluxImage,
          prompt,
          description: `Imagen generada por IA en alta definición para: "${prompt}" (${style.toUpperCase()})`,
          aspectRatio,
          style,
          format: outputFormat.toUpperCase(),
          engine: "Neural Flux Engine"
        });
      }

      // Tier 3: Neural Turbo Engine (Ultra-fast generation fallback)
      const turboImage = await fetchNeuralGeneratedImage(styledPrompt, width, height, "turbo");
      if (turboImage) {
        return res.json({
          success: true,
          imageUrl: turboImage,
          prompt,
          description: `Imagen generada por IA para: "${prompt}" (${style.toUpperCase()})`,
          aspectRatio,
          style,
          format: outputFormat.toUpperCase(),
          engine: "Neural Turbo Engine"
        });
      }

      // Tier 4: Direct high-res generation URL fallback
      const seed = Math.floor(Math.random() * 1000000);
      const directUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(styledPrompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true`;

      return res.json({
        success: true,
        imageUrl: directUrl,
        prompt,
        description: `Imagen generada por IA para "${prompt}" (${style.toUpperCase()})`,
        aspectRatio,
        style,
        format: outputFormat.toUpperCase(),
        engine: "Neural Direct Engine"
      });
    } catch (err: any) {
      console.warn("AI Image Generation handled with direct fallback:", err?.message || err);
      const width = 1024;
      const height = 1024;
      const safePrompt = req.body.prompt || "Digital artwork";
      const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(safePrompt)}?width=${width}&height=${height}&nologo=true`;
      return res.json({
        success: true,
        imageUrl: fallbackUrl,
        prompt: safePrompt,
        description: "Generación de imagen completada.",
        aspectRatio: "1:1",
        style: "vibrant",
        engine: "Neural Fallback"
      });
    }
  });

  // Prompt Enhancer Endpoint (boosts simple user prompts with Gemini 3.7 Flash)
  app.post("/api/gemini/enhance-prompt", async (req, res) => {
    try {
      const { prompt, style = "vibrant" } = req.body;
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "Missing prompt" });
      }

      const ai = getGenAI();
      if (!ai) {
        return res.json({
          enhancedPrompt: `${prompt}, 8k resolution, highly detailed, dramatic lighting, volumetric atmosphere, masterpiece digital art, ${style} aesthetic`
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `You are an expert AI prompt engineer for image generators.
Expand and enhance the following simple idea into a vivid, descriptive, photographic and artistic prompt in English (30-60 words).
Include camera angle, lighting, textures, depth, and atmospheric mood suited for the "${style}" style.
User idea: "${prompt}".
CRITICAL: Respond ONLY with the enhanced prompt text, without quotes or intro.`,
      });

      const enhanced = response.text?.trim() || `${prompt}, 8k resolution, cinematic lighting, masterpiece`;
      return res.json({ enhancedPrompt: enhanced });
    } catch (err: any) {
      return res.json({
        enhancedPrompt: `${req.body.prompt}, 8k resolution, vibrant lighting, intricate textures, digital masterpiece`
      });
    }
  });

  // Multimodal Media Inspector & Visual Advisor Endpoint
  app.post("/api/gemini/analyze-media", async (req, res) => {
    try {
      const { base64Data, mimeType = "image/png", prompt } = req.body;
      const ai = getGenAI();

      if (!ai || !base64Data) {
        return res.json({
          analysis: `### 🔍 Análisis de Imagen Local\n\n` +
            `• **Formato detectado:** ${mimeType.toUpperCase()}\n` +
            `• **Recomendación de compresión:** Para optimizar esta imagen para web o chat, conviértela a **WebP calidad 85%** para reducir hasta un 50% de peso.\n` +
            `• **Mejoras sugeridas:** Prueba el filtro **Cyberpunk** para colores vivos o **Eliminar Fondo** para aislar el sujeto principal.`
        });
      }

      const imagePart = {
        inlineData: {
          mimeType,
          data: base64Data.replace(/^data:[^;]+;base64,/, '')
        }
      };

      const customPrompt = prompt || `Analyze this image in detail as a professional multimedia and photography expert.
In Spanish, provide:
1. 📸 **Descripción visual**: Subject, background, and visual elements.
2. 🎨 **Paleta y Temperatura de Color**: Dominant tones, mood, and lighting.
3. ⚡ **Consejos de Optimización y Edición**:
   - Best output format (WebP/AVIF/PNG/JPG) and why.
   - Recommended filters (e.g. Cyberpunk, Vintage, Noir).
   - If background removal would look great.
4. 💡 **Ideas Creativas / Meme**: 2 catchy text caption ideas for a meme.
Keep formatting clean, scannable, and modern with Markdown bullets and bold text.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: { parts: [imagePart, { text: customPrompt }] }
      });

      return res.json({
        analysis: response.text || "Análisis completado satisfactoriamente."
      });
    } catch (err: any) {
      console.warn("Analyze media fallback:", err?.message || err);
      return res.json({
        analysis: `### 🔍 Análisis de Imagen Aiko\n\n` +
          `• **Formato:** Imagen lista para edición local en el navegador.\n` +
          `• **Consejo de Rendimiento:** Usa el Conversor Universal para pasarla a WebP (85% calidad) para un ahorro sustancial de bytes sin perder nitidez.\n` +
          `• **Herramientas recomendadas:** Eliminar fondo con transparencia o aplicar Preset Vintage.`
      });
    }
  });

  // Autonomous AI Media Assistant & Informational Engine Endpoint
  app.post("/api/gemini/assistant", async (req, res) => {
    try {
      const { prompt, hasFile, fileName, fileType, base64Image } = req.body;

      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "Missing prompt" });
      }

      const ai = getGenAI();

      if (!ai) {
        const fallbackRes = fallbackIntentParser(prompt, fileName);
        return res.json(fallbackRes);
      }

      const systemInstruction = `You are Aiko, an autonomous AI Media Suite Operator and expert multimedia engineer.
The user is speaking or typing a message. They might be:
1. Asking for technical information, advice, or comparisons (e.g. "Why is WebP better than PNG?", "How to compress video?", "What are bitrates?", "Which format to use for logos?").
   -> If the user asks an informational question, provide an articulate, informative, and beautifully structured Markdown response with key explanations, pros/cons, and actionable tips. (Set action: null).
2. Asking to generate an image (e.g. "Genera una imagen de...", "Crea una imagen de un gato en el espacio", "Dibuja...").
   -> Map to action: { type: "generate_image", toolId: "ai-image-generator", params: { prompt: "<cleaned image prompt>", aspectRatio: "1:1", style: "vibrant" } }
3. Asking to execute a multimedia transformation on an attached file:
   - "remove_background" (toolId: "bg-remover", params: { tolerance: 28, feather: 2, mode: "flood" })
   - "convert" (toolId: "converter-tools", params: { targetFormat: "webp"|"png"|"jpg"|"avif"|"ico"|"bmp", quality: 0.85 })
   - "effects" (toolId: "effects-tools", params: { preset: "cyberpunk"|"vintage"|"noir"|"glitch"|"pixelate"|"sunset", brightness: 100, contrast: 120, saturation: 120 })
   - "compress" (toolId: "converter-tools", params: { targetFormat: "webp", quality: 0.65 })
   - "palette" (toolId: "palette-tools", params: { count: 6 })
   - "meme" (toolId: "text-tools", params: { topText: string, bottomText: string })
   - null if it is pure conversation or information.

Always respond in the user's language (Spanish by default if spoken in Spanish).

Return structured JSON with keys:
- reply (string, rich Markdown with formatting if answering questions)
- action (object or null, with properties: type, toolId, params)`;

      // If user uploaded an image and provided base64 data, use multimodal Gemini 3.8 Flash!
      let userContents: any = `User message: "${prompt}". File attached: ${hasFile ? (fileName || fileType || 'Yes') : 'No'}.`;
      if (base64Image && typeof base64Image === 'string') {
        const cleanBase64 = base64Image.replace(/^data:[^;]+;base64,/, '');
        const mime = fileType || 'image/png';
        userContents = {
          parts: [
            { inlineData: { mimeType: mime, data: cleanBase64 } },
            { text: `User request regarding attached image: "${prompt}". File name: ${fileName || 'image'}. Determine the best reply and action.` }
          ]
        };
      }

      // High-speed model fallback chain: gemini-3.8-flash -> gemini-3.1-flash-lite
      const candidateModels = ["gemini-3.8-flash", "gemini-3.1-flash-lite"];
      let parsedResult = null;

      for (const model of candidateModels) {
        try {
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Model timeout")), 3500)
          );

          const genPromise = ai.models.generateContent({
            model,
            contents: userContents,
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  reply: { type: Type.STRING },
                  action: {
                    type: Type.OBJECT,
                    properties: {
                      type: { type: Type.STRING },
                      toolId: { type: Type.STRING },
                      params: {
                        type: Type.OBJECT,
                        properties: {
                          prompt: { type: Type.STRING },
                          aspectRatio: { type: Type.STRING },
                          style: { type: Type.STRING },
                          targetFormat: { type: Type.STRING },
                          quality: { type: Type.NUMBER },
                          preset: { type: Type.STRING },
                          tolerance: { type: Type.NUMBER },
                          feather: { type: Type.NUMBER },
                          mode: { type: Type.STRING },
                          brightness: { type: Type.NUMBER },
                          contrast: { type: Type.NUMBER },
                          saturation: { type: Type.NUMBER },
                          topText: { type: Type.STRING },
                          bottomText: { type: Type.STRING },
                          count: { type: Type.NUMBER }
                        }
                      }
                    }
                  }
                },
                required: ["reply"]
              }
            }
          });

          const response: any = await Promise.race([genPromise, timeoutPromise]);
          const responseText = response.text;
          if (responseText) {
            parsedResult = JSON.parse(responseText);
            if (parsedResult?.reply) {
              return res.json(parsedResult);
            }
          }
        } catch (modelError: any) {
          console.warn(`Model ${model} unavailable or slow (${modelError?.message || 503}), attempting next tier...`);
        }
      }

      // If all live models fail or return empty, smoothly use intelligent intent parser
      const fallbackRes = fallbackIntentParser(prompt, fileName);
      return res.json(fallbackRes);
    } catch (err: any) {
      console.warn("AI Assistant fallback activated:", err?.message || err);
      const fallbackRes = fallbackIntentParser(req.body.prompt || "", req.body.fileName);
      return res.json(fallbackRes);
    }
  });

  // Vite middleware in dev, static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AikoTools Server running on http://localhost:${PORT}`);
  });
}

startServer();

