const {
  normalizeSourceLocale,
  normalizeTranslationLocales,
  isSupportedLocale,
} = require('../utils/locales');

describe('locales', () => {
  describe('normalizeSourceLocale', () => {
    it('returns a supported locale', () => {
      expect(normalizeSourceLocale('en')).toBe('en');
    });

    it('falls back to de for an unsupported locale', () => {
      expect(normalizeSourceLocale('xx')).toBe('de');
      expect(normalizeSourceLocale(null)).toBe('de');
    });
  });

  describe('normalizeTranslationLocales', () => {
    it('removes duplicates and keeps order', () => {
      expect(normalizeTranslationLocales(['ru', 'uk', 'ru'])).toEqual(['ru', 'uk']);
    });

    it('rejects unsupported locales', () => {
      expect(normalizeTranslationLocales(['uk', 'zz', 'en'])).toEqual(['uk', 'en']);
    });

    it('falls back to [uk] when the list is empty or invalid', () => {
      expect(normalizeTranslationLocales([])).toEqual(['uk']);
      expect(normalizeTranslationLocales(null)).toEqual(['uk']);
      expect(normalizeTranslationLocales(['zz'])).toEqual(['uk']);
    });

    it('does not limit the number of locales', () => {
      const many = ['uk', 'ru', 'en', 'pl', 'es', 'fr', 'it', 'ar', 'hi', 'ml', 'tr', 'el', 'zh', 'ku'];
      expect(normalizeTranslationLocales(many)).toEqual(many);
    });
  });

  it('isSupportedLocale works', () => {
    expect(isSupportedLocale('de')).toBe(true);
    expect(isSupportedLocale('zz')).toBe(false);
  });
});
