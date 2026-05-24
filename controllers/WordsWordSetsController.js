const { Sequelize } = require('sequelize');

const { UsersWordSets, WordSet } = require('../models/models');
const { consoleError } = require('../utils');

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

async function removeFromSet(req, res) {
  try {
    const { wordSetId, wordId } = req.params;
    
    const wordSet = await WordSet.findByPk(wordSetId);
    if (!wordSet) {
      return res.status(404).json({
        source: 'Помилка під час видалення слів з набору',
        message: `Набір #${wordSetId} не знайдено`
      });
    }
    
    await wordSet.removeWordSetWords(wordId);
    res.json({ message: 'Слово успішно видалено з набору' });
  } catch (error) {
    consoleError('Помилка під час видалення слів з набору: ' + error.message);
    res.status(500).json({
      source: 'Помилка під час видалення слів з набору',
      message: error.message
    });
  }
}

module.exports = { updateWordSetWords, removeFromSet };