const VISIBILITY_LEVELS = ['private', 'unlisted', 'public'];

function normalizeVisibility(wordSet) {
  if (!wordSet) return 'private';
  if (wordSet.visibility && VISIBILITY_LEVELS.includes(wordSet.visibility)) {
    return wordSet.visibility;
  }
  if (wordSet.is_public) return 'public';
  return 'private';
}

function canAccessWordSet(wordSet, userId) {
  if (!wordSet) return false;
  if (wordSet.owner_user_id == null) return true;
  if (userId != null && Number(wordSet.owner_user_id) === Number(userId)) return true;

  const visibility = normalizeVisibility(wordSet);
  return visibility === 'public' || visibility === 'unlisted';
}

function isListedOnHome(wordSet) {
  return normalizeVisibility(wordSet) === 'public';
}

function buildPublicListingCondition(Sequelize) {
  return {
    [Sequelize.Op.or]: [
      { visibility: 'public' },
      {
        visibility: { [Sequelize.Op.is]: null },
        is_public: true,
      },
    ],
  };
}

module.exports = {
  VISIBILITY_LEVELS,
  normalizeVisibility,
  canAccessWordSet,
  isListedOnHome,
  buildPublicListingCondition,
};
