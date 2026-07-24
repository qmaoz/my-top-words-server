const { LearnedUserWords, UserWordProgress } = require('../models/models');
const { respondServerError } = require('../utils/apiResponse');
const { canUserAccessWord } = require('../utils/wordAccess');

/** Days to wait after a successful graduation at stage 0..4. Stage 5 success → learned. */
const REVIEW_INTERVAL_DAYS = [1, 2, 3, 4, 5];

async function toggleLearned(req, res) {
  try {
    const { wordId } = req.params;
    const userId = req.userId;

    const { allowed, word } = await canUserAccessWord(wordId, userId);
    if (!word) {
      return res.status(404).json({
        source: 'Failed to change word status',
        message: `Word #${wordId} not found`
      });
    }

    if (!allowed) {
      return res.status(403).json({
        source: 'Failed to change word status',
        message: 'Access to this word is denied',
      });
    }

    const existingRecord = await LearnedUserWords.findOne({
      where: {
        user_id: userId,
        word_id: wordId
      }
    });

    const nextStatus = existingRecord ? false : true;

    if (nextStatus === true) {
      await LearnedUserWords.create({
        user_id: userId,
        word_id: wordId
      });
      await UserWordProgress.destroy({
        where: { user_id: userId, word_id: wordId },
      });
    } else {
      await existingRecord.destroy();
    }

    res.json({
      success: true,
      isLearned: nextStatus
    });
  } catch (error) {
    return respondServerError(res, 'Failed to change word status', error);
  }
}

/**
 * outcome:
 * - "again" — word stays in the active pool (next_at = null)
 * - "graduated" — schedule next review or mark as learned after stage 5
 */
async function reviewWord(req, res) {
  try {
    const wordId = Number(req.params.wordId);
    const userId = req.userId;
    const outcome = req.body?.outcome;

    if (outcome !== 'again' && outcome !== 'graduated') {
      return res.status(400).json({
        source: 'Failed to update progress',
        message: 'Expected outcome: again or graduated',
      });
    }

    const { allowed, word } = await canUserAccessWord(wordId, userId);
    if (!word) {
      return res.status(404).json({
        source: 'Failed to update progress',
        message: `Word #${wordId} not found`,
      });
    }

    if (!allowed) {
      return res.status(403).json({
        source: 'Failed to update progress',
        message: 'Access to this word is denied',
      });
    }

    const learned = await LearnedUserWords.findOne({
      where: { user_id: userId, word_id: wordId },
    });

    if (learned) {
      return res.json({
        success: true,
        isLearned: true,
        hasProgress: false,
        nextAt: null,
        reviewStage: 0,
      });
    }

    let progress = await UserWordProgress.findOne({
      where: { user_id: userId, word_id: wordId },
    });

    if (outcome === 'again') {
      if (!progress) {
        progress = await UserWordProgress.create({
          user_id: userId,
          word_id: wordId,
          next_at: null,
          stage: 0,
        });
      } else if (progress.next_at != null) {
        await progress.update({ next_at: null });
      }

      return res.json({
        success: true,
        isLearned: false,
        hasProgress: true,
        nextAt: null,
        reviewStage: progress.stage,
      });
    }

    // graduated
    if (!progress) {
      progress = await UserWordProgress.create({
        user_id: userId,
        word_id: wordId,
        next_at: null,
        stage: 0,
      });
    }

    if (progress.stage >= 5) {
      await LearnedUserWords.findOrCreate({
        where: { user_id: userId, word_id: wordId },
        defaults: { user_id: userId, word_id: wordId },
      });
      await progress.destroy();

      return res.json({
        success: true,
        isLearned: true,
        hasProgress: false,
        nextAt: null,
        reviewStage: 5,
      });
    }

    const days = REVIEW_INTERVAL_DAYS[progress.stage] ?? 5;
    const nextAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const nextStage = progress.stage + 1;

    await progress.update({
      stage: nextStage,
      next_at: nextAt,
    });

    return res.json({
      success: true,
      isLearned: false,
      hasProgress: true,
      nextAt: nextAt.toISOString(),
      reviewStage: nextStage,
    });
  } catch (error) {
    return respondServerError(res, 'Failed to update progress', error);
  }
}

module.exports = { toggleLearned, reviewWord };
