const { Sequelize } = require('sequelize');

const { consoleError } = require('../utils');
const { UsersWordSets, WordSet, WordsWordSets, Word } = require('../models/models');

async function updateWordSetWords(req, res) {
  try {
    const wordSetId = req.params.id;
    const { wordIds } = req.body;
    const userId = req.userId;

    const wordSet = await WordSet.findByPk(wordSetId);
    if (!wordSet) {
      return res.status(404).json({
        source: 'Помилка під час оновлення вмісту набору',
        message: `Набір #${wordSetId} не знайдено`
      });
    }

    if (wordSet.owner_user_id !== userId) {
      return res.status(403).json({
        source: 'Помилка під час оновлення вмісту набору',
        message: 'У Вас немає доступу до цього набору'
      });
    }

    await wordSet.setWordSetWords(wordIds);
    const updatedWords = await wordSet.getWordSetWords(); 
    res.json({
      message: 'Склад набору успішно оновлено',
      words: updatedWords
    });
  } catch (error) {
    consoleError('Помилка під час оновлення вмісту набору: ' + error.message);
    res.status(500).json({
      source: 'Помилка під час оновлення вмісту набору',
      message: error.message
    });
  }
}

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
      // console.log('include');
      
    } else if (actionName === 'remove') {
      // console.log('remove');
      await existingRecord.destroy();
    }

    // console.log('actionName: ', actionName);
    // console.log('word.dataValues: ', word.dataValues);

    // const test = {
    //   success: true,
    //   actionName,
    //   word: actionName == 'include' ? word.dataValues : undefined,
    //   message: `Слово успішно ${actionName == 'remove' ? 'видалено з набору' : 'додано в набір'}`
    // };

    // console.log('test: ', test);
    
    
    // await wordSet.removeWordSetWords(wordId);
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

module.exports = { updateWordSetWords, toggleIncludeWordInWordSet };