const { Op } = require('sequelize');
const {
  Word,
  WordTranslation,
  WordsWordSets,
  LearnedUserWords,
  UserWordProgress,
} = require('../models/models');

/**
 * Deletes words and all dependent rows that may block FK constraints
 * (translations, set links, learned marks, review progress).
 */
async function deleteWordsCascade(wordIds, transaction) {
  const ids = [...new Set((wordIds ?? []).map(Number).filter((id) => Number.isFinite(id) && id > 0))];
  if (ids.length === 0) {
    return 0;
  }

  const whereWordId = { word_id: { [Op.in]: ids } };

  await WordTranslation.destroy({ where: whereWordId, transaction });
  await UserWordProgress.destroy({ where: whereWordId, transaction });
  await LearnedUserWords.destroy({ where: whereWordId, transaction });
  await WordsWordSets.destroy({ where: whereWordId, transaction });
  return Word.destroy({
    where: { id: { [Op.in]: ids } },
    transaction,
  });
}

module.exports = { deleteWordsCascade };
