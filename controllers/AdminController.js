const { Op } = require('sequelize');

const {
  User, Word, WordSet, FeedbackMessage,
} = require('../models/models');
const { consoleError } = require('../utils');
const { respondServerError } = require('../utils/apiResponse');
const { parsePagination } = require('../utils/pagination');

async function getOverview(req, res) {
  try {
    const [usersCount, wordsCount, wordSetsCount, feedbackQueued, feedbackInProgress, feedbackDone] = await Promise.all([
      User.count(),
      Word.count(),
      WordSet.count(),
      FeedbackMessage.count({ where: { status: 'queued' } }),
      FeedbackMessage.count({ where: { status: 'in_progress' } }),
      FeedbackMessage.count({ where: { status: 'done' } }),
    ]);

    res.json({
      usersCount,
      wordsCount,
      wordSetsCount,
      feedbackQueued,
      feedbackInProgress,
      feedbackDone,
    });
  } catch (error) {
    return respondServerError(res, 'Помилка під час отримання огляду адміна', error);
  }
}

async function getUsers(req, res) {
  try {
    const { page, limit, offset } = parsePagination(req.query, { defaultLimit: 10 });
    const { search } = req.query;

    const where = {};

    if (search?.trim()) {
      where.username = { [Op.iLike]: `%${search.trim()}%` };
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: ['id', 'username', 'is_admin'],
      order: [['id', 'ASC']],
      limit,
      offset,
    });

    res.json({
      items: rows,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalItems: count,
    });
  } catch (error) {
    return respondServerError(res, 'Помилка під час отримання користувачів', error);
  }
}

async function deleteUser(req, res) {
  try {
    const targetId = parseInt(req.params.userId, 10);

    if (Number.isNaN(targetId)) {
      return res.status(400).json({
        source: 'Помилка під час видалення користувача',
        message: 'Некоректний ідентифікатор',
      });
    }

    if (targetId === req.userId) {
      return res.status(400).json({
        source: 'Помилка під час видалення користувача',
        message: 'Не можна видалити власний акаунт',
      });
    }

    const user = await User.findByPk(targetId);

    if (!user) {
      return res.status(404).json({
        source: 'Помилка під час видалення користувача',
        message: `Користувача #${targetId} не знайдено`,
      });
    }

    if (user.is_admin) {
      return res.status(400).json({
        source: 'Помилка під час видалення користувача',
        message: 'Не можна видалити обліковий запис адміністратора',
      });
    }

    await user.destroy();

    res.json({ message: 'Користувача видалено' });
  } catch (error) {
    return respondServerError(res, 'Помилка під час видалення користувача', error);
  }
}

module.exports = { getOverview, getUsers, deleteUser };
