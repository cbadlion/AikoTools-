import os
import re

def parse_kv(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    kv = {}
    for line in content.splitlines():
        m = re.match(r'^\s*\"([^\"]+)\":\s*\"(.*)\",?\s*$', line)
        if m:
            kv[m.group(1)] = m.group(2)
    return kv

def write_locale_file(file_path, lang_code, kv_dict):
    lines = [f'export const {lang_code}: Record<string, string> = {{']
    for k in sorted(kv_dict.keys()):
        val = kv_dict[k].replace('\\', '\\\\').replace('"', '\\"')
        lines.append(f'  "{k}": "{val}",')
    lines.append('};')
    lines.append('')
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

ES_NEW = {
    "interactive.copiedTitle": "Copiado al portapapeles",
    "interactive.copiedBody": "La imagen se copió en alta resolución. Lista para pegar en cualquier chat o documento.",
    "interactive.colorSampled": "Color muestreado",
    "interactive.colorFixed": "Color",
    "workspace.completed": "completado",
    "workspace.fileReady": "Tu archivo",
    "workspace.readyToDownload": "está listo para descargar",
    "interactive.cutReadyTitle": "Recorte listo",
    "workspace.generatedSuccess": "se ha generado con éxito",
    "ai.completedByAi": "completado por IA"
}

EN_NEW = {
    "interactive.copiedTitle": "Copied to clipboard",
    "interactive.copiedBody": "The image was copied in high resolution. Ready to paste in any chat or document.",
    "interactive.colorSampled": "Color sampled",
    "interactive.colorFixed": "Color",
    "workspace.completed": "completed",
    "workspace.fileReady": "Your file",
    "workspace.readyToDownload": "is ready to download",
    "interactive.cutReadyTitle": "Cutout ready",
    "workspace.generatedSuccess": "has been generated successfully",
    "ai.completedByAi": "completed by AI"
}

PT_NEW = {
    "interactive.copiedTitle": "Copiado para a área de transferência",
    "interactive.copiedBody": "A imagem foi copiada em alta resolução. Pronta para colar em qualquer chat ou documento.",
    "interactive.colorSampled": "Cor amostrada",
    "interactive.colorFixed": "Cor",
    "workspace.completed": "concluído",
    "workspace.fileReady": "Seu arquivo",
    "workspace.readyToDownload": "está pronto para baixar",
    "interactive.cutReadyTitle": "Recorte pronto",
    "workspace.generatedSuccess": "foi gerado com sucesso",
    "ai.completedByAi": "concluído por IA"
}

FR_NEW = {
    "interactive.copiedTitle": "Copié dans le presse-papiers",
    "interactive.copiedBody": "L'image a été copiée en haute résolution. Prête à coller dans n'importe quel chat ou document.",
    "interactive.colorSampled": "Couleur échantillonnée",
    "interactive.colorFixed": "Couleur",
    "workspace.completed": "terminé",
    "workspace.fileReady": "Votre fichier",
    "workspace.readyToDownload": "est prêt à être téléchargé",
    "interactive.cutReadyTitle": "Découpe prête",
    "workspace.generatedSuccess": "a été généré avec succès",
    "ai.completedByAi": "terminé par l'IA"
}

DE_NEW = {
    "interactive.copiedTitle": "In Zwischenablage kopiert",
    "interactive.copiedBody": "Das Bild wurde in hoher Auflösung kopiert. Bereit zum Einfügen.",
    "interactive.colorSampled": "Farbe aufgenommen",
    "interactive.colorFixed": "Farbe",
    "workspace.completed": "abgeschlossen",
    "workspace.fileReady": "Deine Datei",
    "workspace.readyToDownload": "ist bereit zum Herunterladen",
    "interactive.cutReadyTitle": "Freistellen fertig",
    "workspace.generatedSuccess": "wurde erfolgreich erstellt",
    "ai.completedByAi": "von KI fertiggestellt"
}

IT_NEW = {
    "interactive.copiedTitle": "Copiato negli appunti",
    "interactive.copiedBody": "L'immagine è stata copiata in alta risoluzione. Pronta per essere incollata.",
    "interactive.colorSampled": "Colore campionato",
    "interactive.colorFixed": "Colore",
    "workspace.completed": "completato",
    "workspace.fileReady": "Il tuo file",
    "workspace.readyToDownload": "è pronto per il download",
    "interactive.cutReadyTitle": "Ritaglio pronto",
    "workspace.generatedSuccess": "è stato generato con successo",
    "ai.completedByAi": "completato dall'IA"
}

CA_NEW = {
    "interactive.copiedTitle": "Copiat al porta-retalls",
    "interactive.copiedBody": "La imatge s'ha copiat en alta resolució. A punt per enganxar.",
    "interactive.colorSampled": "Color mostrejat",
    "interactive.colorFixed": "Color",
    "workspace.completed": "completat",
    "workspace.fileReady": "El teu fitxer",
    "workspace.readyToDownload": "està a punt per descarregar",
    "interactive.cutReadyTitle": "Retall a punt",
    "workspace.generatedSuccess": "s'ha generat amb èxit",
    "ai.completedByAi": "completat per IA"
}

GL_NEW = {
    "interactive.copiedTitle": "Copiado ao portapapeis",
    "interactive.copiedBody": "A imaxe copiouse en alta resolución. Lista para pegar.",
    "interactive.colorSampled": "Cor mostrada",
    "interactive.colorFixed": "Cor",
    "workspace.completed": "completado",
    "workspace.fileReady": "O teu ficheiro",
    "workspace.readyToDownload": "está listo para descargar",
    "interactive.cutReadyTitle": "Recorte listo",
    "workspace.generatedSuccess": "xerouse con éxito",
    "ai.completedByAi": "completado por IA"
}

JA_NEW = {
    "interactive.copiedTitle": "クリップボードにコピーしました",
    "interactive.copiedBody": "高解像度でコピーしました。貼り付け可能です。",
    "interactive.colorSampled": "色をスポイト抽出しました",
    "interactive.colorFixed": "色",
    "workspace.completed": "完了",
    "workspace.fileReady": "ファイル",
    "workspace.readyToDownload": "ダウンロード準備完了",
    "interactive.cutReadyTitle": "切り抜き完了",
    "workspace.generatedSuccess": "が正常に生成されました",
    "ai.completedByAi": "AIによって完了"
}

ZH_NEW = {
    "interactive.copiedTitle": "已复制到剪贴板",
    "interactive.copiedBody": "已高清晰度复制到剪贴板，可随时粘贴。",
    "interactive.colorSampled": "取色成功",
    "interactive.colorFixed": "颜色",
    "workspace.completed": "已完成",
    "workspace.fileReady": "您的文件",
    "workspace.readyToDownload": "已准备好下载",
    "interactive.cutReadyTitle": "抠图完成",
    "workspace.generatedSuccess": "已成功生成",
    "ai.completedByAi": "由AI完成"
}

RU_NEW = {
    "interactive.copiedTitle": "Скопировано в буфер обмена",
    "interactive.copiedBody": "Изображение скопировано в высоком разрешении.",
    "interactive.colorSampled": "Цвет выбран",
    "interactive.colorFixed": "Цвет",
    "workspace.completed": "завершено",
    "workspace.fileReady": "Ваш файл",
    "workspace.readyToDownload": "готов к скачиванию",
    "interactive.cutReadyTitle": "Вырезка готова",
    "workspace.generatedSuccess": "успешно создан",
    "ai.completedByAi": "завершено ИИ"
}

UK_NEW = {
    "interactive.copiedTitle": "Скопійовано в буфер обміну",
    "interactive.copiedBody": "Зображення скопійовано у високій роздільній здатності.",
    "interactive.colorSampled": "Колір обрано",
    "interactive.colorFixed": "Колір",
    "workspace.completed": "завершено",
    "workspace.fileReady": "Ваш файл",
    "workspace.readyToDownload": "готовий до завантаження",
    "interactive.cutReadyTitle": "Вирізка готова",
    "workspace.generatedSuccess": "успішно створено",
    "ai.completedByAi": "завершено ШІ"
}

KO_NEW = {
    "interactive.copiedTitle": "클립보드에 복사됨",
    "interactive.copiedBody": "고해상도로 복사되었습니다. 어디든 붙여넣기 할 수 있습니다.",
    "interactive.colorSampled": "색상 추출 완료",
    "interactive.colorFixed": "색상",
    "workspace.completed": "완료됨",
    "workspace.fileReady": "파일",
    "workspace.readyToDownload": "다운로드 준비 완료",
    "interactive.cutReadyTitle": "누끼 완료",
    "workspace.generatedSuccess": "성공적으로 생성되었습니다",
    "ai.completedByAi": "AI로 처리 완료"
}

NO_NEW = {
    "interactive.copiedTitle": "Kopiert til utklippstavlen",
    "interactive.copiedBody": "Bildet ble kopiert i høy oppløsning. Klar til å limes inn.",
    "interactive.colorSampled": "Farge prøvetatt",
    "interactive.colorFixed": "Farge",
    "workspace.completed": "fullført",
    "workspace.fileReady": "Filen din",
    "workspace.readyToDownload": "er klar til nedlasting",
    "interactive.cutReadyTitle": "Utklipp klart",
    "workspace.generatedSuccess": "ble opprettet",
    "ai.completedByAi": "fullført av AI"
}

specific_maps = {
    'es': ES_NEW,
    'en': EN_NEW,
    'pt': PT_NEW,
    'fr': FR_NEW,
    'de': DE_NEW,
    'it': IT_NEW,
    'ca': CA_NEW,
    'gl': GL_NEW,
    'ja': JA_NEW,
    'zh': ZH_NEW,
    'zh_TW': ZH_NEW,
    'ru': RU_NEW,
    'uk': UK_NEW,
    'ko': KO_NEW,
    'no': NO_NEW
}

locale_dir = 'src/i18n/locales'

for f in sorted(os.listdir(locale_dir)):
    if f.endswith('.ts') and f != 'index.ts':
        lang_code = f.replace('.ts', '')
        loc_path = os.path.join(locale_dir, f)
        curr = parse_kv(loc_path)
        if lang_code in specific_maps:
            curr.update(specific_maps[lang_code])
        else:
            curr.update(EN_NEW)
        write_locale_file(loc_path, lang_code, curr)
        print(f"Updated {f}")

