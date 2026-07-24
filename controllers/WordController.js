const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

const sequelize = require('../db');
const { Word, User, WordSet, WordTranslation } = require('../models/models');
const { consoleError } = require('../utils');
const { buildWordEntryKey, normalizeTranslationsMap } = require('../utils/wordEntries');
const { serializeWord } = require('../utils/wordSerializer');
const { respondServerError } = require('../utils/apiResponse');
const { parsePagination } = require('../utils/pagination');
const { deleteWordsCascade } = require('../utils/deleteWordsCascade');

async function verifyWordAuthor(req, res, next) {
  try {
    const { wordId } = req.params;
    const userId = req.userId;
    if (userId == null) {
      return res.status(401).json({
        source: 'Word author check failed',
        message: 'Access denied'
      });
    }

    const word = await Word.findByPk(wordId);
    if (!word) {
      return res.status(404).json({
        source: 'Word author check failed',
        message: `Word #${wordId} not found`
      });
    }

    if (word.owner_user_id != userId) {
      return res.status(401).json({
        source: 'Word author check failed',
        message: 'Access denied'
      });
    }

    next();
  } catch (error) {
    return respondServerError(res, 'Word author check failed', error);
  }
}

async function getAll(req, res) {
  try {
    const learnerId = req.userId ?? null;
    const isAuth = learnerId != null;
    const { page, limit, offset } = parsePagination(req.query, { defaultLimit: 12 });

    const { filter } = req.query; // now only "own" filter is possible

    if (!isAuth) {
      throw new Error('Authorization error');
    }

    if (filter != 'own') {
      throw new Error(`Filter "${filter}" is invalid`);
    }

    let whereConditions = {};

    if (filter === 'own' && isAuth) {
      whereConditions.owner_user_id = learnerId;
    }

    const attributesInclude = [];

    let orderCondition;

    if (filter === 'own' && isAuth) {
      orderCondition = [['id', 'DESC']];
    }

    const { count, rows: foundWords } = await Word.findAndCountAll({
      attributes: {
        include: attributesInclude
      },
      where: whereConditions,
      include: [{
        model: User,
        as: 'wordOwnerInfo',
        attributes: ['id', 'username'],
        required: false
      }],
      replacements: { learnerId },
      order: orderCondition,
      limit: limit,
      offset,
      distinct: true
    });

    res.json({
      items: foundWords,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalItems: count
    });
  } catch (error) {
    return respondServerError(res, 'Failed to load words', error);
  }
}

async function create(req, res) {
  try {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      consoleError('Failed to add word:', errors.array()[0].msg);
      return res.status(400).json({
        source: 'Failed to add word',
        message: errors.array()[0].msg
      });
    }

    const { word_text, sentence_text } = req.body;
    const owner_user_id = req.userId;
    const translations = normalizeTranslationsMap(req.body.translations);
    const ukTranslation = translations.uk;

    const result = await sequelize.transaction(async (transaction) => {
      const newWord = await Word.create({
        owner_user_id,
        word_text,
        sentence_text,
        word_translation_uk: ukTranslation?.word_translation ?? null,
        sentence_translation_uk: ukTranslation?.sentence_translation ?? null,
      }, { transaction });

      const translationRows = Object.entries(translations).map(([locale, value]) => ({
        word_id: newWord.id,
        locale,
        word_translation: value.word_translation,
        sentence_translation: value.sentence_translation,
      }));

      if (translationRows.length > 0) {
        await WordTranslation.bulkCreate(translationRows, { transaction });
      }

      newWord.translations = translationRows;
      return newWord;
    });

    return res.json(serializeWord(result));
  } catch (error) {
    return respondServerError(res, 'Failed to add word', error);
  }
}

async function remove(req, res) {
  try {
    const { wordId } = req.params;
    const transaction = await sequelize.transaction();

    try {
      await deleteWordsCascade([wordId], transaction);
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    res.json({ id: wordId });
  } catch (error) {
    return respondServerError(res, 'Failed to delete word', error);
  }
}

async function update(req, res) {
  try {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      consoleError('Failed to update word:', errors.array()[0].msg);
      return res.status(400).json({
        source: 'Failed to update word',
        message: errors.array()[0].msg
      });
    }

    const { wordId } = req.params;
    const { word_text, sentence_text } = req.body;
    const rawTranslations = (req.body.translations && typeof req.body.translations === 'object')
      ? req.body.translations
      : {};
    const translations = normalizeTranslationsMap(rawTranslations);

    const word = await Word.findByPk(wordId);
    if (!word) {
      return res.status(404).json({
        source: 'Failed to update word',
        message: `Word #${wordId} not found`,
      });
    }

    const nextSource = {
      word_text: String(word_text ?? '').trim(),
      sentence_text: String(sentence_text ?? '').trim(),
    };

    const wordSetLinks = await word.getWordWordSets({ attributes: ['id'] });
    const wordSetIds = wordSetLinks.map((item) => item.id);

    if (wordSetIds.length > 0) {
      const nextKey = buildWordEntryKey(nextSource);
      const siblings = await Word.findAll({
        attributes: ['id', 'word_text', 'sentence_text'],
        where: { id: { [Op.ne]: wordId } },
        include: [{
          model: WordSet,
          as: 'wordWordSets',
          where: { id: { [Op.in]: wordSetIds } },
          attributes: [],
          through: { attributes: [] },
          required: true,
        }],
      });

      const duplicate = siblings.find((item) => buildWordEntryKey(item) === nextKey);
      if (duplicate) {
        return res.status(409).json({
          source: 'Failed to update word',
          message: 'This entry already exists in the set',
        });
      }
    }

    // Locales explicitly present in the request but cleared should be removed.
    const clearedLocales = Object.keys(rawTranslations).filter((locale) => !translations[locale]);
    const ukTranslation = translations.uk;

    await sequelize.transaction(async (transaction) => {
      await Word.update(
        {
          word_text: nextSource.word_text,
          sentence_text: nextSource.sentence_text,
          word_translation_uk: ukTranslation?.word_translation ?? null,
          sentence_translation_uk: ukTranslation?.sentence_translation ?? null,
        },
        { where: { id: wordId }, transaction },
      );

      for (const [locale, value] of Object.entries(translations)) {
        await WordTranslation.upsert({
          word_id: Number(wordId),
          locale,
          word_translation: value.word_translation,
          sentence_translation: value.sentence_translation,
        }, { transaction });
      }

      if (clearedLocales.length > 0) {
        await WordTranslation.destroy({
          where: { word_id: wordId, locale: { [Op.in]: clearedLocales } },
          transaction,
        });
      }
    });

    const reloaded = await Word.findByPk(wordId, {
      include: [{
        model: WordTranslation,
        as: 'translations',
        attributes: ['locale', 'word_translation', 'sentence_translation'],
      }],
    });

    return res.json({
      success: true,
      updatedWord: serializeWord(reloaded),
    });
  } catch (error) {
    return respondServerError(res, 'Failed to update word', error);
  }
}

module.exports = { verifyWordAuthor, getAll, create, remove, update };