const router = require('express').Router();
const db = require('../config/db');
const stripe = require('../services/stripe');
const { wrap, HttpError } = require('../middleware/common');
const products = require('../models/products');
const P = require('../services/pricing');

router.get('/meta', wrap(async (_req, res) => {
  const [categories] = await db.query('SELECT slug AS id, name FROM categories ORDER BY id');
  const [zones] = await db.query('SELECT governorate, fee FROM shipping_zones ORDER BY fee, governorate');
  const [cs] = await db.query('SELECT * FROM countries WHERE is_active = 1 ORDER BY code = \'EG\' DESC, name_en');
  const countries = cs.map(c => ({ code: c.code, ar: c.name_ar, en: c.name_en, cur: c.currency, rate: Number(c.rate), ship: Number(c.ship_fee), free: Number(c.free_from), region: P.regionOf(c.code) }));
  res.json({ categories, governorates: zones.map(z => [z.governorate, Number(z.fee)]), countries, cardEnabled: stripe.enabled });
}));

const SORTS = { new: 'p.id DESC', low: 'p.price ASC', high: 'p.price DESC', rating: 'p.rating DESC' };
router.get('/products', wrap(async (req, res) => {
  const { cat, q, sale, sort } = req.query;
  let where = '', params = [];
  if (cat) { where += ' AND c.slug = ?'; params.push(String(cat)); }
  if (sale === '1') where += ' AND p.old_price IS NOT NULL';
  if (q) { where += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.name_en LIKE ?)'; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  res.json(await products.load({ where, params, order: SORTS[sort] || SORTS.new }));
}));
router.get('/products/:id', wrap(async (req, res) => {
  const [p] = await products.load({ where: ' AND p.id = ?', params: [Number(req.params.id) || 0] });
  if (!p) throw new HttpError(404, 'المنتج غير موجود.');
  res.json(p);
}));

/* صور المنتجات: مخزّنة في القاعدة، تُخدَم بكاش طويل لأن رقم الصورة لا يتكرر */
router.get('/images/:id', wrap(async (req, res) => {
  const [[img]] = await db.query('SELECT mime, data FROM product_images WHERE id = ?', [Number(req.params.id) || 0]);
  if (!img) throw new HttpError(404, 'الصورة غير موجودة.');
  res.set({ 'Content-Type': img.mime, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' }).send(img.data);
}));

/* التحقق من الكوبون: الحد الأدنى يُقارن بعملة الدولة. الواجهة تعرض الخصم بنفسها من النوع والقيمة */
router.post('/coupons/validate', wrap(async (req, res) => {
  const code = String(req.body.code || '').trim().toUpperCase();
  const [[ct]] = await db.query('SELECT rate FROM countries WHERE code = ?', [String(req.body.country || 'EG').toUpperCase()]);
  const rate = ct ? Number(ct.rate) : 1;
  // الواجهة لا ترسل المجموع؛ الحد الأدنى يُفرض فعليًا عند إنشاء الطلب
  const subtotalC = req.body.subtotal == null ? Number.MAX_SAFE_INTEGER : Math.max(0, Math.round(Number(req.body.subtotal) || 0));
  const [[c]] = await db.query('SELECT * FROM coupons WHERE code = ?', [code]);
  const bad = P.couponProblem(c, subtotalC, rate);
  if (bad) throw new HttpError(400, bad);
  res.json({ code, type: c.type, value: Number(c.value) });
}));
module.exports = router;
