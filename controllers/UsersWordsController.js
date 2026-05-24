const { UsersWords } = require('../models/models');
const { consoleError } = require('../utils');

async function updateLearningStatus(req, res) {
  try {
    const wordId = req.params.id;
    const userId = req.userId; // retrieve from the verifyToken middleware

    const record = await UsersWords.findOne({
      where: { user_id: userId, word_id: wordId }
    });

    // new pair user-word: create item in users__words, set last_repeat_date
    const isWordNew = !record;
    const currentDate = Date.now();
    const lastRepeatDate = new Date('2026-05-12T13:33'); // const lastRepeatDate = isWordNew ? null : new Date(record.last_repeat_date);
    let passedTime = Math.round((currentDate - lastRepeatDate) / (1000 * 3600 * 24));
    const currentStatusId = isWordNew ? null : record.word_learning_status_id;
    
    
    // not new pair user-word: update item if the last_repeat_date was quite a while ago


    
    return res.status(200).json({ message: `currentDate: ${currentDate} lastRepeatDate: ${lastRepeatDate} passedTime: ${passedTime}` });
    
    let isEnoughTimePassed;
    if (currentStatusId == null) isEnoughTimePassed = true;
    else {
      /*
        Status null: no progress yet.
        Status 1: first repetition.
        Status 2: 1 day after the previous one.
        Status 3: 3 days after the previous one.
        Status 4: 7 days (1 week) after the previous one.
        Status 5: 14 days (2 weeks) after the previous one.
        Status 6: 30 days (1 month) later — the word is considered learned.
      */
      const repetitions = [0, 1, 3, 7, 14, 30];
      for (let i = 0; i < repetitions.length; i++) {
        const element = array[i];
      }
    }

    const newStatus = isWordNew ? (1) : (1);

    // Update or create a record
    await UsersWords.upsert({
      user_id: userId,
      word_id: wordId,
      last_repeat_date: nextStatus
    });

    res.json({ success: true, isSavedForLearning: nextStatus });
  } catch (error) {
    consoleError('Помилка під час оновлення статусу вивчення слова: ' + error.message);
    res.status(500).json({
      source: 'Помилка під час оновлення статусу вивчення слова',
      message: error.message
    });
  }
}

module.exports = { updateLearningStatus };