import os, re

files_to_check = [
    'src/App.tsx',
    'src/components/Header.tsx',
    'src/components/BatchWebPWorkspace.tsx',
    'src/components/ActiveToolWorkspace.tsx',
    'src/components/UploadZone.tsx',
    'src/components/ToolGrid.tsx',
    'src/components/InteractiveBgEditor.tsx',
    'src/components/MetadataViewer.tsx',
    'src/components/CompareSlider.tsx',
    'src/components/FormatComparisonModal.tsx'
]

english_indicators = [
    'Choose', 'Select', 'Upload', 'Download', 'Compress', 'Convert', 'Quality', 'Settings',
    'Delete', 'Remove', 'Edit', 'Add', 'Close', 'Cancel', 'Save', 'Apply', 'Reset', 'Clear',
    'Width', 'Height', 'Original', 'Files', 'Images', 'Photos', 'Folder', 'Done', 'Loading',
    'Processing', 'Please wait', 'Total', 'Size', 'Export', 'Import', 'Drop', 'Browse',
    'Drag', 'Custom', 'Advanced', 'Preview', 'Compare', 'Share', 'Copy', 'Copied'
]

for fpath in files_to_check:
    if not os.path.exists(fpath):
        continue
    with open(fpath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    found = []
    for idx, line in enumerate(lines):
        sline = line.strip()
        if sline.startswith('//') or sline.startswith('/*') or sline.startswith('import '):
            continue
        line_no_t = re.sub(r"t\([^)]+\)", "", line)
        for word in english_indicators:
            matches = re.findall(rf"([\"'`>][^\"'`<>]*\b{word}\b[^\"'`<>]*[\"'`<])", line_no_t, re.IGNORECASE)
            if matches:
                for m in matches:
                    m_clean = m.strip()
                    if not any(cls in m_clean for cls in ['select-', 'cursor-', 'items-', 'justify-', 'bg-', 'text-', 'border-', 'from-', 'to-']):
                        found.append((idx + 1, word, m_clean))
    if found:
        print(f"=== {fpath} ({len(found)} occurrences) ===")
        seen = set()
        for lnum, w, text in found:
            if lnum not in seen:
                seen.add(lnum)
                print(f"  L{lnum}: {text}")
