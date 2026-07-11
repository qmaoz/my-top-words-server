const { Word, WordSet } = require('../models/models');
const { canAccessWordSet } = require('./wordSetVisibility');

async function canUserAccessWord(wordId, userId) {
  const word = await Word.findByPk(wordId);
  if (!word) {
    return { allowed: false, word: null };
  }

  if (userId != null && word.owner_user_id != null && Number(word.owner_user_id) === Number(userId)) {
    return { allowed: true, word };
  }

  const relatedWordSets = await WordSet.findAll({
    attributes: ['id', 'owner_user_id', 'visibility', 'is_public'],
    include: [{
      model: Word,
      as: 'wordSetWords',
      where: { id: wordId },
      attributes: [],
      through: { attributes: [] },
      required: true,
    }],
  });

  const hasAccessibleSet = relatedWordSets.some((wordSet) =>
    canAccessWordSet(wordSet.get({ plain: true }), userId)
  );

  return { allowed: hasAccessibleSet, word };
}

module.exports = { canUserAccessWord };
