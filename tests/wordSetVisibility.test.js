const { Op } = require('sequelize');
const {
  normalizeVisibility,
  canAccessWordSet,
  isListedOnHome,
  buildPublicListingCondition,
} = require('../utils/wordSetVisibility');

describe('wordSetVisibility', () => {
  describe('normalizeVisibility', () => {
    it('returns private for null', () => {
      expect(normalizeVisibility(null)).toBe('private');
    });

    it('reads visibility when it is valid', () => {
      expect(normalizeVisibility({ visibility: 'unlisted' })).toBe('unlisted');
    });

    it('falls back to is_public for legacy rows', () => {
      expect(normalizeVisibility({ is_public: true })).toBe('public');
      expect(normalizeVisibility({ is_public: false })).toBe('private');
    });
  });

  describe('canAccessWordSet', () => {
    const privateSet = { owner_user_id: 5, visibility: 'private' };
    const publicSet = { owner_user_id: 5, visibility: 'public' };
    const unlistedSet = { owner_user_id: 5, visibility: 'unlisted' };

    it('owner can see their private set', () => {
      expect(canAccessWordSet(privateSet, 5)).toBe(true);
    });

    it('another user cannot see a private set', () => {
      expect(canAccessWordSet(privateSet, 99)).toBe(false);
      expect(canAccessWordSet(privateSet, null)).toBe(false);
    });

    it('public and unlisted are available without auth', () => {
      expect(canAccessWordSet(publicSet, null)).toBe(true);
      expect(canAccessWordSet(unlistedSet, null)).toBe(true);
    });
  });

  describe('isListedOnHome', () => {
    it('only public on the home page', () => {
      expect(isListedOnHome({ visibility: 'public' })).toBe(true);
      expect(isListedOnHome({ visibility: 'unlisted' })).toBe(false);
      expect(isListedOnHome({ visibility: 'private' })).toBe(false);
    });
  });

  describe('buildPublicListingCondition', () => {
    it('builds a condition only for public sets', () => {
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
