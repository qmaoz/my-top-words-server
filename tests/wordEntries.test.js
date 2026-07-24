const { buildWordEntryKey, normalizeWordEntry, normalizeTranslationsMap } = require('../utils/wordEntries');

describe('wordEntries', () => {
  describe('buildWordEntryKey', () => {
    it('залежить лише від слова та речення (source)', () => {
      const a = { word_text: 'Haus', sentence_text: 'Das Haus ist groß.', translations: { uk: { word_translation: 'дім' } } };
      const b = { word_text: 'Haus', sentence_text: 'Das Haus ist groß.', translations: { uk: { word_translation: 'будинок' } } };
      expect(buildWordEntryKey(a)).toBe(buildWordEntryKey(b));
    });

    it('нормалізує регістр і пробіли', () => {
      expect(buildWordEntryKey({ word_text: '  Haus ', sentence_text: 'A' }))
        .toBe(buildWordEntryKey({ word_text: 'haus', sentence_text: 'a' }));
    });

    it('розрізняє різні source-пари', () => {
      expect(buildWordEntryKey({ word_text: 'Haus', sentence_text: 'A' }))
        .not.toBe(buildWordEntryKey({ word_text: 'Haus', sentence_text: 'B' }));
    });
  });

  describe('normalizeTranslationsMap', () => {
    it('відкидає непідтримувані мови та порожні переклади', () => {
      const result = normalizeTranslationsMap({
        uk: { word_translation: 'дім', sentence_translation: 'Дім великий.' },
        zz: { word_translation: 'x', sentence_translation: 'y' },
        ru: { word_translation: '', sentence_translation: '' },
      });
      expect(Object.keys(result)).toEqual(['uk']);
    });

    it('повертає порожній об\'єкт для некоректного входу', () => {
      expect(normalizeTranslationsMap(null)).toEqual({});
      expect(normalizeTranslationsMap('x')).toEqual({});
    });
  });

  describe('normalizeWordEntry', () => {
    it('нормалізує source та переклади', () => {
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
