const { User } = require('../models/models');

const TOUCH_INTERVAL_MS = 5 * 60 * 1000;
const lastTouchedAt = new Map();

function touchLastSeen(userId) {
  if (userId == null) return;

  const id = Number(userId);
  if (!Number.isFinite(id)) return;

  const now = Date.now();
  const previous = lastTouchedAt.get(id);
  if (previous != null && now - previous < TOUCH_INTERVAL_MS) {
    return;
  }

  lastTouchedAt.set(id, now);
  User.update({ last_seen_at: new Date() }, { where: { id } }).catch(() => {});
}

function trackLastSeen(req, _res, next) {
  if (req.userId != null) {
    touchLastSeen(req.userId);
  }
  next();
}

module.exports = { trackLastSeen, touchLastSeen };
