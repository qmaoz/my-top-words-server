const { User, Word, WordSet } = require('../models/models');
const { consoleError } = require('../utils');

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
    consoleError('Помилка під час отримання статистики: ' + error.message);
    res.status(500).json({
      source: 'Помилка під час отримання статистики',
      message: error.message,
    });
  }
}

module.exports = { getPublic };
