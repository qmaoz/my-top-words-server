const { Sequelize } = require('sequelize');

const { consoleError } = require('../utils');
const { WordSet, WordsWordSets, Word } = require('../models/models');

async function toggleIncludeWordInWordSet(req, res) {
  try {
    const { wordId, wordSetId } = req.params;
    
    const wordSet = await WordSet.findByPk(wordSetId);
    if (!wordSet) {
      return res.status(404).json({
        source: 'Помилка під час видалення слів з набору або додавання слів в набір ',
        message: `Набір #${wordSetId} не знайдено`
      });
    }
    const word = await Word.findByPk(wordId);
    if (!word) {
      return res.status(404).json({
        source: 'Помилка під час видалення слів з набору або додавання слів в набір ',
        message: `Слово #${wordId} не знайдено`
      });
    }

    const existingRecord = await WordsWordSets.findOne({
      where: {
        word_id: wordId,
        word_set_id: wordSetId
      }
    });

    const actionName = existingRecord ? 'remove' : 'include';
    

    if (actionName === 'include') {
      await WordsWordSets.create({
        word_id: wordId,
        word_set_id: wordSetId
      });
      
    } else if (actionName === 'remove') {
      await existingRecord.destroy();
    }

    res.json({
      success: true,
      actionName,
      word: actionName == 'include' ? word.dataValues : undefined,
      message: `Слово успішно ${actionName == 'remove' ? 'видалено з набору' : 'додано в набір'}`
    });
  } catch (error) {
    consoleError('Помилка під час видалення слів з набору або додавання слів в набір: ' + error.message);
    res.status(500).json({
      source: 'Помилка під час видалення слів з набору або додавання слів в набір',
      message: error.message
    });
  }
}

module.exports = { toggleIncludeWordInWordSet };