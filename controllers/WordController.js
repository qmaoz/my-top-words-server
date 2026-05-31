const { Sequelize } = require('sequelize');
const { validationResult } = require('express-validator'); 

const { Word, User } = require('../models/models');
const { consoleError } = require('../utils');

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

    const sameWordWithSameOwner = await Word.findOne({ where: {
      owner_user_id: owner_user_id,
      word_text: word_text,
      word_translation_uk: word_translation_uk,
      sentence_text: sentence_text,
      sentence_translation_uk: sentence_translation_uk
    }});
    if (sameWordWithSameOwner) {
      throw new Error('Таке саме слово вже є в персональній базі');
    }

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
    const { id: wordId } = req.params;

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
    const { id: wordId } = req.params;
    const { owner_user_id, word_text, word_translation_uk, sentence_text, sentence_translation_uk } = req.body;

    await Word.update(
      {
        owner_user_id: owner_user_id,
        word_text: word_text,
        word_translation_uk: word_translation_uk,
        sentence_text: sentence_text,
        sentence_translation_uk: sentence_translation_uk
      },
      {
        where: {
          id: wordId
        }
      },
    );

    const updatedWord = { id: wordId, owner_user_id, word_text, word_translation_uk, sentence_text, sentence_translation_uk };

    res.json({
      success: true,
      updatedWord
    });
  } catch (error) {
    consoleError('Помилка під час оновлення слова: ' + error.message);
    res.status(500).json({
      source: 'Помилка під час оновлення слова',
      message: error.message
    });
  }
}

module.exports = { getAll, create, remove, update };