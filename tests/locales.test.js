const {
  normalizeSourceLocale,
  normalizeTranslationLocales,
  isSupportedLocale,
} = require('../utils/locales');

describe('locales', () => {
  describe('normalizeSourceLocale', () => {
    it('повертає підтримувану мову', () => {
      expect(normalizeSourceLocale('en')).toBe('en');
    });

    it('падає до de для непідтримуваної мови', () => {
      expect(normalizeSourceLocale('xx')).toBe('de');
      expect(normalizeSourceLocale(null)).toBe('de');
    });
  });

  describe('normalizeTranslationLocales', () => {
    it('прибирає дублікати та зберігає порядок', () => {
      expect(normalizeTranslationLocales(['ru', 'uk', 'ru'])).toEqual(['ru', 'uk']);
    });

    it('відкидає непідтримувані мови', () => {
      expect(normalizeTranslationLocales(['uk', 'zz', 'en'])).toEqual(['uk', 'en']);
    });

    it('падає до [uk], якщо список порожній або некоректний', () => {
      expect(normalizeTranslationLocales([])).toEqual(['uk']);
      expect(normalizeTranslationLocales(null)).toEqual(['uk']);
      expect(normalizeTranslationLocales(['zz'])).toEqual(['uk']);
    });

    it('не обмежує кількість мов (дозволяє багато)', () => {
      const many = ['uk', 'ru', 'en', 'pl', 'es', 'fr', 'it', 'ar', 'hi', 'ml', 'tr', 'el', 'zh', 'ku'];
      expect(normalizeTranslationLocales(many)).toEqual(many);
    });
  });

  it('isSupportedLocale працює', () => {
    expect(isSupportedLocale('de')).toBe(true);
    expect(isSupportedLocale('zz')).toBe(false);
  });
});
