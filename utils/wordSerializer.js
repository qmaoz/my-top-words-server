// Turns a Word row (with an included `translations` array, or legacy _uk columns)
// into the API shape used by the client: a translations map keyed by locale,
// plus derived `*_uk` fields kept for backward compatibility.
function serializeWord(word) {
  if (!word) return word;

  const plain = typeof word.get === 'function' ? word.get({ plain: true }) : { ...word };

  // Prefer association/dataValues translations; fall back to a manually attached array
  // (e.g. right after bulk create, before reload).
  const translationRows = Array.isArray(plain.translations)
    ? plain.translations
    : (Array.isArray(word.translations) ? word.translations : null);

  const translations = {};

  if (Array.isArray(translationRows)) {
    for (const row of translationRows) {
      if (!row?.locale) continue;
      translations[row.locale] = {
        word_translation: row.word_translation ?? '',
        sentence_translation: row.sentence_translation ?? '',
      };
    }
  }

  // Fall back to legacy columns if no uk translation row exists yet.
  if (!translations.uk && (plain.word_translation_uk != null || plain.sentence_translation_uk != null)) {
    translations.uk = {
      word_translation: plain.word_translation_uk ?? '',
      sentence_translation: plain.sentence_translation_uk ?? '',
    };
  }

  const result = {
    id: plain.id,
    word_text: plain.word_text,
    sentence_text: plain.sentence_text,
    translations,
    word_translation_uk: translations.uk?.word_translation ?? null,
    sentence_translation_uk: translations.uk?.sentence_translation ?? null,
  };

  if ('isLearned' in plain) {
    result.isLearned = plain.isLearned;
  }

  if ('nextAt' in plain) {
    result.nextAt = plain.nextAt;
  }

  if ('hasProgress' in plain) {
    result.hasProgress = plain.hasProgress;
  }

  if ('reviewStage' in plain) {
    result.reviewStage = plain.reviewStage;
  }

  return result;
}

module.exports = { serializeWord };
