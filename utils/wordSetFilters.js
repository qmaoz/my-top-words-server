const ALLOWED_WORD_SET_LIST_FILTERS = ['own', 'saved', 'top'];

function resolveWordSetListFilter(filter) {
  return ALLOWED_WORD_SET_LIST_FILTERS.includes(filter) ? filter : 'top';
}

function requiresAuthForWordSetListFilter(filter) {
  return filter === 'own' || filter === 'saved';
}

module.exports = {
  ALLOWED_WORD_SET_LIST_FILTERS,
  resolveWordSetListFilter,
  requiresAuthForWordSetListFilter,
};
