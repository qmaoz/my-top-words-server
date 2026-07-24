const { UsersWordSets, WordSet } = require('../models/models');
const { respondServerError } = require('../utils/apiResponse');
const { canAccessWordSet } = require('../utils/wordSetVisibility');

async function toggleSaving(req, res) {
  try {
    const { wordSetId } = req.params;
    const userId = req.userId;

    const wordSet = await WordSet.findByPk(wordSetId);
    if (!wordSet || !canAccessWordSet(wordSet.get({ plain: true }), userId)) {
      return res.status(404).json({
        source: 'Failed to change set status',
        message: 'Set not found or access is denied',
      });
    }

    const existingRecord = await UsersWordSets.findOne({
      where: {
        user_id: userId,
        word_set_id: wordSetId
      }
    });

    const nextStatus = existingRecord ? false : true;

    if (nextStatus === true) {
      await UsersWordSets.create({
        user_id: userId,
        word_set_id: wordSetId
      });
    } else if (nextStatus === false) {
      await existingRecord.destroy();
    }

    res.json({
      success: true,
      isSavedForLearning: nextStatus
    });
  } catch (error) {
    return respondServerError(res, 'Failed to change set status', error);
  }
}

module.exports = { toggleSaving };
