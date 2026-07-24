const { serializeWord } = require('../utils/wordSerializer');

describe('serializeWord', () => {
  it('будує мапу translations з масиву перекладів', () => {
    const result = serializeWord({
      id: 1,
      word_text: 'Haus',
      sentence_text: 'Das Haus ist groß.',
      translations: [
        { locale: 'uk', word_translation: 'дім', sentence_translation: 'Дім великий.' },
        { locale: 'ru', word_translation: 'дом', sentence_translation: 'Дом большой.' },
      ],
    });

    expect(result.translations.uk).toEqual({ word_translation: 'дім', sentence_translation: 'Дім великий.' });
    expect(result.translations.ru).toEqual({ word_translation: 'дом', sentence_translation: 'Дом большой.' });
    expect(result.word_translation_uk).toBe('дім');
    expect(result.sentence_translation_uk).toBe('Дім великий.');
  });

  it('падає до legacy-колонок, якщо немає рядка uk', () => {
    const result = serializeWord({
      id: 2,
      word_text: 'Katze',
      sentence_text: 'Die Katze schläft.',
      word_translation_uk: 'кіт',
      sentence_translation_uk: 'Кіт спить.',
      translations: [],
    });

    expect(result.translations.uk).toEqual({ word_translation: 'кіт', sentence_translation: 'Кіт спить.' });
  });

  it('зберігає isLearned, якщо присутнє', () => {
    const result = serializeWord({ id: 3, word_text: 'a', sentence_text: 'b', translations: [], isLearned: true });
    expect(result.isLearned).toBe(true);
  });

  it('word_translation_uk = null, якщо немає перекладу uk', () => {
    const result = serializeWord({
      id: 4,
      word_text: 'a',
      sentence_text: 'b',
      translations: [{ locale: 'en', word_translation: 'x', sentence_translation: 'y' }],
    });
    expect(result.word_translation_uk).toBeNull();
    expect(result.translations.en.word_translation).toBe('x');
  });
});
