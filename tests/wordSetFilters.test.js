const {
  resolveWordSetListFilter,
  requiresAuthForWordSetListFilter,
} = require('../utils/wordSetFilters');

describe('wordSetFilters', () => {
  it('unknown filter becomes top', () => {
    expect(resolveWordSetListFilter(undefined)).toBe('top');
    expect(resolveWordSetListFilter('')).toBe('top');
    expect(resolveWordSetListFilter('hack')).toBe('top');
  });

  it('allowed filters are unchanged', () => {
    expect(resolveWordSetListFilter('own')).toBe('own');
    expect(resolveWordSetListFilter('saved')).toBe('saved');
    expect(resolveWordSetListFilter('top')).toBe('top');
  });

  it('own and saved require auth', () => {
    expect(requiresAuthForWordSetListFilter('own')).toBe(true);
    expect(requiresAuthForWordSetListFilter('saved')).toBe(true);
    expect(requiresAuthForWordSetListFilter('top')).toBe(false);
  });
});
