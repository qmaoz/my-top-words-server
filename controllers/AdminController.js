const { Op } = require('sequelize');

const sequelize = require('../db');
const {
  User, Word, WordSet, FeedbackMessage,
} = require('../models/models');
const { consoleError } = require('../utils');
const { respondServerError } = require('../utils/apiResponse');
const { parsePagination } = require('../utils/pagination');

const WORD_SETS_COUNT_SQL = `(
  SELECT COUNT(*)::int
  FROM word_sets
  WHERE owner_user_id = "users"."id"
)`;

const WORDS_COUNT_SQL = `(
  SELECT COUNT(*)::int
  FROM words
  WHERE owner_user_id = "users"."id"
)`;

const SORT_COLUMNS = {
  id: '"users"."id"',
  username: '"users"."username"',
  wordSetsCount: WORD_SETS_COUNT_SQL,
  wordsCount: WORDS_COUNT_SQL,
  createdAt: '"users"."created_at"',
  lastSeenAt: '"users"."last_seen_at"',
};

function parseSort(query) {
  const sortBy = SORT_COLUMNS[query.sortBy] ? query.sortBy : 'id';
  const sortDir = String(query.sortDir || 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  return { sortBy, order: [[sequelize.literal(SORT_COLUMNS[sortBy]), sortDir]] };
}

function mapAdminUser(row) {
  const values = row.get ? row.get({ plain: true }) : row;
  return {
    id: values.id,
    username: values.username,
    is_admin: values.is_admin,
    created_at: values.created_at,
    last_seen_at: values.last_seen_at,
    word_sets_count: Number(values.word_sets_count ?? 0),
    words_count: Number(values.words_count ?? 0),
  };
}

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
    return respondServerError(res, 'Failed to load admin overview', error);
  }
}

async function getUsers(req, res) {
  try {
    const { page, limit, offset } = parsePagination(req.query, { defaultLimit: 10 });
    const { search } = req.query;
    const { order } = parseSort(req.query);

    const where = {};

    if (search?.trim()) {
      where.username = { [Op.iLike]: `%${search.trim()}%` };
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: [
        'id',
        'username',
        'is_admin',
        'created_at',
        'last_seen_at',
        [sequelize.literal(WORD_SETS_COUNT_SQL), 'word_sets_count'],
        [sequelize.literal(WORDS_COUNT_SQL), 'words_count'],
      ],
      order,
      limit,
      offset,
      subQuery: false,
    });

    res.json({
      items: rows.map(mapAdminUser),
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalItems: count,
    });
  } catch (error) {
    return respondServerError(res, 'Failed to load users', error);
  }
}

async function deleteUser(req, res) {
  try {
    const targetId = parseInt(req.params.userId, 10);

    if (Number.isNaN(targetId)) {
      return res.status(400).json({
        source: 'Failed to delete user',
        message: 'Invalid id',
      });
    }

    if (targetId === req.userId) {
      return res.status(400).json({
        source: 'Failed to delete user',
        message: 'You cannot delete your own account',
      });
    }

    const user = await User.findByPk(targetId);

    if (!user) {
      return res.status(404).json({
        source: 'Failed to delete user',
        message: `User #${targetId} not found`,
      });
    }

    if (user.is_admin) {
      return res.status(400).json({
        source: 'Failed to delete user',
        message: 'Cannot delete an administrator account',
      });
    }

    await user.destroy();

    res.json({ message: 'User deleted' });
  } catch (error) {
    return respondServerError(res, 'Failed to delete user', error);
  }
}

module.exports = { getOverview, getUsers, deleteUser };
