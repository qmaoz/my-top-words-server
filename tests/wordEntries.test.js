const { buildWordEntryKey, normalizeWordEntry, normalizeTranslationsMap } = require('../utils/wordEntries');

describe('wordEntries', () => {
  describe('buildWordEntryKey', () => {
    it('depends only on the source word and sentence', () => {
      const a = { word_text: 'Haus', sentence_text: 'Das Haus ist groß.', translations: { uk: { word_translation: 'дім' } } };
      const b = { word_text: 'Haus', sentence_text: 'Das Haus ist groß.', translations: { uk: { word_translation: 'будинок' } } };
      expect(buildWordEntryKey(a)).toBe(buildWordEntryKey(b));
    });

    it('normalizes case and whitespace', () => {
      expect(buildWordEntryKey({ word_text: '  Haus ', sentence_text: 'A' }))
        .toBe(buildWordEntryKey({ word_text: 'haus', sentence_text: 'a' }));
    });

    it('distinguishes different source pairs', () => {
      expect(buildWordEntryKey({ word_text: 'Haus', sentence_text: 'A' }))
        .not.toBe(buildWordEntryKey({ word_text: 'Haus', sentence_text: 'B' }));
    });
  });

  describe('normalizeTranslationsMap', () => {
    it('rejects unsupported locales and empty translations', () => {
      const result = normalizeTranslationsMap({
        uk: { word_translation: 'дім', sentence_translation: 'Дім великий.' },
        zz: { word_translation: 'x', sentence_translation: 'y' },
        ru: { word_translation: '', sentence_translation: '' },
      });
      expect(Object.keys(result)).toEqual(['uk']);
    });

    it('returns an empty object for invalid input', () => {
      expect(normalizeTranslationsMap(null)).toEqual({});
      expect(normalizeTranslationsMap('x')).toEqual({});
    });
  });

  describe('normalizeWordEntry', () => {
    it('normalizes source and translations', () => {
      const entry = normalizeWordEntry({
        word_text: '  Haus ',
        sentence_text: ' Das Haus. ',
        translations: { uk: { word_translation: ' дім ', sentence_translation: ' Дім. ' } },
      });
      expect(entry.word_text).toBe('Haus');
      expect(entry.sentence_text).toBe('Das Haus.');
      expect(entry.translations.uk).toEqual({ word_translation: 'дім', sentence_translation: 'Дім.' });
    });
  });
});
