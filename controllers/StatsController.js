const { User, Word, WordSet } = require('../models/models');
const { respondServerError } = require('../utils/apiResponse');

async function getPublic(req, res) {
  try {
    const [usersCount, wordsCount, wordSetsCount] = await Promise.all([
      User.count(),
      Word.count(),
      WordSet.count(),
    ]);

    res.json({
      usersCount,
      wordsCount,
      wordSetsCount,
    });
  } catch (error) {
    return respondServerError(res, 'Failed to load stats', error);
  }
}

module.exports = { getPublic };
