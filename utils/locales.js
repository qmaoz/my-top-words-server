const SUPPORTED_LOCALES = [
  { code: 'de', en: 'German', native: 'Deutsch', dir: 'ltr' },
  { code: 'uk', en: 'Ukrainian', native: 'Українська', dir: 'ltr' },
  { code: 'ru', en: 'Russian', native: 'Русский', dir: 'ltr' },
  { code: 'en', en: 'English', native: 'English', dir: 'ltr' },
  { code: 'ar', en: 'Arabic', native: 'العربية', dir: 'rtl' },
  { code: 'hi', en: 'Hindi', native: 'हिन्दी', dir: 'ltr' },
  { code: 'ml', en: 'Malayalam', native: 'മലയാളം', dir: 'ltr' },
  { code: 'tr', en: 'Turkish', native: 'Türkçe', dir: 'ltr' },
  { code: 'el', en: 'Greek', native: 'Ελληνικά', dir: 'ltr' },
  { code: 'zh', en: 'Chinese', native: '中文', dir: 'ltr' },
  { code: 'ku', en: 'Kurdish', native: 'Kurdî', dir: 'ltr' },
  { code: 'pl', en: 'Polish', native: 'Polski', dir: 'ltr' },
  { code: 'es', en: 'Spanish', native: 'Español', dir: 'ltr' },
  { code: 'fr', en: 'French', native: 'Français', dir: 'ltr' },
  { code: 'it', en: 'Italian', native: 'Italiano', dir: 'ltr' },
  { code: 'pt', en: 'Portuguese', native: 'Português', dir: 'ltr' },
  { code: 'bn', en: 'Bengali', native: 'বাংলা', dir: 'ltr' },
  { code: 'id', en: 'Indonesian', native: 'Bahasa Indonesia', dir: 'ltr' },
  { code: 'ja', en: 'Japanese', native: '日本語', dir: 'ltr' },
  { code: 'vi', en: 'Vietnamese', native: 'Tiếng Việt', dir: 'ltr' },
];

const LOCALE_BY_CODE = new Map(SUPPORTED_LOCALES.map((locale) => [locale.code, locale]));

const DEFAULT_SOURCE_LOCALE = 'de';
const DEFAULT_TRANSLATION_LOCALES = ['uk'];

function isSupportedLocale(code) {
  return LOCALE_BY_CODE.has(code);
}

function getLocale(code) {
  return LOCALE_BY_CODE.get(code) ?? null;
}

function normalizeSourceLocale(code) {
  return isSupportedLocale(code) ? code : DEFAULT_SOURCE_LOCALE;
}

function normalizeTranslationLocales(locales) {
  const list = Array.isArray(locales) ? locales : [];
  const seen = new Set();
  const result = [];

  for (const code of list) {
    if (isSupportedLocale(code) && !seen.has(code)) {
      seen.add(code);
      result.push(code);
    }
  }

  return result.length > 0 ? result : [...DEFAULT_TRANSLATION_LOCALES];
}

module.exports = {
  SUPPORTED_LOCALES,
  DEFAULT_SOURCE_LOCALE,
  DEFAULT_TRANSLATION_LOCALES,
  isSupportedLocale,
  getLocale,
  normalizeSourceLocale,
  normalizeTranslationLocales,
};
