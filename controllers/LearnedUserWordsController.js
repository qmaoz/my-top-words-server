const { LearnedUserWords, Word } = require('../models/models');
const { consoleError } = require('../utils');

async function toggleLearned(req, res) {
  try {
    const { wordId } = req.params;
    const userId = req.userId;

    const word = await Word.findByPk(wordId);
    if (!word) {
      return res.status(404).json({
        source: 'Помилка при зміні статусу слова',
        message: `Слово #${wordId} не знайдено`
      });
    }

    const existingRecord = await LearnedUserWords.findOne({
      where: {
        user_id: userId,
        word_id: wordId
      }
    });

    const nextStatus = existingRecord ? false : true;

    if (nextStatus === true) {
      await LearnedUserWords.create({
        user_id: userId,
        word_id: wordId
      });
    } else {
      await existingRecord.destroy();
    }

    res.json({
      success: true,
      isLearned: nextStatus
    });
  } catch (error) {
    consoleError('Помилка при зміні статусу слова: ' + error.message);
    res.status(500).json({
      source: 'Помилка при зміні статусу слова',
      message: error.message
    });
  }
}

module.exports = { toggleLearned };
