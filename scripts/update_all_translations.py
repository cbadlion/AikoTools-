import os
import re
import json
import urllib.request
import urllib.parse
import time
import sys
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

CACHE_FILE = 'scripts/translation_cache.json'
lock = threading.Lock()

if os.path.exists(CACHE_FILE):
    with open(CACHE_FILE, 'r', encoding='utf-8') as f:
        cache = json.load(f)
else:
    cache = {}

def save_cache():
    with lock:
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)

LANG_MAP = {
    'pt': 'pt',
    'fr': 'fr',
    'de': 'de',
    'it': 'it',
    'ja': 'ja',
    'zh': 'zh-CN',
    'zh_TW': 'zh-TW',
    'ko': 'ko',
    'ru': 'ru',
    'ar': 'ar',
    'hi': 'hi',
    'tr': 'tr',
    'nl': 'nl',
    'pl': 'pl',
    'vi': 'vi',
    'id': 'id',
    'uk': 'uk',
    'th': 'th',
    'sv': 'sv',
    'cs': 'cs',
    'el': 'el',
    'ro': 'ro',
    'hu': 'hu',
    'da': 'da',
    'fi': 'fi',
    'no': 'no',
    'he': 'he',
    'ms': 'ms',
    'fil': 'tl',
    'bn': 'bn',
    'ca': 'ca',
    'eu': 'eu',
    'gl': 'gl'
}

PROTECTED_VALUES = {
    '100% LOCAL', '1000', '30 FPS', 'Cyberpunk', 'Vector SVG', 'JPEG XL',
    'Original', 'WebP', 'GIF', 'PNG', 'JPG', 'AVIF', 'SVG', 'MP4', 'WAV', 'MP3'
}

NEW_KEYS_ES = {
    "tools.aiAnalysisTitle": "Analizar esta imagen con IA de Gemini",
    "tools.aiAnalysis": "Análisis IA",
    "tools.localNotice": "100% LOCAL",
    "upload.changeFile": "Cambiar archivo",
    "workspace.change": "Cambiar",
    "workspace.touchEditor": "🪄 Editor Táctil & Varita Mágica (En Vivo)",
    "workspace.autoAdjustments": "⚙️ Ajustes Automáticos y Parámetros",
    "workspace.compressAndReduce": "Comprimir y Reducir Peso",
    "workspace.applyRecolor": "Aplicar Cambio de Color",
    "workspace.processFile": "Procesar archivo",
    "workspace.processingOnDevice": "Procesando en tu dispositivo...",
    "workspace.originalWeight": "Peso Original",
    "workspace.newWeight": "Nuevo Peso",
    "workspace.share": "Compartir",
    "workspace.continueEditing": "Seguir editando este resultado con:",
    "header.themeSwitcher": "Cambiar paleta de color y tema del estudio",
    "header.accentColor": "Color de Acento",
    "common.search": "Buscar...",
    "cat.gif": "Creador de GIF",
    "cat.advanced": "Avanzado",
    "interactive.magicWand": "Selección Mágica",
    "interactive.fingerBrush": "Borrar con Dedo",
    "interactive.restore": "Restaurar",
    "interactive.cutting": "Recortando...",
    "interactive.autoCut": "Auto Recorte",
    "interactive.zoomOut": "Reducir zoom",
    "interactive.zoomIn": "Aumentar zoom",
    "interactive.fit": "Ajustar tamaño (100%)",
    "interactive.holdOriginal": "Mantén presionado para ver la imagen original",
    "interactive.viewOriginal": "Ver Original",
    "interactive.magicTip": "🪄 Toca o haz clic sobre el fondo para eliminarlo automáticamente",
    "interactive.brushTip": "👆 Pasa el dedo o ratón sobre las zonas que desees borrar",
    "interactive.restoreTip": "🖌️ Pasa el dedo para restaurar y recuperar partes borradas",
    "interactive.previewBg": "Fondo de visualización:",
    "interactive.checker": "Ajedrez (Alfa)",
    "interactive.white": "Blanco",
    "interactive.black": "Negro",
    "interactive.chroma": "Chroma",
    "interactive.toolSettings": "Ajustes de Herramienta",
    "interactive.tolerance": "Tolerancia de Selección Mágica",
    "interactive.strict": "Estricto",
    "interactive.balanced": "Equilibrado",
    "interactive.broad": "Amplio",
    "interactive.toleranceDesc": "Controla qué tan sensible es la varita a variaciones de sombra y textura del color tocado.",
    "interactive.selectionMode": "Modo de Selección",
    "interactive.contiguous": "Continuo",
    "interactive.contiguousDesc": "Solo la zona tocada",
    "interactive.global": "Global",
    "interactive.globalDesc": "Todo el color igual",
    "interactive.brushThickness": "Grosor del Pincel / Dedo",
    "interactive.downloadFormat": "Formato de Descarga",
    "interactive.solid": "Sólido",
    "interactive.transparent": "Transparente",
    "interactive.downloadEdited": "Descargar Imagen Editada",
    "interactive.shareFile": "Compartir archivo"
}

NEW_KEYS_EN = {
    "tools.aiAnalysisTitle": "Analyze this image with Gemini AI",
    "tools.aiAnalysis": "AI Analysis",
    "tools.localNotice": "100% LOCAL",
    "upload.changeFile": "Change file",
    "workspace.change": "Change",
    "workspace.touchEditor": "🪄 Touch & Magic Wand Editor (Live)",
    "workspace.autoAdjustments": "⚙️ Automatic Adjustments and Parameters",
    "workspace.compressAndReduce": "Compress and Reduce Size",
    "workspace.applyRecolor": "Apply Color Change",
    "workspace.processFile": "Process file",
    "workspace.processingOnDevice": "Processing on your device...",
    "workspace.originalWeight": "Original Size",
    "workspace.newWeight": "New Size",
    "workspace.share": "Share",
    "workspace.continueEditing": "Continue editing this result with:",
    "header.themeSwitcher": "Change studio color palette and theme",
    "header.accentColor": "Accent Color",
    "common.search": "Search...",
    "cat.gif": "GIF Maker",
    "cat.advanced": "Advanced",
    "interactive.magicWand": "Magic Wand",
    "interactive.fingerBrush": "Finger Eraser",
    "interactive.restore": "Restore",
    "interactive.cutting": "Clipping...",
    "interactive.autoCut": "Auto Cut",
    "interactive.zoomOut": "Zoom out",
    "interactive.zoomIn": "Zoom in",
    "interactive.fit": "Fit to screen (100%)",
    "interactive.holdOriginal": "Hold to view original image",
    "interactive.viewOriginal": "View Original",
    "interactive.magicTip": "🪄 Tap or click the background to remove it automatically",
    "interactive.brushTip": "👆 Swipe finger or mouse over areas you want to erase",
    "interactive.restoreTip": "🖌️ Swipe to restore and recover erased parts",
    "interactive.previewBg": "Preview background:",
    "interactive.checker": "Checkerboard (Alpha)",
    "interactive.white": "White",
    "interactive.black": "Black",
    "interactive.chroma": "Chroma",
    "interactive.toolSettings": "Tool Settings",
    "interactive.tolerance": "Magic Wand Tolerance",
    "interactive.strict": "Strict",
    "interactive.balanced": "Balanced",
    "interactive.broad": "Broad",
    "interactive.toleranceDesc": "Controls how sensitive the wand is to shade and texture variations.",
    "interactive.selectionMode": "Selection Mode",
    "interactive.contiguous": "Contiguous",
    "interactive.contiguousDesc": "Connected area only",
    "interactive.global": "Global",
    "interactive.globalDesc": "All matching color",
    "interactive.brushThickness": "Brush / Finger Size",
    "interactive.downloadFormat": "Download Format",
    "interactive.solid": "Solid",
    "interactive.transparent": "Transparent",
    "interactive.downloadEdited": "Download Edited Image",
    "interactive.shareFile": "Share file"
}

def translate_phrase(text, target_lang):
    if not text or text in PROTECTED_VALUES:
        return text
    
    cache_key = f"{target_lang}::{text}"
    with lock:
        if cache_key in cache:
            return cache[cache_key]

    safe_text = text.replace('{count}', '___COUNT___')
    url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=es&tl={target_lang}&dt=t&q=" + urllib.parse.quote(safe_text)
    
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                res = ''.join([part[0] for part in data[0] if part[0]])
                res = res.replace('___COUNT___', '{count}')
                with lock:
                    cache[cache_key] = res
                return res
        except Exception as e:
            time.sleep(0.3 * (attempt + 1))
    
    return text

def parse_kv(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    kv = {}
    for line in content.splitlines():
        m = re.match(r'^\s*\"([^\"]+)\":\s*\"(.*)\",?\s*$', line)
        if m:
            kv[m.group(1)] = m.group(2)
    return kv

def write_locale_file(file_path, kv_dict):
    lines = ['export default {']
    for k in sorted(kv_dict.keys()):
        val = kv_dict[k].replace('\\', '\\\\').replace('"', '\\"')
        lines.append(f'  "{k}": "{val}",')
    lines.append('};')
    lines.append('')
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

print("Step 1: Updating es.ts and en.ts with new keys...", flush=True)
es = parse_kv('src/i18n/locales/es.ts')
en = parse_kv('src/i18n/locales/en.ts')

es.update(NEW_KEYS_ES)
en.update(NEW_KEYS_EN)

write_locale_file('src/i18n/locales/es.ts', es)
write_locale_file('src/i18n/locales/en.ts', en)
print(f"es.ts now has {len(es)} keys, en.ts has {len(en)} keys.", flush=True)

print("\nStep 2: Updating all other locale files concurrently...", flush=True)
locale_dir = 'src/i18n/locales'
locales = [f for f in sorted(os.listdir(locale_dir)) if f.endswith('.ts') and f not in ['index.ts', 'en.ts', 'es.ts', 'zh-TW.ts']]

def process_locale(loc):
    lang_name = loc[:-3]
    google_lang = LANG_MAP.get(lang_name)
    if not google_lang:
        return f"Skipped {loc}"
    
    loc_path = os.path.join(locale_dir, loc)
    curr_kv = parse_kv(loc_path)
    
    needs_translation = {}
    for k, es_val in es.items():
        curr_val = curr_kv.get(k)
        en_val = en.get(k)
        if not curr_val or (curr_val == en_val and curr_val not in PROTECTED_VALUES):
            needs_translation[k] = es_val
            
    if not needs_translation:
        return f"[{lang_name}] Already up-to-date ({len(curr_kv)} keys)"
        
    for k, es_val in needs_translation.items():
        translated = translate_phrase(es_val, google_lang)
        curr_kv[k] = translated
        
    write_locale_file(loc_path, curr_kv)
    return f"[{lang_name}] Finished translating {len(needs_translation)} keys (Total: {len(curr_kv)})"

with ThreadPoolExecutor(max_workers=10) as executor:
    futures = {executor.submit(process_locale, loc): loc for loc in locales}
    for fut in as_completed(futures):
        res = fut.result()
        print(res, flush=True)

save_cache()
print("\nAll locales successfully synchronized!", flush=True)
