const { Sequelize } = require('sequelize');
const { validationResult } = require('express-validator');

const { WordSet, User, Word } = require('../models/models');
const { consoleError } = require('../utils');
const { respondServerError } = require('../utils/apiResponse');
const { parsePagination } = require('../utils/pagination');
const { resolveWordSetListFilter, requiresAuthForWordSetListFilter } = require('../utils/wordSetFilters');
const {
  canAccessWordSet,
  buildPublicListingCondition,
  normalizeVisibility,
  VISIBILITY_LEVELS,
} = require('../utils/wordSetVisibility');

const literalPopularity = '(SELECT COUNT(*) FROM users__word_sets AS uws WHERE uws.word_set_id = "word-sets".id)';
const literalTotalWords = '(SELECT COUNT(*) FROM words__word_sets AS wws WHERE wws.word_set_id = "word-sets".id)';
const literalIsSaved = 'EXISTS (SELECT 1 FROM users__word_sets WHERE word_set_id = "word-sets".id AND user_id = :learnerId)';
const literalLearnedWordsCount = '(SELECT COUNT(*) FROM learned_user_words AS luw INNER JOIN words__word_sets AS wws ON wws.word_id = luw.word_id WHERE wws.word_set_id = "word-sets".id AND luw.user_id = :learnerId)';
const literalIsLearned = 'EXISTS (SELECT 1 FROM learned_user_words AS luw WHERE luw.word_id = "wordSetWords".id AND luw.user_id = :learnerId)';

async function verifyWordSetAuthor(req, res, next) {
  try {
    const { wordSetId } = req.params;
    const userId = req.userId;
    if (userId == null) {
      return res.status(401).json({
        source: 'Помилка під час перевірки автора набору',
        message: 'Доступ заборонено'
      });
    }
    
    const wordSet = await WordSet.findByPk(wordSetId);
    if (!wordSet) {
      return res.status(404).json({
        source: 'Помилка під час перевірки автора набору',
        message: `Набір #${wordSetId} не знайдено`
      });
    }

    if (wordSet.owner_user_id != userId) {
      return res.status(401).json({
        source: 'Помилка під час перевірки автора набору',
        message: 'Доступ заборонено'
      });
    }

    next();
  } catch (error) {
    return respondServerError(res, 'Помилка під час перевірки автора набору', error);
  }
}

async function getAll(req, res) {
  try {
    const learnerId = req.userId ?? null;
    const isAuth = learnerId != null;
    const { page, limit, offset } = parsePagination(req.query, { defaultLimit: 12 });
    const { filter, partOfName } = req.query;

    const effectiveFilter = resolveWordSetListFilter(filter);

    if (!isAuth && requiresAuthForWordSetListFilter(effectiveFilter)) {
      throw new Error('Помилка авторизації');
    }

    let whereConditions = {};

    if (effectiveFilter === 'own' && isAuth) {
      whereConditions.owner_user_id = learnerId;
    } else if (effectiveFilter === 'saved' && isAuth) {
      whereConditions[Sequelize.Op.and] = [
        Sequelize.where(Sequelize.literal(literalIsSaved), true),
        {
            [Sequelize.Op.or]: [
              { owner_user_id: learnerId },
              {
                [Sequelize.Op.and]: [
                  { owner_user_id: { [Sequelize.Op.is]: null } },
                  buildPublicListingCondition(Sequelize),
                ],
              },
              { visibility: 'unlisted' },
              buildPublicListingCondition(Sequelize),
            ],
        }
      ];
    } else if (effectiveFilter === 'top') {
      whereConditions[Sequelize.Op.and] = [
        buildPublicListingCondition(Sequelize),
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

    if (effectiveFilter !== 'own') {
      attributesInclude.push([Sequelize.cast(Sequelize.literal(literalPopularity), 'INTEGER'), 'popularity']);
    }

    if (isAuth) {
      attributesInclude.push(
        [Sequelize.literal(literalIsSaved), 'isSavedForLearning'],
        [Sequelize.cast(Sequelize.literal(literalLearnedWordsCount), 'INTEGER'), 'learnedWordsCount']
      );
    }    

    let orderCondition;

    if (effectiveFilter === 'own' && isAuth) {
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
    return respondServerError(res, 'Помилка під час отримання наборів слів', error);
  }
}

async function getOne(req, res) {
  try {
    const { wordSetId } = req.params;
    const learnerId = req.userId ?? null;
    const isAuth = learnerId != null;

    const wordSet = await WordSet.findOne({
      where: { id: wordSetId },
      attributes: {
        include: [
          ...(isAuth ? [
            [Sequelize.literal(literalIsSaved), 'isSavedForLearning'],
            [Sequelize.cast(Sequelize.literal(literalLearnedWordsCount), 'INTEGER'), 'learnedWordsCount']
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
            'sentence_translation_uk',
            ...(isAuth ? [
              [Sequelize.literal(literalIsLearned), 'isLearned']
            ] : [])
          ],
          through: { attributes: [] },
        }
      ],
      replacements: { learnerId: learnerId ?? null },
    });

    if (!wordSet || !canAccessWordSet(wordSet.get({ plain: true }), learnerId)) {
      return res.status(404).json({
        source: 'Помилка під час отримання набору #1',
        message: `Набір #${wordSetId} не знайдено або доступ до нього заборонено`
      });
    }

    // a minor tweak for front-end convenience
    const result = wordSet.get({ plain: true });
    result.words = result.wordSetWords;
    delete result.wordSetWords;

    if (result.is_public == null) {
      result.is_public = false;
    }
    result.visibility = normalizeVisibility(result);
    result.is_public = result.visibility === 'public';

    return res.json(result);
  } catch (error) {
    return respondServerError(res, 'Помилка під час отримання набору #2', error);
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
      return res.status(400).json({
        source: 'Помилка під час створення набору',
        message: 'Ви вже маєте набір з тією самою назвою',
      });
    }
    
    const newWordSet = await WordSet.create({ name, owner_user_id });
    return res.json(newWordSet);
  } catch (error) {
    return respondServerError(res, 'Помилка під час створення набору', error);
  }
}

async function remove(req, res) {
  try {
    const { wordSetId } = req.params;

    await WordSet.destroy({
      where: {
        id: wordSetId
      }
    });

    res.json({
      success: true
    });
  } catch (error) {
    return respondServerError(res, 'Помилка під час видалення набору', error);
  }
}

async function update(req, res) {
  try {
    const { wordSetId } = req.params;
    const { name, visibility, setIsPublic } = req.body;
    const errors = validationResult(req);

    const wordSet = await WordSet.findOne({
      where: { id: wordSetId }
    });

    if (!wordSet) {
      return res.status(404).json({
        source: 'Помилка під час оновлення набору',
        message: `Набір #${wordSetId} не знайдено або доступ до нього заборонено`
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

    let nextVisibility = visibility;
    if (nextVisibility == null && setIsPublic != null) {
      nextVisibility = setIsPublic ? 'public' : 'private';
    }
    if (nextVisibility != null) {
      if (!VISIBILITY_LEVELS.includes(nextVisibility)) {
        return res.status(400).json({
          source: 'Помилка під час оновлення набору',
          message: 'Некоректний рівень доступу до набору',
        });
      }
      updateData.visibility = nextVisibility;
      updateData.is_public = nextVisibility === 'public';
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        source: 'Помилка під час оновлення набору',
        message: 'Немає даних для оновлення'
      });
    }

    const [updatedRowsCount] = await WordSet.update(updateData, {
      where: { id: wordSetId }
    });

    if (updatedRowsCount === 0) {    
      return res.status(404).json({
        source: 'Помилка під час оновлення набору',
        message: `Набір #${wordSetId} не знайдено або доступ до нього заборонено`
      });
    }

    res.json({
      ...updateData,
      visibility: updateData.visibility ?? normalizeVisibility(wordSet),
    });
  } catch (error) {
    return respondServerError(res, 'Помилка під час оновлення набору', error);
  }
}

module.exports = { verifyWordSetAuthor, getAll, getOne, create, remove, update };