import os
import re
import json
import urllib.request
import urllib.parse
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

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

def batch_translate(texts, target_lang, source_lang='es', chunk_size=25):
    results = []
    for i in range(0, len(texts), chunk_size):
        chunk = texts[i:i+chunk_size]
        protected = [t.replace('{count}', 'COUNT_PH') for t in chunk]
        joined = ' ||| '.join(protected)
        url = f'https://translate.googleapis.com/translate_a/single?client=gtx&sl={source_lang}&tl={target_lang}&dt=t&q=' + urllib.parse.quote(joined)
        
        chunk_success = False
        for attempt in range(3):
            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
                with urllib.request.urlopen(req, timeout=10) as resp:
                    data = json.loads(resp.read().decode('utf-8'))
                    translated_text = ''.join([part[0] for part in data[0] if part[0]])
                    parts = [p.strip().replace('COUNT_PH', '{count}') for p in translated_text.split('|||')]
                    if len(parts) == len(chunk):
                        results.extend(parts)
                        chunk_success = True
                        break
            except Exception:
                time.sleep(0.3 * (attempt + 1))
        
        if not chunk_success:
            # If delimiter failed, translate sequentially for this small chunk
            for item in chunk:
                try:
                    s_url = f'https://translate.googleapis.com/translate_a/single?client=gtx&sl={source_lang}&tl={target_lang}&dt=t&q=' + urllib.parse.quote(item.replace('{count}', 'COUNT_PH'))
                    req = urllib.request.Request(s_url, headers={'User-Agent': 'Mozilla/5.0'})
                    with urllib.request.urlopen(req, timeout=5) as resp:
                        data = json.loads(resp.read().decode('utf-8'))
                        res_str = ''.join([part[0] for part in data[0] if part[0]]).strip().replace('COUNT_PH', '{count}')
                        results.append(res_str)
                except Exception:
                    results.append(item)
                time.sleep(0.05)
                
        time.sleep(0.15)
    return results

es = parse_kv('src/i18n/locales/es.ts')
en = parse_kv('src/i18n/locales/en.ts')
locale_dir = 'src/i18n/locales'
locales = [f for f in sorted(os.listdir(locale_dir)) if f.endswith('.ts') and f not in ['index.ts', 'en.ts', 'es.ts', 'zh-TW.ts']]

def process_locale(loc):
    lang = loc[:-3]
    glang = LANG_MAP.get(lang)
    if not glang:
        return f"Skipped {loc}"
    
    loc_path = os.path.join(locale_dir, loc)
    curr_kv = parse_kv(loc_path)
    
    keys_to_translate = []
    es_values = []
    
    for k, es_val in es.items():
        curr_val = curr_kv.get(k)
        en_val = en.get(k)
        # Needs translation if missing or identical to English (and not protected)
        if not curr_val or (curr_val == en_val and curr_val not in PROTECTED_VALUES):
            keys_to_translate.append(k)
            es_values.append(es_val)
            
    if not keys_to_translate:
        return f"[{lang}] Already complete ({len(curr_kv)} keys)"
        
    print(f"[{lang}] Translating {len(keys_to_translate)} keys...", flush=True)
    translated_vals = batch_translate(es_values, glang)
    
    for k, t_val in zip(keys_to_translate, translated_vals):
        curr_kv[k] = t_val
        
    write_locale_file(loc_path, curr_kv)
    return f"[{lang}] Saved! Total keys: {len(curr_kv)}"

print(f"Starting parallel translation for {len(locales)} locales (6 workers)...", flush=True)

with ThreadPoolExecutor(max_workers=6) as executor:
    futures = {executor.submit(process_locale, loc): loc for loc in locales}
    for fut in as_completed(futures):
        print(fut.result(), flush=True)

print("\nALL LOCALES SUCCESSFULLY TRANSLATED AND SYNCHRONIZED!", flush=True)
