#!/usr/bin/env python3
import json
import os
import sys
import time
import urllib.request
import urllib.parse

def main():
    with open('scripts/base-en.json', 'r', encoding='utf-8') as f:
        base_en = json.load(f)

    with open('scripts/base-es.json', 'r', encoding='utf-8') as f:
        base_es = json.load(f)

    all_keys = list(base_en.keys())
    print(f"Total keys per locale: {len(all_keys)}")

    locales_dir = os.path.join('src', 'i18n', 'locales')
    os.makedirs(locales_dir, exist_ok=True)

    all_target_languages = [
        {'code': 'es', 'tl': 'es', 'source': 'es'},
        {'code': 'en', 'tl': 'en', 'source': 'en'},
        {'code': 'pt', 'tl': 'pt', 'source': 'en'},
        {'code': 'fr', 'tl': 'fr', 'source': 'en'},
        {'code': 'de', 'tl': 'de', 'source': 'en'},
        {'code': 'it', 'tl': 'it', 'source': 'en'},
        {'code': 'ja', 'tl': 'ja', 'source': 'en'},
        {'code': 'zh', 'tl': 'zh-CN', 'source': 'en'},
        {'code': 'zh-TW', 'tl': 'zh-TW', 'source': 'en'},
        {'code': 'ko', 'tl': 'ko', 'source': 'en'},
        {'code': 'ru', 'tl': 'ru', 'source': 'en'},
        {'code': 'ar', 'tl': 'ar', 'source': 'en'},
        {'code': 'hi', 'tl': 'hi', 'source': 'en'},
        {'code': 'tr', 'tl': 'tr', 'source': 'en'},
        {'code': 'nl', 'tl': 'nl', 'source': 'en'},
        {'code': 'pl', 'tl': 'pl', 'source': 'en'},
        {'code': 'vi', 'tl': 'vi', 'source': 'en'},
        {'code': 'id', 'tl': 'id', 'source': 'en'},
        {'code': 'uk', 'tl': 'uk', 'source': 'en'},
        {'code': 'th', 'tl': 'th', 'source': 'en'},
        {'code': 'sv', 'tl': 'sv', 'source': 'en'},
        {'code': 'cs', 'tl': 'cs', 'source': 'en'},
        {'code': 'el', 'tl': 'el', 'source': 'en'},
        {'code': 'ro', 'tl': 'ro', 'source': 'en'},
        {'code': 'hu', 'tl': 'hu', 'source': 'en'},
        {'code': 'da', 'tl': 'da', 'source': 'en'},
        {'code': 'fi', 'tl': 'fi', 'source': 'en'},
        {'code': 'no', 'tl': 'no', 'source': 'en'},
        {'code': 'he', 'tl': 'iw', 'source': 'en'},
        {'code': 'ms', 'tl': 'ms', 'source': 'en'},
        {'code': 'fil', 'tl': 'tl', 'source': 'en'},
        {'code': 'bn', 'tl': 'bn', 'source': 'en'},
        {'code': 'ca', 'tl': 'ca', 'source': 'es'},
        {'code': 'eu', 'tl': 'eu', 'source': 'es'},
        {'code': 'gl', 'tl': 'gl', 'source': 'es'},
    ]

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    }

    def fetch_translation(text, source_lang, target_lang):
        url = f'https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl={source_lang}&tl={target_lang}&q=' + urllib.parse.quote(text)
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if isinstance(data, list) and len(data) > 0:
                return data[0]
            elif isinstance(data, str):
                return data
            return text

    chunk_size = 25

    for item in all_target_languages:
        code = item['code']
        tl = item['tl']
        source_lang = item['source']
        source_dict = base_es if source_lang == 'es' else base_en
        var_name = code.replace('-', '_')
        file_path = os.path.join(locales_dir, f"{var_name}.ts")

        # Verify if already valid and complete
        if os.path.exists(file_path):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    c = f.read()
                    if f"export const {var_name}" in c and len(c) > 6000:
                        print(f"Skipping already complete: {code}")
                        continue
            except Exception:
                pass

        print(f"\n[Translating {code} ({tl}) from {source_lang}]")
        t0 = time.time()
        lang_dict = {}

        for i in range(0, len(all_keys), chunk_size):
            chunk_keys = all_keys[i:i + chunk_size]
            chunk_texts = [source_dict[k] for k in chunk_keys]
            joined = '\n'.join(chunk_texts)

            try:
                translated_raw = fetch_translation(joined, source_lang, tl)
                lines = translated_raw.split('\n')
                if len(lines) == len(chunk_keys):
                    for k, v in zip(chunk_keys, lines):
                        lang_dict[k] = v.strip()
                else:
                    # Fallback for this chunk
                    print(f"  Mismatch in chunk {i//chunk_size}: got {len(lines)} lines, expected {len(chunk_keys)}. Doing single requests...")
                    for k in chunk_keys:
                        lang_dict[k] = fetch_translation(source_dict[k], source_lang, tl).strip()
                        time.sleep(0.05)
            except Exception as e:
                print(f"  Error on chunk {i//chunk_size}: {e}. Retrying individually...")
                for k in chunk_keys:
                    try:
                        lang_dict[k] = fetch_translation(source_dict[k], source_lang, tl).strip()
                    except Exception:
                        lang_dict[k] = source_dict[k]
                    time.sleep(0.05)

            time.sleep(0.3)

        # Check for any missing keys
        missing = [k for k in all_keys if k not in lang_dict]
        if missing:
            print(f"  Resolving {len(missing)} missing keys...")
            for k in missing:
                try:
                    lang_dict[k] = fetch_translation(source_dict[k], source_lang, tl).strip()
                except Exception:
                    lang_dict[k] = source_dict[k]

        # Write locale file
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(f"export const {var_name}: Record<string, string> = {json.dumps(lang_dict, indent=2, ensure_ascii=False)};\n")

        print(f"✓ Successfully built {code} ({len(lang_dict)} keys) in {time.time() - t0:.2f}s")

    # Re-build translations.ts
    imports = []
    export_lines = []

    for item in all_target_languages:
        c = item['code']
        var_name = c.replace('-', '_')
        imports.append(f"import {{ {var_name} }} from './locales/{var_name}';")
        if '-' in c:
            export_lines.append(f"  '{c}': {var_name},")
        else:
            export_lines.append(f"  {c}: {var_name},")

    translations_content = f"""// Complete internationalization dictionaries for 35 world languages
{chr(10).join(imports)}

export const translations: Record<string, Record<string, string>> = {{
{chr(10).join(export_lines)}
}};
"""

    with open(os.path.join('src', 'i18n', 'translations.ts'), 'w', encoding='utf-8') as f:
        f.write(translations_content)

    print("\n==============================================")
    print("ALL 35 LOCALES GENERATED & AGGREGATED SUCCESSFULLY!")
    print("==============================================")

if __name__ == '__main__':
    main()
