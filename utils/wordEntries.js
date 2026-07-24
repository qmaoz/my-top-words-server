const { isSupportedLocale } = require('./locales');

// Duplicate detection depends only on the studied source pair (word + sentence),
// not on translations — translations may differ across languages for the same source.
function buildWordEntryKey(word) {
  return [
    word.word_text,
    word.sentence_text,
  ].map((value) => String(value ?? '').trim().toLowerCase()).join('\u0001');
}

function normalizeTranslationsMap(translations) {
  const result = {};
  if (!translations || typeof translations !== 'object') return result;

  for (const [locale, value] of Object.entries(translations)) {
    if (!isSupportedLocale(locale) || !value || typeof value !== 'object') continue;

    const word_translation = String(value.word_translation ?? '').trim();
    const sentence_translation = String(value.sentence_translation ?? '').trim();

    if (word_translation === '' && sentence_translation === '') continue;

    result[locale] = { word_translation, sentence_translation };
  }

  return result;
}

function normalizeWordEntry(word) {
  return {
    word_text: String(word.word_text ?? '').trim(),
    sentence_text: String(word.sentence_text ?? '').trim(),
    translations: normalizeTranslationsMap(word.translations),
  };
}

module.exports = { buildWordEntryKey, normalizeWordEntry, normalizeTranslationsMap };
