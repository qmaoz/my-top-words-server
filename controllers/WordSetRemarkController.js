const { Op } = require('sequelize');
const { validationResult } = require('express-validator');

const { WordSet, WordSetRemark, User } = require('../models/models');
const { respondServerError } = require('../utils/apiResponse');
const { parsePagination } = require('../utils/pagination');

const REMARK_STATUSES = ['queued', 'done'];

async function create(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        source: 'Failed to send remark',
        message: errors.array()[0].msg,
      });
    }

    const { wordSetId } = req.params;
    const wordSet = await WordSet.findByPk(wordSetId);
    if (!wordSet) {
      return res.status(404).json({
        source: 'Failed to send remark',
        message: `Set #${wordSetId} not found`,
      });
    }

    const selectedText = String(req.body.selected_text ?? '').trim();
    const comment = String(req.body.comment ?? '').trim();
    const wordId = req.body.word_id != null ? Number(req.body.word_id) : null;

    if (!selectedText && !comment) {
      return res.status(400).json({
        source: 'Failed to send remark',
        message: 'Selected text or a comment is required',
      });
    }

    const remark = await WordSetRemark.create({
      word_set_id: Number(wordSetId),
      reporter_user_id: req.userId ?? null,
      word_id: Number.isFinite(wordId) ? wordId : null,
      selected_text: selectedText || null,
      comment: comment || null,
      status: 'queued',
    });

    res.status(201).json({ item: remark });
  } catch (error) {
    return respondServerError(res, 'Failed to send remark', error);
  }
}

async function listForOwnerInbox(req, res) {
  try {
    const { page, limit, offset } = parsePagination(req.query, { defaultLimit: 20 });
    const { status } = req.query;
    const where = {};

    if (status && status !== 'all' && REMARK_STATUSES.includes(status)) {
      where.status = status;
    }

    const { count, rows } = await WordSetRemark.findAndCountAll({
      where,
      include: [
        {
          model: WordSet,
          as: 'wordSet',
          attributes: ['id', 'name'],
          where: { owner_user_id: req.userId },
          required: true,
        },
        {
          model: User,
          as: 'reporter',
          attributes: ['id', 'username'],
          required: false,
        },
      ],
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
    return respondServerError(res, 'Failed to load remarks', error);
  }
}

async function listForWordSet(req, res) {
  try {
    const { wordSetId } = req.params;
    const wordSet = await WordSet.findByPk(wordSetId);
    if (!wordSet) {
      return res.status(404).json({
        source: 'Failed to load remarks',
        message: `Set #${wordSetId} not found`,
      });
    }

    if (Number(wordSet.owner_user_id) !== Number(req.userId)) {
      return res.status(403).json({
        source: 'Failed to load remarks',
        message: 'Access denied',
      });
    }

    const { page, limit, offset } = parsePagination(req.query, { defaultLimit: 20 });
    const { status } = req.query;
    const where = { word_set_id: Number(wordSetId) };

    if (status && status !== 'all' && REMARK_STATUSES.includes(status)) {
      where.status = status;
    }

    const { count, rows } = await WordSetRemark.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'reporter',
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
    return respondServerError(res, 'Failed to load remarks', error);
  }
}

async function update(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        source: 'Failed to update remark',
        message: errors.array()[0].msg,
      });
    }

    const { id } = req.params;
    const remark = await WordSetRemark.findByPk(id, {
      include: [{ model: WordSet, as: 'wordSet', attributes: ['id', 'owner_user_id', 'name'] }],
    });

    if (!remark) {
      return res.status(404).json({
        source: 'Failed to update remark',
        message: `Remark #${id} not found`,
      });
    }

    if (Number(remark.wordSet.owner_user_id) !== Number(req.userId)) {
      return res.status(403).json({
        source: 'Failed to update remark',
        message: 'Access denied',
      });
    }

    const updates = {};
    if (req.body.status !== undefined) updates.status = req.body.status;
    if (req.body.owner_note !== undefined) {
      updates.owner_note = String(req.body.owner_note ?? '').trim() || null;
    }

    await remark.update(updates);

    const updated = await WordSetRemark.findByPk(id, {
      include: [
        { model: WordSet, as: 'wordSet', attributes: ['id', 'name'] },
        { model: User, as: 'reporter', attributes: ['id', 'username'], required: false },
      ],
    });

    res.json({ item: updated });
  } catch (error) {
    return respondServerError(res, 'Failed to update remark', error);
  }
}

module.exports = {
  create,
  listForOwnerInbox,
  listForWordSet,
  update,
  REMARK_STATUSES,
};
