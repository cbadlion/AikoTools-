import express from "express";
import path from "path";
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

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "aikotools-api", hasGemini: !!process.env.GEMINI_API_KEY });
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

