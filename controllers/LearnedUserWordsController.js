const { LearnedUserWords, Word } = require('../models/models');
const { respondServerError } = require('../utils/apiResponse');
const { canUserAccessWord } = require('../utils/wordAccess');

async function toggleLearned(req, res) {
  try {
    const { wordId } = req.params;
    const userId = req.userId;

    const { allowed, word } = await canUserAccessWord(wordId, userId);
    if (!word) {
      return res.status(404).json({
        source: 'Помилка при зміні статусу слова',
        message: `Слово #${wordId} не знайдено`
      });
    }

    if (!allowed) {
      return res.status(403).json({
        source: 'Помилка при зміні статусу слова',
        message: 'Доступ до цього слова заборонено',
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
    return respondServerError(res, 'Помилка при зміні статусу слова', error);
  }
}

module.exports = { toggleLearned };
