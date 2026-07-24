const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

const sequelize = require('../db');
const { consoleError } = require('../utils');
const { respondServerError } = require('../utils/apiResponse');
const { buildWordEntryKey, normalizeWordEntry } = require('../utils/wordEntries');
const { serializeWord } = require('../utils/wordSerializer');
const { deleteWordsCascade } = require('../utils/deleteWordsCascade');
const { WordSet, WordsWordSets, Word, WordTranslation } = require('../models/models');

async function toggleIncludeWordInWordSet(req, res) {
  try {
    const { wordId, wordSetId } = req.params;

    const wordSet = await WordSet.findByPk(wordSetId);
    if (!wordSet) {
      return res.status(404).json({
        source: 'Failed to update words in the set',
        message: `Set #${wordSetId} not found`
      });
    }
    const word = await Word.findByPk(wordId);
    if (!word) {
      return res.status(404).json({
        source: 'Failed to update words in the set',
        message: `Word #${wordId} not found`
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
          source: 'Failed to update words in the set',
          message: 'Access denied',
        });
      }

      await WordsWordSets.create({
        word_id: wordId,
        word_set_id: wordSetId
      });
    } else if (actionName === 'remove') {
      await existingRecord.destroy();
    }

    let serializedWord;
    if (actionName === 'include') {
      const withTranslations = await Word.findByPk(wordId, {
        include: [{
          model: WordTranslation,
          as: 'translations',
          attributes: ['locale', 'word_translation', 'sentence_translation'],
        }],
      });
      serializedWord = serializeWord(withTranslations ?? word);
    }

    res.json({
      success: true,
      actionName,
      word: serializedWord,
      message: `Word successfully ${actionName == 'remove' ? 'removed from the set' : 'added to the set'}`
    });
  } catch (error) {
    return respondServerError(res, 'Failed to update words in the set', error);
  }
}

async function bulkImportWords(req, res) {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        source: 'Failed to import words',
        message: errors.array()[0].msg,
      });
    }

    const { wordSetId } = req.params;
    const { words } = req.body;
    const owner_user_id = req.userId;

    const wordSet = await WordSet.findByPk(wordSetId);
    if (!wordSet) {
      return res.status(404).json({
        source: 'Failed to import words',
        message: `Set #${wordSetId} not found`,
      });
    }

    const transaction = await sequelize.transaction();

    try {
      const existingWords = await Word.findAll({
        attributes: ['word_text', 'sentence_text'],
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

      for (const rawItem of words) {
        const item = normalizeWordEntry(rawItem);
        const key = buildWordEntryKey(item);

        if (existingKeys.has(key) || batchKeys.has(key)) {
          skipped += 1;
          continue;
        }

        batchKeys.add(key);
        existingKeys.add(key);

        const ukTranslation = item.translations.uk;

        const word = await Word.create({
          owner_user_id,
          word_text: item.word_text,
          sentence_text: item.sentence_text,
          word_translation_uk: ukTranslation?.word_translation ?? null,
          sentence_translation_uk: ukTranslation?.sentence_translation ?? null,
        }, { transaction });

        const translationRows = Object.entries(item.translations).map(([locale, value]) => ({
          word_id: word.id,
          locale,
          word_translation: value.word_translation,
          sentence_translation: value.sentence_translation,
        }));

        if (translationRows.length > 0) {
          await WordTranslation.bulkCreate(translationRows, { transaction });
        }

        await WordsWordSets.create({
          word_id: word.id,
          word_set_id: wordSetId,
        }, { transaction });

        word.translations = translationRows;
        createdWords.push(word);
      }

      await transaction.commit();

      res.status(201).json({
        words: createdWords.map((word) => serializeWord({
          ...(typeof word.get === 'function' ? word.get({ plain: true }) : word),
          translations: word.translations,
        })),
        count: createdWords.length,
        skipped,
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    return respondServerError(res, 'Failed to import words', error);
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
        source: 'Failed to clear the set',
        message: `Set #${wordSetId} not found`,
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
        await deleteWordsCascade(toDelete, transaction);
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
    return respondServerError(res, 'Failed to clear the set', error);
  }
}

function translationMapsEqual(left, right) {
  const leftMap = left && typeof left === 'object' ? left : {};
  const rightMap = right && typeof right === 'object' ? right : {};
  const locales = new Set([...Object.keys(leftMap), ...Object.keys(rightMap)]);

  for (const locale of locales) {
    const a = leftMap[locale] ?? {};
    const b = rightMap[locale] ?? {};
    if (String(a.word_translation ?? '').trim() !== String(b.word_translation ?? '').trim()) {
      return false;
    }
    if (String(a.sentence_translation ?? '').trim() !== String(b.sentence_translation ?? '').trim()) {
      return false;
    }
  }

  return true;
}

async function replaceWordTranslations(wordId, translations, transaction) {
  const locales = Object.keys(translations);

  if (locales.length === 0) {
    await WordTranslation.destroy({ where: { word_id: wordId }, transaction });
    return;
  }

  await WordTranslation.destroy({
    where: {
      word_id: wordId,
      locale: { [Op.notIn]: locales },
    },
    transaction,
  });

  for (const [locale, value] of Object.entries(translations)) {
    await WordTranslation.upsert({
      word_id: Number(wordId),
      locale,
      word_translation: value.word_translation,
      sentence_translation: value.sentence_translation,
    }, { transaction });
  }
}

async function syncWordSetWords(req, res) {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        source: 'Failed to sync set words',
        message: errors.array()[0].msg,
      });
    }

    const { wordSetId } = req.params;
    const owner_user_id = req.userId;
    const wordSetIdNum = Number(wordSetId);
    const incomingRaw = Array.isArray(req.body.words) ? req.body.words : [];

    const wordSet = await WordSet.findByPk(wordSetIdNum);
    if (!wordSet) {
      return res.status(404).json({
        source: 'Failed to sync set words',
        message: `Set #${wordSetId} not found`,
      });
    }

    const incoming = [];
    const batchKeys = new Set();

    for (const rawItem of incomingRaw) {
      const item = normalizeWordEntry(rawItem);
      const key = buildWordEntryKey(item);

      if (batchKeys.has(key)) {
        return res.status(400).json({
          source: 'Failed to sync set words',
          message: 'The list contains duplicate words (word + sentence)',
        });
      }

      batchKeys.add(key);
      incoming.push(item);
    }

    const transaction = await sequelize.transaction();

    try {
      const existingLinks = await WordsWordSets.findAll({
        where: { word_set_id: wordSetIdNum },
        attributes: ['word_id'],
        transaction,
      });

      const existingWordIds = existingLinks.map((link) => link.word_id);
      const existingWords = existingWordIds.length === 0
        ? []
        : await Word.findAll({
          where: { id: { [Op.in]: existingWordIds } },
          include: [
            {
              model: WordSet,
              as: 'wordWordSets',
              attributes: ['id'],
              through: { attributes: [] },
            },
            {
              model: WordTranslation,
              as: 'translations',
              attributes: ['locale', 'word_translation', 'sentence_translation'],
            },
          ],
          transaction,
        });

      const existingByKey = new Map();
      for (const word of existingWords) {
        existingByKey.set(buildWordEntryKey(word), word);
      }

      const keptIds = new Set();
      let added = 0;
      let updated = 0;

      for (const item of incoming) {
        const key = buildWordEntryKey(item);
        const existing = existingByKey.get(key);
        const ukTranslation = item.translations.uk;

        if (existing) {
          keptIds.add(existing.id);
          const existingSerialized = serializeWord(existing);
          const sameTranslations = translationMapsEqual(
            existingSerialized.translations,
            item.translations,
          );

          if (!sameTranslations) {
            await Word.update(
              {
                word_translation_uk: ukTranslation?.word_translation ?? null,
                sentence_translation_uk: ukTranslation?.sentence_translation ?? null,
              },
              { where: { id: existing.id }, transaction },
            );
            await replaceWordTranslations(existing.id, item.translations, transaction);
            updated += 1;
          }
          continue;
        }

        const word = await Word.create({
          owner_user_id,
          word_text: item.word_text,
          sentence_text: item.sentence_text,
          word_translation_uk: ukTranslation?.word_translation ?? null,
          sentence_translation_uk: ukTranslation?.sentence_translation ?? null,
        }, { transaction });

        await replaceWordTranslations(word.id, item.translations, transaction);
        await WordsWordSets.create({
          word_id: word.id,
          word_set_id: wordSetIdNum,
        }, { transaction });
        added += 1;
      }

      const toRemove = existingWords.filter((word) => !keptIds.has(word.id));
      const toDelete = [];
      const toUnlink = [];

      for (const word of toRemove) {
        const setIds = (word.wordWordSets || []).map((item) => Number(item.id));
        const isOwner = word.owner_user_id != null && Number(word.owner_user_id) === Number(owner_user_id);
        const onlyInThisSet = setIds.length === 1 && setIds[0] === wordSetIdNum;

        if (isOwner && onlyInThisSet) {
          toDelete.push(word.id);
        } else {
          toUnlink.push(word.id);
        }
      }

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
        await deleteWordsCascade(toDelete, transaction);
      }

      const reloaded = await Word.findAll({
        include: [
          {
            model: WordSet,
            as: 'wordWordSets',
            where: { id: wordSetIdNum },
            attributes: [],
            through: { attributes: [] },
          },
          {
            model: WordTranslation,
            as: 'translations',
            attributes: ['locale', 'word_translation', 'sentence_translation'],
          },
        ],
        order: [['id', 'ASC']],
        transaction,
      });

      await transaction.commit();

      res.json({
        words: reloaded.map((word) => serializeWord(word)),
        added,
        updated,
        removed: toRemove.length,
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    return respondServerError(res, 'Failed to sync set words', error);
  }
}

module.exports = {
  toggleIncludeWordInWordSet,
  bulkImportWords,
  clearWordSet,
  syncWordSetWords,
};
