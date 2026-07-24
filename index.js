const dotenv = require('dotenv');
dotenv.config({ quiet: true });

const sequelize = require('./db');
const createApp = require('./createApp');
const { validateJwtSecret, shouldSyncAlter } = require('./utils/startup.js');

validateJwtSecret();

const app = createApp();

async function runPrerequisiteMigrations() {
  // Must run before sequelize.sync({ alter: true }): otherwise sync tries to
  // SET owner_user_id NOT NULL while nulls still exist and aborts all later migrations.
  try {
    const adminId = parseInt(process.env.ADMIN_USER_ID || '1', 10);
    await sequelize.query(
      `
        UPDATE word_sets
        SET
          owner_user_id = :adminId,
          visibility = 'public',
          is_public = TRUE
        WHERE owner_user_id IS NULL
      `,
      { replacements: { adminId } },
    );
  } catch (ownerMigrationError) {
    console.error('Word set owner pre-migration skipped: ', ownerMigrationError.message);
  }

  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS word_set_remarks (
        id SERIAL PRIMARY KEY,
        word_set_id INTEGER NOT NULL REFERENCES word_sets(id) ON DELETE CASCADE,
        reporter_user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
        word_id INTEGER NULL REFERENCES words(id) ON DELETE SET NULL,
        selected_text VARCHAR(500) NULL,
        comment TEXT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'queued',
        owner_note TEXT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  } catch (remarksMigrationError) {
    console.error('Word set remarks migration skipped: ', remarksMigrationError.message);
  }
}

async function runPostSyncMigrations() {
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
      { replacements: { adminId } },
    );
  } catch (adminMigrationError) {
    console.error('Admin migration skipped: ', adminMigrationError.message);
  }

  try {
    await sequelize.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_translation_locale VARCHAR(8) NOT NULL DEFAULT 'en'
    `);
    await sequelize.query(`ALTER TABLE users ALTER COLUMN preferred_translation_locale SET DEFAULT 'en'`);
    await sequelize.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS ui_locale VARCHAR(8) NOT NULL DEFAULT 'en'
    `);
  } catch (prefMigrationError) {
    console.error('User locale preferences migration skipped: ', prefMigrationError.message);
  }

  try {
    await sequelize.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ
    `);
    await sequelize.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ
    `);
    await sequelize.query(`
      UPDATE users SET created_at = NOW() WHERE created_at IS NULL
    `);
  } catch (userTimestampsMigrationError) {
    console.error('User timestamps migration skipped: ', userTimestampsMigrationError.message);
  }

  try {
    await sequelize.query(`
      ALTER TABLE word_sets ADD COLUMN IF NOT EXISTS source_locale VARCHAR(8) NOT NULL DEFAULT 'de'
    `);
    await sequelize.query(`
      ALTER TABLE word_sets ADD COLUMN IF NOT EXISTS translation_locales JSONB NOT NULL DEFAULT '["uk"]'::jsonb
    `);

    await sequelize.query(`
      INSERT INTO word_translations (word_id, locale, word_translation, sentence_translation)
      SELECT id, 'uk', word_translation_uk, sentence_translation_uk
      FROM words
      WHERE word_translation_uk IS NOT NULL AND sentence_translation_uk IS NOT NULL
      ON CONFLICT (word_id, locale) DO NOTHING
    `);

    await sequelize.query('ALTER TABLE words ALTER COLUMN word_translation_uk DROP NOT NULL');
    await sequelize.query('ALTER TABLE words ALTER COLUMN sentence_translation_uk DROP NOT NULL');
  } catch (localesMigrationError) {
    console.error('Locales migration skipped: ', localesMigrationError.message);
  }

  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS user_word_progress (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        word_id INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
        next_at TIMESTAMPTZ NULL,
        stage INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, word_id)
      )
    `);
  } catch (progressMigrationError) {
    console.error('User word progress migration skipped: ', progressMigrationError.message);
  }

  try {
    await sequelize.query(`
      ALTER TABLE word_translations
      DROP CONSTRAINT IF EXISTS word_translations_word_id_fkey
    `);
    await sequelize.query(`
      ALTER TABLE word_translations
      ADD CONSTRAINT word_translations_word_id_fkey
      FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
    `);
  } catch (translationsFkMigrationError) {
    console.error('word_translations FK cascade migration skipped: ', translationsFkMigrationError.message);
  }

  try {
    await sequelize.query(`
      ALTER TABLE word_sets
      ALTER COLUMN owner_user_id SET NOT NULL
    `);
  } catch (ownerNotNullMigrationError) {
    console.error('Word set owner NOT NULL migration skipped: ', ownerNotNullMigrationError.message);
  }
}

const syncOptions = shouldSyncAlter() ? { alter: true } : {};

(async () => {
  try {
    await runPrerequisiteMigrations();
    await sequelize.sync(syncOptions);
    console.log(shouldSyncAlter() ? 'Database synced (alter: true)' : 'Database synced');
    await runPostSyncMigrations();
  } catch (err) {
    console.error('Error syncing database: ', err);
  }
})();

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
