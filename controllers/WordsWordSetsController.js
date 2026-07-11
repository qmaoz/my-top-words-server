const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

const sequelize = require('../db');
const { consoleError } = require('../utils');
const { respondServerError } = require('../utils/apiResponse');
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
      if (word.owner_user_id != null && Number(word.owner_user_id) !== Number(req.userId)) {
        return res.status(403).json({
          source: 'Помилка під час видалення слів з набору або додавання слів в набір ',
          message: 'Доступ заборонено',
        });
      }

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
    return respondServerError(res, 'Помилка під час видалення слів з набору або додавання слів в набір', error);
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
    return respondServerError(res, 'Помилка під час масового імпорту слів', error);
  }
}

async function clearWordSet(req, res) {
  try {
    const { wordSetId } = req.params;
    const userId = Number(req.userId);
    const wordSetIdNum = Number(wordSetId);

    const wordSet = await WordSet.findByPk(wordSetIdNum);
    if (!wordSet) {
      return res.status(404).json({
        source: 'Помилка під час очищення набору',
        message: `Набір #${wordSetId} не знайдено`,
      });
    }

    const links = await WordsWordSets.findAll({
      where: { word_set_id: wordSetIdNum },
      attributes: ['word_id'],
    });

    if (links.length === 0) {
      return res.json({
        success: true,
        cleared: 0,
        deleted: 0,
        unlinked: 0,
      });
    }

    const wordIds = links.map((link) => link.word_id);
    const words = await Word.findAll({
      where: { id: { [Op.in]: wordIds } },
      attributes: ['id', 'owner_user_id'],
      include: [{
        model: WordSet,
        as: 'wordWordSets',
        attributes: ['id'],
        through: { attributes: [] },
      }],
    });

    const toDelete = [];
    const toUnlink = [];

    for (const word of words) {
      const setIds = word.wordWordSets.map((item) => Number(item.id));
      const isOwner = word.owner_user_id != null && Number(word.owner_user_id) === userId;
      const onlyInThisSet = setIds.length === 1 && setIds[0] === wordSetIdNum;

      if (isOwner && onlyInThisSet) {
        toDelete.push(word.id);
      } else {
        toUnlink.push(word.id);
      }
    }

    const transaction = await sequelize.transaction();

    try {
      if (toUnlink.length > 0) {
        await WordsWordSets.destroy({
          where: {
            word_set_id: wordSetIdNum,
            word_id: { [Op.in]: toUnlink },
          },
          transaction,
        });
      }

      if (toDelete.length > 0) {
        await Word.destroy({
          where: { id: { [Op.in]: toDelete } },
          transaction,
        });
      }

      await transaction.commit();

      res.json({
        success: true,
        cleared: words.length,
        deleted: toDelete.length,
        unlinked: toUnlink.length,
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    return respondServerError(res, 'Помилка під час очищення набору', error);
  }
}

module.exports = { toggleIncludeWordInWordSet, bulkImportWords, clearWordSet };
