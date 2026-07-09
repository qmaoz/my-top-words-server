const ADMIN_USER_ID = parseInt(process.env.ADMIN_USER_ID || '1', 10);

function verifyAdmin(req, res, next) {
  if (req.userId !== ADMIN_USER_ID) {
    return res.status(403).json({
      source: 'Помилка доступу',
      message: 'Доступ заборонено',
    });
  }

  next();
}

module.exports = { verifyAdmin, ADMIN_USER_ID };
