const { validationResult } = require('express-validator');

const sequelize = require('../db');
const { consoleError } = require('../utils');
const { buildWordEntryKey } = require('../utils/wordEntries');
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

async function bulkImportWords(req, res) {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        source: 'Помилка під час масового імпорту слів',
        message: errors.array()[0].msg,
      });
    }

    const { wordSetId } = req.params;
    const { words } = req.body;
    const owner_user_id = req.userId;

    const wordSet = await WordSet.findByPk(wordSetId);
    if (!wordSet) {
      return res.status(404).json({
        source: 'Помилка під час масового імпорту слів',
        message: `Набір #${wordSetId} не знайдено`,
      });
    }

    const transaction = await sequelize.transaction();

    try {
      const existingWords = await Word.findAll({
        attributes: [
          'word_text',
          'word_translation_uk',
          'sentence_text',
          'sentence_translation_uk',
        ],
        include: [{
          model: WordSet,
          as: 'wordWordSets',
          where: { id: wordSetId },
          attributes: [],
          through: { attributes: [] },
        }],
        transaction,
      });

      const existingKeys = new Set(
        existingWords.map((word) => buildWordEntryKey(word)),
      );
      const batchKeys = new Set();
      const createdWords = [];
      let skipped = 0;

      for (const item of words) {
        const key = buildWordEntryKey(item);

        if (existingKeys.has(key) || batchKeys.has(key)) {
          skipped += 1;
          continue;
        }

        batchKeys.add(key);
        existingKeys.add(key);

        const word = await Word.create({
          owner_user_id,
          word_text: item.word_text,
          word_translation_uk: item.word_translation_uk,
          sentence_text: item.sentence_text,
          sentence_translation_uk: item.sentence_translation_uk,
        }, { transaction });

        await WordsWordSets.create({
          word_id: word.id,
          word_set_id: wordSetId,
        }, { transaction });

        createdWords.push(word);
      }

      await transaction.commit();

      res.status(201).json({
        words: createdWords.map((word) => word.get({ plain: true })),
        count: createdWords.length,
        skipped,
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    consoleError('Помилка під час масового імпорту слів: ' + error.message);
    res.status(500).json({
      source: 'Помилка під час масового імпорту слів',
      message: error.message,
    });
  }
}

module.exports = { toggleIncludeWordInWordSet, bulkImportWords };
