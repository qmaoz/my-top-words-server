const { validateJwtSecret, shouldSyncAlter } = require('../utils/startup');

describe('startup', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('validateJwtSecret', () => {
    it('падає без секрету', () => {
      delete process.env.JWT_SECRET_KEY;
      expect(() => validateJwtSecret()).toThrow(/JWT_SECRET_KEY/);
    });

    it('проходить з довгим секретом у test', () => {
      process.env.NODE_ENV = 'test';
      process.env.JWT_SECRET_KEY = 'x'.repeat(32);
      expect(() => validateJwtSecret()).not.toThrow();
    });
  });

  describe('shouldSyncAlter', () => {
    it('true лише в dev з DB_SYNC_ALTER=true', () => {
      process.env.NODE_ENV = 'development';
      process.env.DB_SYNC_ALTER = 'true';
      expect(shouldSyncAlter()).toBe(true);
    });

    it('false у production навіть з DB_SYNC_ALTER=true', () => {
      process.env.NODE_ENV = 'production';
      process.env.DB_SYNC_ALTER = 'true';
      expect(shouldSyncAlter()).toBe(false);
    });
  });
});
