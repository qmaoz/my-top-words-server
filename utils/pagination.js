const MAX_PAGE_LIMIT = 100;

function parsePagination(query, { defaultLimit = 12, maxLimit = MAX_PAGE_LIMIT } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const parsedLimit = parseInt(query.limit, 10);
  const rawLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : defaultLimit;
  const limit = Math.min(maxLimit, Math.max(1, rawLimit));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

module.exports = { parsePagination, MAX_PAGE_LIMIT };
