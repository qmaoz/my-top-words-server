const {
  resolveWordSetListFilter,
  requiresAuthForWordSetListFilter,
} = require('../utils/wordSetFilters');

describe('wordSetFilters', () => {
  it('невідомий filter стає top', () => {
    expect(resolveWordSetListFilter(undefined)).toBe('top');
    expect(resolveWordSetListFilter('')).toBe('top');
    expect(resolveWordSetListFilter('hack')).toBe('top');
  });

  it('дозволені фільтри не змінюються', () => {
    expect(resolveWordSetListFilter('own')).toBe('own');
    expect(resolveWordSetListFilter('saved')).toBe('saved');
    expect(resolveWordSetListFilter('top')).toBe('top');
  });

  it('own і saved вимагають авторизації', () => {
    expect(requiresAuthForWordSetListFilter('own')).toBe(true);
    expect(requiresAuthForWordSetListFilter('saved')).toBe(true);
    expect(requiresAuthForWordSetListFilter('top')).toBe(false);
  });
});
