const rateLimit = require('express-rate-limit');

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    source: 'Authentication error',
    message: 'Too many attempts. Please try again later.',
  },
});

module.exports = { authRateLimit };
