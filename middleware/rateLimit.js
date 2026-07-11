const rateLimit = require('express-rate-limit');

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    source: 'Помилка авторизації',
    message: 'Забагато спроб. Спробуйте пізніше.',
  },
});

module.exports = { authRateLimit };
