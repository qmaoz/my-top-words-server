function buildWordEntryKey(word) {
  return [
    word.word_text,
    word.word_translation_uk,
    word.sentence_text,
    word.sentence_translation_uk,
  ].map((value) => String(value).trim().toLowerCase()).join('\u0001');
}

function normalizeWordEntry(word) {
  return {
    word_text: String(word.word_text ?? '').trim(),
    word_translation_uk: String(word.word_translation_uk ?? '').trim(),
    sentence_text: String(word.sentence_text ?? '').trim(),
    sentence_translation_uk: String(word.sentence_translation_uk ?? '').trim(),
  };
}

module.exports = { buildWordEntryKey, normalizeWordEntry };
