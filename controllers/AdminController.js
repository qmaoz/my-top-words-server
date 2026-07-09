const { Op } = require('sequelize');

const {
  User, Word, WordSet, FeedbackMessage,
} = require('../models/models');
const { consoleError } = require('../utils');
const { ADMIN_USER_ID } = require('../middleware/admin');

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
    consoleError('Помилка під час отримання огляду адміна: ' + error.message);
    res.status(500).json({
      source: 'Помилка під час отримання огляду адміна',
      message: error.message,
    });
  }
}

async function getUsers(req, res) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    const { search } = req.query;

    const where = {};

    if (search?.trim()) {
      where.username = { [Op.iLike]: `%${search.trim()}%` };
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: ['id', 'username'],
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
    consoleError('Помилка під час отримання користувачів: ' + error.message);
    res.status(500).json({
      source: 'Помилка під час отримання користувачів',
      message: error.message,
    });
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

    if (targetId === ADMIN_USER_ID) {
      return res.status(400).json({
        source: 'Помилка під час видалення користувача',
        message: 'Не можна видалити обліковий запис адміністратора',
      });
    }

    const user = await User.findByPk(targetId);

    if (!user) {
      return res.status(404).json({
        source: 'Помилка під час видалення користувача',
        message: `Користувача #${targetId} не знайдено`,
      });
    }

    await user.destroy();

    res.json({ message: 'Користувача видалено' });
  } catch (error) {
    consoleError('Помилка під час видалення користувача: ' + error.message);
    res.status(500).json({
      source: 'Помилка під час видалення користувача',
      message: error.message,
    });
  }
}

module.exports = { getOverview, getUsers, deleteUser };
