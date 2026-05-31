const { UsersWordSets } = require('../models/models');
const { consoleError } = require('../utils');

async function toggleSaving(req, res) {
  try {
    const wordSetId = req.params.id;
    const userId = req.userId; // retrieve from the verifyToken middleware

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
    consoleError('Помилка при зміні статусу набору: ' + error.message);
    res.status(500).json({
      source: 'Помилка при зміні статусу набору',
      message: error.message
    });
  }
}

module.exports = { toggleSaving };