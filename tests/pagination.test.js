const { parsePagination, MAX_PAGE_LIMIT } = require('../utils/pagination');

describe('parsePagination', () => {
  it('returns default values', () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 12, offset: 0 });
  });

  it('calculates offset for the second page', () => {
    expect(parsePagination({ page: '2', limit: '10' })).toEqual({
      page: 2,
      limit: 10,
      offset: 10,
    });
  });

  it('caps limit from above', () => {
    expect(parsePagination({ limit: '99999' }).limit).toBe(MAX_PAGE_LIMIT);
  });

  it('does not allow page < 1', () => {
    expect(parsePagination({ page: '-3' }).page).toBe(1);
  });

  it('invalid limit returns defaultLimit', () => {
    expect(parsePagination({ limit: '0' }).limit).toBe(12);
  });
});
