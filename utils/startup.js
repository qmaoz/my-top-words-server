function validateJwtSecret() {
  const secret = process.env.JWT_SECRET_KEY;
  const isProduction = process.env.NODE_ENV === 'production';
  const minLength = isProduction ? 32 : 16;

  if (!secret || typeof secret !== 'string' || secret.trim().length < minLength) {
    throw new Error(
      `JWT_SECRET_KEY має бути встановлений і містити щонайменше ${minLength} символів`
    );
  }

  if (!isProduction && secret.trim().length < 32) {
    console.warn('Увага: для production JWT_SECRET_KEY має містити щонайменше 32 випадкових символів');
  }
}

function shouldSyncAlter() {
  return process.env.DB_SYNC_ALTER === 'true' && process.env.NODE_ENV !== 'production';
}

module.exports = { validateJwtSecret, shouldSyncAlter };
