const dotenv = require('dotenv');
dotenv.config({ quiet: true });

const sequelize = require('./db');
const createApp = require('./createApp');
const { validateJwtSecret, shouldSyncAlter } = require('./utils/startup.js');

validateJwtSecret();

const app = createApp();

const syncOptions = shouldSyncAlter() ? { alter: true } : {};

sequelize.sync(syncOptions)
  .then(async () => {
    console.log(shouldSyncAlter() ? 'Database synced (alter: true)' : 'Database synced');

    try {
      await sequelize.query(`
        UPDATE word_sets
        SET visibility = CASE WHEN is_public = TRUE THEN 'public' ELSE 'private' END
        WHERE visibility IS NULL OR visibility = ''
      `);
    } catch (migrationError) {
      console.error('Visibility migration skipped: ', migrationError.message);
    }

    try {
      await sequelize.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false
      `);
      const adminId = parseInt(process.env.ADMIN_USER_ID || '1', 10);
      await sequelize.query(
        'UPDATE users SET is_admin = true WHERE id = :adminId',
        { replacements: { adminId } }
      );
    } catch (adminMigrationError) {
      console.error('Admin migration skipped: ', adminMigrationError.message);
    }
  })
  .catch((err) => console.error('Error syncing database: ', err));

const SERVER_PORT = process.env.SERVER_PORT || 3001;
if (require.main === module) {
  app.listen(SERVER_PORT, (err) => {
    if (err) {
      return console.error(err);
    }

    console.log(`Server running on port ${SERVER_PORT}`);
  });
}

module.exports = app;
