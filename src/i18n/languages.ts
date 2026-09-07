export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  speechCode: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', speechCode: 'es-ES' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', speechCode: 'en-US' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷', speechCode: 'pt-BR' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', speechCode: 'fr-FR' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', speechCode: 'de-DE' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', speechCode: 'it-IT' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', speechCode: 'ja-JP' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文', flag: '🇨🇳', speechCode: 'zh-CN' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', flag: '🇹🇼', speechCode: 'zh-TW' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', speechCode: 'ko-KR' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', speechCode: 'ru-RU' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', speechCode: 'ar-SA' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', speechCode: 'hi-IN' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', speechCode: 'tr-TR' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱', speechCode: 'nl-NL' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱', speechCode: 'pl-PL' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', speechCode: 'vi-VN' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', speechCode: 'id-ID' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦', speechCode: 'uk-UA' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭', speechCode: 'th-TH' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪', speechCode: 'sv-SE' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿', speechCode: 'cs-CZ' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷', speechCode: 'el-GR' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', flag: '🇷🇴', speechCode: 'ro-RO' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺', speechCode: 'hu-HU' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰', speechCode: 'da-DK' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮', speechCode: 'fi-FI' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴', speechCode: 'nb-NO' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱', speechCode: 'he-IL' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾', speechCode: 'ms-MY' },
  { code: 'fil', name: 'Filipino', nativeName: 'Filipino', flag: '🇵🇭', speechCode: 'fil-PH' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩', speechCode: 'bn-BD' },
  { code: 'ca', name: 'Catalan', nativeName: 'Català', flag: '🇪🇸', speechCode: 'ca-ES' },
  { code: 'eu', name: 'Basque', nativeName: 'Euskara', flag: '🇪🇸', speechCode: 'eu-ES' },
  { code: 'gl', name: 'Galician', nativeName: 'Galego', flag: '🇪🇸', speechCode: 'gl-ES' }
];

export type LanguageCode =
  | 'es' | 'en' | 'pt' | 'fr' | 'de' | 'it' | 'ja' | 'zh' | 'zh-TW'
  | 'ko' | 'ru' | 'ar' | 'hi' | 'tr' | 'nl' | 'pl' | 'vi' | 'id'
  | 'uk' | 'th' | 'sv' | 'cs' | 'el' | 'ro' | 'hu' | 'da' | 'fi'
  | 'no' | 'he' | 'ms' | 'fil' | 'bn' | 'ca' | 'eu' | 'gl';

