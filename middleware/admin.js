const { User } = require('../models/models');

async function verifyAdmin(req, res, next) {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: ['id', 'is_admin'],
    });

    if (!user?.is_admin) {
      return res.status(403).json({
        source: 'Access error',
        message: 'Access denied',
      });
    }

    next();
  } catch (error) {
    const { respondServerError } = require('../utils/apiResponse');
    return respondServerError(res, 'Admin permission check failed', error);
  }
}

module.exports = { verifyAdmin };
