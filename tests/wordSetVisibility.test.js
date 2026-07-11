const { Op } = require('sequelize');
const {
  normalizeVisibility,
  canAccessWordSet,
  isListedOnHome,
  buildPublicListingCondition,
} = require('../utils/wordSetVisibility');

describe('wordSetVisibility', () => {
  describe('normalizeVisibility', () => {
    it('повертає private для null', () => {
      expect(normalizeVisibility(null)).toBe('private');
    });

    it('читає visibility, якщо вона валідна', () => {
      expect(normalizeVisibility({ visibility: 'unlisted' })).toBe('unlisted');
    });

    it('fallback на is_public для legacy записів', () => {
      expect(normalizeVisibility({ is_public: true })).toBe('public');
      expect(normalizeVisibility({ is_public: false })).toBe('private');
    });
  });

  describe('canAccessWordSet', () => {
    const privateSet = { owner_user_id: 5, visibility: 'private' };
    const publicSet = { owner_user_id: 5, visibility: 'public' };
    const unlistedSet = { owner_user_id: 5, visibility: 'unlisted' };
    const systemSet = { owner_user_id: null, visibility: 'private' };

    it('власник бачить свій private набір', () => {
      expect(canAccessWordSet(privateSet, 5)).toBe(true);
    });

    it('чужий користувач не бачить private набір', () => {
      expect(canAccessWordSet(privateSet, 99)).toBe(false);
      expect(canAccessWordSet(privateSet, null)).toBe(false);
    });

    it('public і unlisted доступні без авторизації', () => {
      expect(canAccessWordSet(publicSet, null)).toBe(true);
      expect(canAccessWordSet(unlistedSet, null)).toBe(true);
    });

    it('системний набір (owner null) доступний усім', () => {
      expect(canAccessWordSet(systemSet, null)).toBe(true);
      expect(canAccessWordSet(systemSet, 1)).toBe(true);
    });
  });

  describe('isListedOnHome', () => {
    it('лише public на головній', () => {
      expect(isListedOnHome({ visibility: 'public' })).toBe(true);
      expect(isListedOnHome({ visibility: 'unlisted' })).toBe(false);
      expect(isListedOnHome({ visibility: 'private' })).toBe(false);
    });
  });

  describe('buildPublicListingCondition', () => {
    it('будує умову лише для публічних наборів', () => {
      const condition = buildPublicListingCondition({ Op });
      expect(condition[Op.or]).toEqual([
        { visibility: 'public' },
        {
          visibility: { [Op.is]: null },
          is_public: true,
        },
      ]);
    });
  });
});
