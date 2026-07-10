const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

const { Word, User, WordSet } = require('../models/models');
const { consoleError } = require('../utils');
const { buildWordEntryKey } = require('../utils/wordEntries');

async function verifyWordAuthor(req, res, next) {
  try {
    const { wordId } = req.params;
    const userId = req.userId;
    if (userId == null) {
      return res.status(401).json({
        source: 'Помилка під час перевірки автора слова',
        message: 'Доступ заборонено'
      });
    }

    const word = await Word.findByPk(wordId);
    if (!word) {
      return res.status(404).json({
        source: 'Помилка під час перевірки автора слова',
        message: `Слово #${wordId} не знайдено`
      });
    }

    if (word.owner_user_id != userId) {
      return res.status(401).json({
        source: 'Помилка під час перевірки автора слова',
        message: 'Доступ заборонено'
      });
    }

    next();
  } catch (error) {
    consoleError('Помилка під час перевірки автора слова: ' + error.message);
    res.status(500).json({
      source: 'Помилка під час перевірки автора слова',
      message: error.message
    });
  }
}

async function getAll(req, res) {
  try {
    const learnerId = req.userId ?? null;
    const isAuth = learnerId != null;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;

    const { filter } = req.query; // now only "own" filter is possible

    if (!isAuth) {
      throw new Error('Помилка авторизації');
    }

    if (filter != 'own') {
      throw new Error(`Фільтр \"${filter}\" є некоректним`);
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
    consoleError('Помилка під час отримання слів: ' + error.message);
    res.status(500).json({
      source: 'Помилка під час отримання слів',
      message: error.message
    });
  }
}

async function create(req, res) {
  try {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      consoleError('Помилка під час додавання нового слова:', errors.array()[0].msg);
      return res.status(400).json({
        source: 'Помилка під час додавання нового слова',
        message: errors.array()[0].msg
      });
    }

    const { word_text, word_translation_uk, sentence_text, sentence_translation_uk } = req.body;
    const owner_user_id = req.userId;

    const newWord = await Word.create({ owner_user_id, word_text, word_translation_uk, sentence_text, sentence_translation_uk });
    return res.json(newWord);
  } catch (error) {
    consoleError('Помилка під час додавання нового слова: ' + error.message);
    res.status(500).json({
      source: 'Помилка під час додавання нового слова',
      message: error.message
    });
  }
}

async function remove(req, res) {
  try {
    const { wordId } = req.params;

    await Word.destroy({
      where: {
        id: wordId
      }
    });

    res.json({ id: wordId });
  } catch (error) {
    consoleError('Помилка під час видалення слова: ' + error.message);
    res.status(500).json({
      source: 'Помилка під час видалення слова',
      message: error.message
    });
  }
}

async function update(req, res) {
  try {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      consoleError('Помилка під час оновлення слова:', errors.array()[0].msg);
      return res.status(400).json({
        source: 'Помилка під час оновлення слова',
        message: errors.array()[0].msg
      });
    }

    const { wordId } = req.params;
    const { word_text, word_translation_uk, sentence_text, sentence_translation_uk } = req.body;

    const word = await Word.findByPk(wordId);
    if (!word) {
      return res.status(404).json({
        source: 'Помилка під час оновлення слова',
        message: `Слово #${wordId} не знайдено`,
      });
    }

    const nextValues = {
      word_text,
      word_translation_uk,
      sentence_text,
      sentence_translation_uk,
    };

    const hasChanges = Object.entries(nextValues).some(
      ([key, value]) => String(value ?? '').trim() !== String(word[key] ?? '').trim(),
    );

    if (!hasChanges) {
      return res.json({
        success: true,
        unchanged: true,
        updatedWord: word.get({ plain: true }),
      });
    }

    const wordSetLinks = await word.getWordWordSets({ attributes: ['id'] });
    const wordSetIds = wordSetLinks.map((item) => item.id);

    if (wordSetIds.length > 0) {
      const nextKey = buildWordEntryKey(nextValues);
      const siblings = await Word.findAll({
        attributes: ['id', 'word_text', 'word_translation_uk', 'sentence_text', 'sentence_translation_uk'],
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
          source: 'Помилка під час оновлення слова',
          message: 'Такий запис вже є в наборі',
        });
      }
    }

    const updatedRow = await Word.update(
      nextValues,
      {
        where: {
          id: wordId
        },
        returning: true
      },
    );

    if (updatedRow) {
      const updatedWord = updatedRow[1][0]?.dataValues;
      res.json({
        success: true,
        updatedWord
      });
    } else {
      res.status(500).json({
        source: 'Помилка під час оновлення слова',
        message: 'Оновлення не відбулося'
      });
    }
  } catch (error) {
    consoleError('Помилка під час оновлення слова: ' + error.message);
    res.status(500).json({
      source: 'Помилка під час оновлення слова',
      message: error.message
    });
  }
}

module.exports = { verifyWordAuthor, getAll, create, remove, update };