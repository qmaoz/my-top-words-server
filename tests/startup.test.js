const { validateJwtSecret, shouldSyncAlter } = require('../utils/startup');

describe('startup', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('validateJwtSecret', () => {
    it('fails without a secret', () => {
      delete process.env.JWT_SECRET_KEY;
      expect(() => validateJwtSecret()).toThrow(/JWT_SECRET_KEY/);
    });

    it('passes with a long secret in test', () => {
      process.env.NODE_ENV = 'test';
      process.env.JWT_SECRET_KEY = 'x'.repeat(32);
      expect(() => validateJwtSecret()).not.toThrow();
    });
  });

  describe('shouldSyncAlter', () => {
    it('true only in dev with DB_SYNC_ALTER=true', () => {
      process.env.NODE_ENV = 'development';
      process.env.DB_SYNC_ALTER = 'true';
      expect(shouldSyncAlter()).toBe(true);
    });

    it('false in production even with DB_SYNC_ALTER=true', () => {
      process.env.NODE_ENV = 'production';
      process.env.DB_SYNC_ALTER = 'true';
      expect(shouldSyncAlter()).toBe(false);
    });
  });
});
