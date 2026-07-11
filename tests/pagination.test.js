const { parsePagination, MAX_PAGE_LIMIT } = require('../utils/pagination');

describe('parsePagination', () => {
  it('повертає значення за замовчуванням', () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 12, offset: 0 });
  });

  it('обчислює offset для другої сторінки', () => {
    expect(parsePagination({ page: '2', limit: '10' })).toEqual({
      page: 2,
      limit: 10,
      offset: 10,
    });
  });

  it('обмежує limit зверху', () => {
    expect(parsePagination({ limit: '99999' }).limit).toBe(MAX_PAGE_LIMIT);
  });

  it('не дозволяє page < 1', () => {
    expect(parsePagination({ page: '-3' }).page).toBe(1);
  });

  it('невалідний limit повертає defaultLimit', () => {
    expect(parsePagination({ limit: '0' }).limit).toBe(12);
  });
});
