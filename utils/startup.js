function validateJwtSecret() {
  const secret = process.env.JWT_SECRET_KEY;
  const isProduction = process.env.NODE_ENV === 'production';
  const minLength = isProduction ? 32 : 16;

  if (!secret || typeof secret !== 'string' || secret.trim().length < minLength) {
    throw new Error(
      `JWT_SECRET_KEY must be set and contain at least ${minLength} characters`
    );
  }

  if (!isProduction && secret.trim().length < 32) {
    console.warn('Warning: for production JWT_SECRET_KEY should contain at least 32 random characters');
  }
}

function shouldSyncAlter() {
  return process.env.DB_SYNC_ALTER === 'true' && process.env.NODE_ENV !== 'production';
}

module.exports = { validateJwtSecret, shouldSyncAlter };
