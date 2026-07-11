const { consoleError } = require('../utils');

const GENERIC_SERVER_ERROR = 'Внутрішня помилка сервера';
const GENERIC_AUTH_ERROR = 'Недійсний або прострочений токен';

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function serverErrorMessage(error) {
  return isProduction() ? GENERIC_SERVER_ERROR : (error?.message || GENERIC_SERVER_ERROR);
}

function respondServerError(res, source, error, status = 500) {
  consoleError(`${source}: ${error?.message || error}`);
  return res.status(status).json({
    source,
    message: serverErrorMessage(error),
  });
}

function respondAuthTokenError(res) {
  return res.status(401).json({
    source: 'Помилка під час перевірки токена',
    message: GENERIC_AUTH_ERROR,
  });
}

module.exports = {
  GENERIC_SERVER_ERROR,
  GENERIC_AUTH_ERROR,
  serverErrorMessage,
  respondServerError,
  respondAuthTokenError,
};
