const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');

function read(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return null;
  try { return jwt.verify(h.slice(7), jwtSecret); } catch { return null; }
}
const optionalAuth = (req, _res, next) => { req.user = read(req); next(); };
const requireAuth = (req, res, next) => {
  const u = read(req);
  if (!u) return res.status(401).json({ error: 'سجّل الدخول للمتابعة.' });
  req.user = u; next();
};
const requireAdmin = (req, res, next) => requireAuth(req, res, () =>
  req.user.role === 'admin' ? next() : res.status(403).json({ error: 'هذه الصفحة للمدير فقط.' }));
module.exports = { optionalAuth, requireAuth, requireAdmin };
