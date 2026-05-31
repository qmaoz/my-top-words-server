const { Sequelize } = require('sequelize');
const { validationResult } = require('express-validator');

const { WordSet, User, Word, WordsWordSets } = require('../models/models');
const { consoleError } = require('../utils');

const literalPopularity = '(SELECT COUNT(*) FROM users__word_sets AS uws WHERE uws.word_set_id = "word-sets".id)';
const literalTotalWords = '(SELECT COUNT(*) FROM words__word_sets AS wws WHERE wws.word_set_id = "word-sets".id)';
const literalIsSaved = 'EXISTS (SELECT 1 FROM users__word_sets WHERE word_set_id = "word-sets".id AND user_id = :learnerId)';

async function getAll(req, res) {
  try {
    const learnerId = req.userId ?? null;
    const isAuth = learnerId != null;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const { filter, partOfName } = req.query; // possible filters: 'top' / 'saved' / 'own'
    // console.log('partOfName: ', partOfName);
    // console.log('filter: ', filter);
    // console.log('learnerId: ', learnerId);

    if (!isAuth && (filter == 'own' || filter == 'saved')) {
      throw new Error('Помилка авторизації');
    }
    
    const offset = (page - 1) * limit;

    let whereConditions = {};

    /*
    [Sequelize.Op.or]: {
      owner_user_id: [learnerId, null],
      is_public: true
    }

    [Sequelize.Op.or]: {
      owner_user_id: learnerId,
      [Sequelize.Op.or]: {
        owner_user_id: { [Sequelize.Op.is]: null },
        is_public: true
      }
    }
    */


    if (filter === 'own' && isAuth) {
      whereConditions.owner_user_id = learnerId;
    } else if (filter === 'saved' && isAuth) {
      whereConditions[Sequelize.Op.and] = [
        Sequelize.where(Sequelize.literal(literalIsSaved), true),
        {
          [Sequelize.Op.or]: {
            owner_user_id: learnerId,
            [Sequelize.Op.or]: {
              owner_user_id: { [Sequelize.Op.is]: null },
              is_public: true
            }
          }
        }
      ];
    } else if (filter === 'top') {
      whereConditions[Sequelize.Op.and] = [
        {
          [Sequelize.Op.or]: {
            owner_user_id: { [Sequelize.Op.is]: null },
            is_public: true
          }
        },
        Sequelize.where(Sequelize.literal(literalTotalWords), { [Sequelize.Op.gt]: 0 }),
      ];
    }

    if (partOfName != null && partOfName.trim() != '') {
      const nameFilter = {
        name: {
          [Sequelize.Op.iLike]: `%${partOfName}%`
        }
      };

      if (whereConditions[Sequelize.Op.and]) {
        whereConditions[Sequelize.Op.and].push([nameFilter]);
      } else {
        whereConditions[Sequelize.Op.and] = [nameFilter];
      }
    }

    const attributesInclude = [
      [Sequelize.cast(Sequelize.literal(literalTotalWords), 'INTEGER'), 'totalWords']
    ];

    if (filter !== 'own') {
      attributesInclude.push([Sequelize.cast(Sequelize.literal(literalPopularity), 'INTEGER'), 'popularity']);
    }

    if (isAuth) {
      attributesInclude.push(
        [Sequelize.literal(literalIsSaved), 'isSavedForLearning']
      );
    }    

    let orderCondition;

    if (filter === 'own' && isAuth) {
      orderCondition = [['id', 'DESC']];
    } else {
      orderCondition = [[Sequelize.literal(literalPopularity), 'DESC']];
    }

    const { count, rows: wordSets } = await WordSet.findAndCountAll({
      attributes: {
        include: attributesInclude
      },
      where: whereConditions,
      include: [{
        model: User,
        as: 'wordSetOwnerInfo',
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
      items: wordSets,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalItems: count
    });
  } catch (error) {
    consoleError('Помилка під час отримання наборів слів: ' + error.message);
    res.status(500).json({
      source: 'Помилка під час отримання наборів слів',
      message: error.message
    });
  }
}

async function getOne(req, res) {
  try {
    const { id } = req.params;
    const learnerId = req.userId ?? null;
    const isAuth = learnerId != null;

    let whereConditions = { id };
    whereConditions[Sequelize.Op.or] = {
      owner_user_id: learnerId,
      [Sequelize.Op.or]: {
        owner_user_id: { [Sequelize.Op.is]: null },
        is_public: true
      }
    };

    const wordSet = await WordSet.findOne({
      where: whereConditions,
      attributes: {
        include: [
          ...(isAuth ? [
            [Sequelize.literal(literalIsSaved), 'isSavedForLearning']
          ] : [])
        ]
      },
      include: [
        {
          model: User,
          as: 'wordSetOwnerInfo',
          attributes: ['id', 'username'],
          required: false
        },
        {
          model: Word,
          as: 'wordSetWords',
          attributes: [
            'id',
            'word_text',
            'word_translation_uk',
            'sentence_text',
            'sentence_translation_uk'
          ],
          through: { attributes: [] },
        }
      ],
      replacements: { learnerId: learnerId ?? null },
    });

    if (!wordSet) {
      return res.status(404).json({
        source: 'Помилка під час отримання набору',
        message: `Набір #${id} не знайдено або доступ до нього заборонено`
      });
    }

    // a minor tweak for front-end convenience
    const result = wordSet.get({ plain: true });
    result.words = result.wordSetWords;
    delete result.wordSetWords;

    if (result.is_public == null) {
      result.is_public = false;
    }

    return res.json(result);
  } catch (error) {
    consoleError('Помилка під час отримання набору: ' + error.message);
    res.status(500).json({
      source: 'Помилка під час отримання набору',
      message: error.message
    });
  }
}

async function create(req, res) {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      consoleError('Помилка під час створення набору: ', errors.array()[0].msg);
      return res.status(400).json({
        source: 'Помилка під час створення набору',
        message: errors.array()[0].msg
      });
    }

    const { name } = req.body;
    const owner_user_id = req.userId;

    const sameWordSetWithSameOwner = await WordSet.findOne({ where: {
      owner_user_id: owner_user_id,
      name: name
    }});
    if (sameWordSetWithSameOwner) {
      throw new Error('Ви вже маєте набір з тією самою назвою');
    }
    
    const newWordSet = await WordSet.create({ name, owner_user_id });
    return res.json(newWordSet);
  } catch (error) {
    consoleError('Помилка під час створення набору: ' + error.message);
    res.status(500).json({
      source: 'Помилка під час створення набору',
      message: error.message
    });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;

    await WordSet.destroy({
      where: {
        id: id
      }
    });

    res.json({
      success: true
    });
  } catch (error) {
    consoleError('Помилка під час видалення набору: ' + error.message);
    res.status(500).json({
      source: 'Помилка під час видалення набору',
      message: error.message
    });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const { name , setIsPublic } = req.body;
    const errors = validationResult(req);

    const wordSet = await WordSet.findOne({
      where: { id }
    });

    if (!wordSet) {
      return res.status(404).json({
        source: 'Помилка під час оновлення набору',
        message: `Набір #${id} не знайдено або доступ до нього заборонено`
      });
    }
    
    if (!errors.isEmpty() && name) {
      consoleError('Помилка під час оновлення набору: ', errors.array()[0].msg);
      return res.status(400).json({
        source: 'Помилка під час оновлення набору',
        message: errors.array()[0].msg
      });
    }
    
    const updateData = {};
    if (name != null) updateData.name = name;
    if (setIsPublic != null) updateData.is_public = setIsPublic;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        source: 'Помилка під час оновлення набору',
        message: 'Немає даних для оновлення'
      });
    }

    const [updatedRowsCount] = await WordSet.update(updateData, {
      where: { id }
    });

    if (updatedRowsCount === 0) {    
      return res.status(404).json({
        source: 'Помилка під час оновлення набору',
        message: `Набір #${id} не знайдено або доступ до нього заборонено`
      });
    }

    res.json(updateData);
  } catch (error) {
    consoleError('Помилка під час оновлення набору: ' + error.message);
    res.status(500).json({
      source: 'Помилка під час оновлення набору',
      message: error.message
    });
  }
}

module.exports = { getAll, getOne, create, remove, update };