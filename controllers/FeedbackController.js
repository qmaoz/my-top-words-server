const { Op } = require('sequelize');
const { validationResult } = require('express-validator');

const { FeedbackMessage, User } = require('../models/models');
const { consoleError } = require('../utils');

const FEEDBACK_TYPES = ['typo', 'bug', 'suggestion', 'other'];
const FEEDBACK_STATUSES = ['queued', 'in_progress', 'done'];

const FEEDBACK_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const FEEDBACK_RATE_LIMIT_AUTH = 10;
const FEEDBACK_RATE_LIMIT_GUEST = 3;

const guestFeedbackLimits = new Map();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];

  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }

  return req.socket?.remoteAddress || 'unknown';
}

function cleanupGuestLimits(now) {
  for (const [ip, entry] of guestFeedbackLimits.entries()) {
    if (entry.resetAt <= now) {
      guestFeedbackLimits.delete(ip);
    }
  }
}

async function assertFeedbackRateLimit(req, res) {
  const now = Date.now();
  const windowStart = new Date(now - FEEDBACK_RATE_LIMIT_WINDOW_MS);

  if (req.userId) {
    const recentCount = await FeedbackMessage.count({
      where: {
        user_id: req.userId,
        created_at: { [Op.gte]: windowStart },
      },
    });

    if (recentCount >= FEEDBACK_RATE_LIMIT_AUTH) {
      res.status(429).json({
        source: 'Помилка під час надсилання повідомлення',
        message: 'Забагато повідомлень за годину. Спробуйте пізніше.',
      });
      return false;
    }

    return true;
  }

  cleanupGuestLimits(now);

  const ip = getClientIp(req);
  const entry = guestFeedbackLimits.get(ip);

  if (!entry || entry.resetAt <= now) {
    guestFeedbackLimits.set(ip, { count: 1, resetAt: now + FEEDBACK_RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= FEEDBACK_RATE_LIMIT_GUEST) {
    res.status(429).json({
      source: 'Помилка під час надсилання повідомлення',
      message: 'Забагато повідомлень за годину. Спробуйте пізніше.',
    });
    return false;
  }

  entry.count += 1;
  return true;
}

async function create(req, res) {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        source: 'Помилка під час надсилання повідомлення',
        message: errors.array()[0].msg,
      });
    }

    const allowed = await assertFeedbackRateLimit(req, res);
    if (!allowed) return;

    const { type, message, page_url: pageUrl } = req.body;

    const feedback = await FeedbackMessage.create({
      user_id: req.userId ?? null,
      type,
      message: message.trim(),
      page_url: pageUrl?.trim() || null,
      status: 'queued',
    });

    res.status(201).json({ item: feedback });
  } catch (error) {
    consoleError('Помилка під час надсилання повідомлення: ' + error.message);
    res.status(500).json({
      source: 'Помилка під час надсилання повідомлення',
      message: error.message,
    });
  }
}

async function getAll(req, res) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    const { status, search } = req.query;

    const where = {};

    if (status && status !== 'all' && FEEDBACK_STATUSES.includes(status)) {
      where.status = status;
    }

    if (search?.trim()) {
      const term = `%${search.trim()}%`;
      where[Op.or] = [
        { message: { [Op.iLike]: term } },
        { page_url: { [Op.iLike]: term } },
        { admin_note: { [Op.iLike]: term } },
        { '$author.username$': { [Op.iLike]: term } },
      ];
    }

    const { count, rows } = await FeedbackMessage.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username'],
        required: false,
      }],
      order: [['created_at', 'DESC']],
      limit,
      offset,
      distinct: true,
    });

    res.json({
      items: rows,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalItems: count,
    });
  } catch (error) {
    consoleError('Помилка під час отримання повідомлень: ' + error.message);
    res.status(500).json({
      source: 'Помилка під час отримання повідомлень',
      message: error.message,
    });
  }
}

async function update(req, res) {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        source: 'Помилка під час оновлення повідомлення',
        message: errors.array()[0].msg,
      });
    }

    const { id } = req.params;
    const feedback = await FeedbackMessage.findByPk(id);

    if (!feedback) {
      return res.status(404).json({
        source: 'Помилка під час оновлення повідомлення',
        message: `Повідомлення #${id} не знайдено`,
      });
    }

    const { status, admin_note: adminNote } = req.body;
    const updates = {};

    if (status !== undefined) updates.status = status;
    if (adminNote !== undefined) updates.admin_note = adminNote?.trim() || null;

    await feedback.update(updates);

    const updated = await FeedbackMessage.findByPk(id, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username'],
        required: false,
      }],
    });

    res.json({ item: updated });
  } catch (error) {
    consoleError('Помилка під час оновлення повідомлення: ' + error.message);
    res.status(500).json({
      source: 'Помилка під час оновлення повідомлення',
      message: error.message,
    });
  }
}

module.exports = { create, getAll, update, FEEDBACK_TYPES, FEEDBACK_STATUSES };
