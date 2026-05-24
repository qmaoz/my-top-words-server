const { UsersWordSets } = require('../models/models');
const { consoleError } = require('../utils');

async function toggleSaving(req, res) {
  try {
    const wordSetId = req.params.id;
    const userId = req.userId; // Retrieve from the verifyToken middleware

    const record = await UsersWordSets.findOne({
      where: { user_id: userId, word_set_id: wordSetId }
    });

    const nextStatus = record ? !record.is_saved_for_learning : true;

    // Update or create a record
    await UsersWordSets.upsert({
      user_id: userId,
      word_set_id: wordSetId,
      is_saved_for_learning: nextStatus
    });

    res.json({ success: true, isSavedForLearning: nextStatus });
  } catch (error) {
    consoleError('Помилка при зміні статусу набору: ' + error.message);
    res.status(500).json({
      source: 'Помилка при зміні статусу набору',
      message: error.message
    });
  }
}

module.exports = { toggleSaving };