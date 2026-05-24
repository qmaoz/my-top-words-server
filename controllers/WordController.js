const { Sequelize } = require('sequelize');
const { validationResult } = require('express-validator'); 

const { Word, User, UsersWords } = require('../models/models');
const { consoleError } = require('../utils');

// async function getAll(req, res) {
// const allWords = await Word.findAll({ include: { model: User, as: 'wordOwnerInfo', attributes: ['id', 'username'], required: false } });
// return res.json(allWords);
// }

async function getAll(req, res) {
  try {
    const learnerId = req.userId ?? null;
    const isAuth = learnerId != null;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const { filter } = req.query;
    const filters = ['top', 'own', 'saved', 'learned'];

    if (filter != 'top' && filters.includes(filter) && !isAuth) {
      throw new Error('Помилка авторизації');
    }
    
    const offset = (page - 1) * limit;

    // correct but not needed
    // const literalPopularity = '(SELECT COUNT(*) FROM users__words AS uw WHERE uw.word_id = "words".id AND uw.is_saved_for_learning = true)';
    
    const literalIsSaved = `EXISTS (
      SELECT 1 FROM users__words WHERE word_id = "words".id AND user_id = :learnerId AND is_saved_for_learning = true
    )`;

    const literalIsLearned = `EXISTS (
      SELECT 1 FROM users__words WHERE word_id = "words".id AND user_id = :learnerId AND word_learning_status_id = 6
    )`;

    let whereConditions = {};

    if (filter === 'own' && isAuth) {
      whereConditions.owner_user_id = learnerId;
    } else if (filter === 'saved' && isAuth) {
      whereConditions[Sequelize.Op.and] = [
        Sequelize.where(Sequelize.literal(literalIsSaved), true)
      ];
    } else if (filter === 'learned' && isAuth) {
      whereConditions[Sequelize.Op.and] = [
        Sequelize.where(Sequelize.literal(literalIsLearned), true)
      ];
    } else {
      whereConditions[Sequelize.Op.and] = [
        {
          [Sequelize.Op.or]: [
            { owner_user_id: null }
          ]
        },
      ];
    }

    const attributesInclude = [];

    // if (filter !== 'own') {
    //   attributesInclude.push([Sequelize.cast(Sequelize.literal(literalPopularity), 'INTEGER'), 'popularity']);
    // }

    // if (isAuth) {
    //   attributesInclude.push(
    //     [Sequelize.literal(literalIsSaved), 'is_saved_for_learning']
    //   );
    // }    

    let orderCondition;

    if (filter === 'own' && isAuth) {
      orderCondition = [['id', 'DESC']];
    }
    // else {
    //   orderCondition = [[Sequelize.literal(literalPopularity), 'DESC']];
    // }

    const { count, rows: foundWords } = await Word.findAndCountAll({
      attributes: {
        include: attributesInclude
      },
      where: whereConditions,
      include: isAuth ? [{
        model: UsersWords,
        as: 'wordProgress',
        attributes: ['word_learning_status_id', 'last_repeat_date', 'is_saved_for_learning'],
        required: false
      }] : [],
      // include: [{
      //   model: User,
      //   as: 'wordOwnerInfo',
      //   attributes: ['id', 'username'],
      //   required: false
      // }],
      replacements: { learnerId },
      order: orderCondition,
      limit: limit,
      offset,
      distinct: true
    });

    if (isAuth) {
      foundWords.forEach((word) => {
        let dataValues = word.dataValues.wordProgress[0]?.dataValues;
        word.dataValues.is_saved_for_learning = dataValues?.is_saved_for_learning || false; 
        word.dataValues.word_learning_status_id = dataValues?.word_learning_status_id || null;
        word.dataValues.last_repeat_date = dataValues?.last_repeat_date || null;
        delete word.dataValues.wordProgress;
      });
    }

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
    const { id } = req.params;

    await Word.destroy({
      where: {
        id: id
      }
    });

    res.json({ id: id });
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
    const { id } = req.params;
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
          id: id
        }
      },
    );

    res.json({
      success: true
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