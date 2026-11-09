const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const db = require('../config/db');
const { jwtSecret, jwtExpires } = require('../config/env');
const { wrap, validate, HttpError } = require('../middleware/common');
const { requireAuth } = require('../middleware/auth');
const { PHONE_RE } = require('../services/pricing');

const DUMMY_HASH = bcrypt.hashSync('dummy-password', 12); // لمساواة زمن الرد عند بريد غير موجود
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'محاولات كثيرة. انتظر ١٥ دقيقة وحاول مرة أخرى.' } });
const token = u => jwt.sign({ id: u.id, role: u.role }, jwtSecret, { expiresIn: jwtExpires });
const pub = u => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role });

const registerSchema = z.object({
  name: z.string().trim().min(3, 'اكتب اسمك بالكامل.').max(120),
  email: z.string().trim().toLowerCase().email('اكتب بريدًا صحيحًا.'),
  phone: z.string().trim().regex(PHONE_RE, 'رقم الموبايل غير صحيح.').optional(),
  password: z.string().min(8, 'كلمة المرور ٨ أحرف على الأقل.').max(100)
});
router.post('/register', limiter, validate(registerSchema), wrap(async (req, res) => {
  const { name, email, phone, password } = req.body;
  const hash = await bcrypt.hash(password, 12);
  try {
    const [r] = await db.query('INSERT INTO users (name,email,phone,password_hash) VALUES (?,?,?,?)', [name, email, phone || null, hash]);
    const u = { id: r.insertId, name, email, phone: phone || null, role: 'customer' };
    res.status(201).json({ token: token(u), user: pub(u) });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'البريد مسجّل قبل كده. جرّب تسجيل الدخول.');
    throw e;
  }
}));

const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) });
router.post('/login', limiter, validate(loginSchema), wrap(async (req, res) => {
  const [[u]] = await db.query('SELECT * FROM users WHERE email = ?', [req.body.email]);
  // نفس الرسالة وزمن المقارنة سواء كان البريد موجودًا أم لا
  const ok = await bcrypt.compare(req.body.password, u ? u.password_hash : DUMMY_HASH);
  if (!u || !ok) throw new HttpError(401, 'البريد أو كلمة المرور غير صحيحة.');
  res.json({ token: token(u), user: pub(u) });
}));

router.get('/me', requireAuth, wrap(async (req, res) => {
  const [[u]] = await db.query('SELECT id,name,email,phone,role FROM users WHERE id = ?', [req.user.id]);
  if (!u) throw new HttpError(401, 'الحساب غير موجود.');
  res.json(u);
}));
module.exports = router;
