const router = require('express').Router();
const { z } = require('zod');
const db = require('../config/db');
const { wrap, validate, HttpError } = require('../middleware/common');
const { requireAdmin } = require('../middleware/auth');
const products = require('../models/products');
router.use(requireAdmin);

/* ---- لوحة المؤشرات ---- */
router.get('/stats', wrap(async (_req, res) => {
  const [[t]] = await db.query("SELECT COUNT(*) orders, COALESCE(SUM(CASE WHEN status<>'cancel' AND (payment_method='cod' OR payment_status='paid') THEN total_egp END),0) revenue, SUM(status IN ('new','prep')) pending FROM orders");
  const [[l]] = await db.query('SELECT COUNT(*) low FROM (SELECT product_id FROM product_variants GROUP BY product_id HAVING SUM(stock) <= 15) x');
  const [days] = await db.query("SELECT DATE(created_at) d, SUM(total_egp) v FROM orders WHERE status<>'cancel' AND created_at >= CURDATE() - INTERVAL 6 DAY GROUP BY DATE(created_at)");
  const [top] = await db.query("SELECT i.name, SUM(i.qty) qty FROM order_items i JOIN orders o ON o.id=i.order_id WHERE o.status<>'cancel' GROUP BY i.name ORDER BY qty DESC LIMIT 5");
  res.json({ ...t, lowStock: l.low, days, top });
}));

/* ---- الطلبات ---- */
router.get('/orders', wrap(async (req, res) => {
  const [rows] = await db.query('SELECT * FROM orders' + (req.query.status ? ' WHERE status = ?' : '') + ' ORDER BY id DESC LIMIT 500', req.query.status ? [req.query.status] : []);
  const [items] = rows.length ? await db.query('SELECT * FROM order_items WHERE order_id IN (?)', [rows.map(r => r.id)]) : [[]];
  res.json(rows.map(o => ({ ...o, items: items.filter(i => i.order_id === o.id) })));
}));
router.patch('/orders/:id/status', validate(z.object({ status: z.enum(['new', 'prep', 'ship', 'done', 'cancel']) })), wrap(async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[o]] = await conn.query('SELECT id,status,payment_method,payment_status FROM orders WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!o) throw new HttpError(404, 'الطلب غير موجود.');
    const to = req.body.status;
    if (o.payment_method === 'card' && o.payment_status !== 'paid' && to !== 'cancel' && to !== o.status) throw new HttpError(400, 'طلب البطاقة لم يُدفع بعد. انتظر تأكيد الدفع أو ألغِه.');
    if (o.status === 'cancel' && to !== 'cancel') throw new HttpError(400, 'لا يمكن إعادة فتح طلب ملغي. أنشئ طلبًا جديدًا.');
    if (to === 'cancel' && o.status !== 'cancel') // إرجاع المخزون عند الإلغاء
      await conn.query('UPDATE product_variants v JOIN order_items i ON i.variant_id = v.id SET v.stock = v.stock + i.qty WHERE i.order_id = ?', [o.id]);
    await conn.query('UPDATE orders SET status = ? WHERE id = ?', [to, o.id]);
    await conn.commit(); res.json({ ok: true, status: to });
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}));

/* ---- المنتجات ---- */
const variant = z.object({ color: z.string().min(1), hex: z.string().regex(/^#[0-9a-fA-F]{6}$/), size: z.string().min(1), stock: z.number().int().min(0) });
const prodSchema = z.object({
  name: z.string().trim().min(3, 'اكتب اسم المنتج.').max(160), name_en: z.string().trim().max(160).nullable().optional(), desc_en: z.string().max(2000).nullable().optional(), cat: z.string().min(1), type: z.enum(['tshirt', 'shirt', 'hoodie', 'jacket', 'jeans', 'dress', 'cap', 'bag']),
  price: z.number().positive('السعر لازم يكون أكبر من صفر.'), old: z.number().positive().nullable().optional(), tag: z.string().max(40).nullable().optional(),
  desc: z.string().max(2000).optional(), variants: z.array(variant).min(1, 'أضف مقاسًا ولونًا واحدًا على الأقل.')
});
async function save(conn, id, b) {
  const [[c]] = await conn.query('SELECT id FROM categories WHERE slug = ?', [b.cat]);
  if (!c) throw new HttpError(400, 'القسم غير موجود.');
  const f = [c.id, b.name, b.name_en || null, b.desc || '', b.desc_en || null, b.price, b.old || null, b.tag || null, b.type];
  if (id) await conn.query('UPDATE products SET category_id=?,name=?,name_en=?,description=?,description_en=?,price=?,old_price=?,tag=?,type=? WHERE id=?', [...f, id]);
  else [{ insertId: id }] = await conn.query('INSERT INTO products (category_id,name,name_en,description,description_en,price,old_price,tag,type) VALUES (?,?,?,?,?,?,?,?,?)', f);
  for (const v of b.variants) // تحديث/إضافة المتغيرات (المخزون يُستبدل بقيمة اللوحة)
    await conn.query('INSERT INTO product_variants (product_id,color_name,color_hex,size,stock) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE color_hex=VALUES(color_hex), stock=VALUES(stock)', [id, v.color, v.hex, v.size, v.stock]);
  return id;
}
const { tx } = require('../services/orders');
router.get('/products', wrap(async (_req, res) => res.json(await products.load({ includeInactive: true }))));
router.post('/products', validate(prodSchema), wrap(async (req, res) => res.status(201).json({ id: await tx(c => save(c, null, req.body)) })));
router.put('/products/:id', validate(prodSchema), wrap(async (req, res) => res.json({ id: await tx(c => save(c, Number(req.params.id), req.body)) })));
router.delete('/products/:id', wrap(async (req, res) => { // إخفاء بدل الحذف للحفاظ على سجل الطلبات
  const [r] = await db.query('UPDATE products SET is_active = 0 WHERE id = ?', [req.params.id]);
  if (!r.affectedRows) throw new HttpError(404, 'المنتج غير موجود.'); res.json({ ok: true });
}));

/* ---- صور المنتجات (تُرفع base64 بعد تصغيرها في المتصفح، وتُخزَّن في القاعدة) ---- */
const MAX_IMG = 1.5 * 1024 * 1024, MAX_PER_PRODUCT = 6;
function sniff(b) { // نتحقق من محتوى الملف الفعلي لا من الامتداد
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length > 12 && b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (b.length > 12 && b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP') return 'image/webp';
  return null;
}
const imgBody = z.object({ data: z.string().min(100).max(Math.ceil(MAX_IMG * 1.4)) });
router.post('/products/:id/images', validate(imgBody), wrap(async (req, res) => {
  const id = Number(req.params.id) || 0;
  const buf = Buffer.from(req.body.data.replace(/^data:[^,]*,/, ''), 'base64');
  if (buf.length > MAX_IMG) throw new HttpError(413, 'الصورة أكبر من ١٫٥ ميجا.');
  const mime = sniff(buf);
  if (!mime) throw new HttpError(400, 'الصورة لازم تكون JPG أو PNG أو WEBP.');
  const [[p]] = await db.query('SELECT id FROM products WHERE id = ?', [id]);
  if (!p) throw new HttpError(404, 'المنتج غير موجود.');
  const [[n]] = await db.query('SELECT COUNT(*) n, COALESCE(MAX(sort),0) m FROM product_images WHERE product_id = ?', [id]);
  if (n.n >= MAX_PER_PRODUCT) throw new HttpError(400, 'الحد الأقصى ٦ صور لكل منتج.');
  const [r] = await db.query('INSERT INTO product_images (product_id,mime,data,sort) VALUES (?,?,?,?)', [id, mime, buf, n.m + 1]);
  res.status(201).json({ id: r.insertId, url: '/api/images/' + r.insertId });
}));
router.delete('/products/:id/images/:imgId', wrap(async (req, res) => {
  const [r] = await db.query('DELETE FROM product_images WHERE id = ? AND product_id = ?', [req.params.imgId, req.params.id]);
  if (!r.affectedRows) throw new HttpError(404, 'الصورة غير موجودة.'); res.json({ ok: true });
}));
router.put('/products/:id/images/:imgId/main', wrap(async (req, res) => {
  const [[m]] = await db.query('SELECT COALESCE(MIN(sort),0) m FROM product_images WHERE product_id = ?', [req.params.id]);
  const [r] = await db.query('UPDATE product_images SET sort = ? WHERE id = ? AND product_id = ?', [m.m - 1, req.params.imgId, req.params.id]);
  if (!r.affectedRows) throw new HttpError(404, 'الصورة غير موجودة.'); res.json({ ok: true });
}));

/* ---- الدول والعملات وأسعار الصرف (الأسعار الأساسية بالجنيه) ---- */
const country = z.object({ rate: z.number().positive().max(100000), ship_fee: z.number().min(0), free_from: z.number().min(0), is_active: z.boolean() });
router.get('/countries', wrap(async (_req, res) => res.json((await db.query("SELECT * FROM countries ORDER BY code = 'EG' DESC, name_en"))[0].map(c => ({ ...c, rate: Number(c.rate), ship_fee: Number(c.ship_fee), free_from: Number(c.free_from), is_active: !!c.is_active })))));
router.put('/countries/:code', validate(country), wrap(async (req, res) => { const c = req.body, code = req.params.code.toUpperCase();
  if (code === 'EG' && (!c.is_active || c.rate !== 1)) throw new HttpError(400, 'مصر عملتها الأساسية: المعدل ١ ولا يمكن تعطيلها.');
  const [r] = await db.query('UPDATE countries SET rate=?, ship_fee=?, free_from=?, is_active=? WHERE code=?', [c.rate, c.ship_fee, c.free_from, c.is_active, code]);
  if (!r.affectedRows) throw new HttpError(404, 'الدولة غير موجودة.'); res.json({ ok: true }); }));

/* ---- العملاء والكوبونات ---- */
router.get('/customers', wrap(async (_req, res) => {
  const [rows] = await db.query("SELECT phone, MAX(customer_name) name, MAX(country) country, MAX(governorate) gov, COUNT(*) orders, COALESCE(SUM(CASE WHEN status<>'cancel' THEN total_egp END),0) spent, MAX(created_at) last_order FROM orders GROUP BY phone ORDER BY spent DESC");
  res.json(rows);
}));
const coupon = z.object({ code: z.string().trim().toUpperCase().min(3).max(30), type: z.enum(['percent', 'fixed']), value: z.number().positive(), min_subtotal: z.number().min(0).default(0), expires_at: z.string().nullable().optional(), is_active: z.boolean().default(true) })
  .refine(c => c.type !== 'percent' || c.value <= 100, { message: 'النسبة لا تتجاوز ١٠٠%.' });
router.get('/coupons', wrap(async (_req, res) => res.json((await db.query('SELECT * FROM coupons ORDER BY code'))[0])));
router.post('/coupons', validate(coupon), wrap(async (req, res) => { const c = req.body;
  await db.query('INSERT INTO coupons (code,type,value,min_subtotal,expires_at,is_active) VALUES (?,?,?,?,?,?)', [c.code, c.type, c.value, c.min_subtotal, c.expires_at || null, c.is_active]); res.status(201).json({ ok: true }); }));
router.put('/coupons/:code', validate(coupon), wrap(async (req, res) => { const c = req.body;
  await db.query('UPDATE coupons SET type=?,value=?,min_subtotal=?,expires_at=?,is_active=? WHERE code=?', [c.type, c.value, c.min_subtotal, c.expires_at || null, c.is_active, req.params.code]); res.json({ ok: true }); }));
module.exports = router;
