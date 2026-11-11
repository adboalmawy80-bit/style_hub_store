const router = require('express').Router();
const crypto = require('crypto');
const { z } = require('zod');
const db = require('../config/db');
const { publicUrl } = require('../config/env');
const stripe = require('../services/stripe');
const orders = require('../services/orders');
const { wrap, validate, HttpError } = require('../middleware/common');
const { optionalAuth, requireAuth } = require('../middleware/auth');
const P = require('../services/pricing');

const schema = z.object({
  country: z.string().length(2).toUpperCase(),
  paymentMethod: z.enum(['cod', 'card']).default('cod'),
  lang: z.enum(['ar', 'en']).default('ar'),
  customer: z.object({
    name: z.string().trim().min(3, 'اكتب الاسم الأول والأخير.').max(120),
    phone: z.string().trim().max(24),
    email: z.string().trim().email('اكتب بريدًا صحيحًا مثل name@example.com.').optional().or(z.literal('')),
    gov: z.string().trim().max(60).optional().default(''),
    city: z.string().trim().min(2, 'اكتب المدينة أو المنطقة.').max(80),
    address: z.string().trim().min(8, 'اكتب العنوان بالتفصيل (٨ أحرف على الأقل).').max(255),
    postal: z.string().trim().max(20).optional().default(''),
    notes: z.string().trim().max(255).optional().default('')
  }),
  items: z.array(z.object({
    id: z.number().int().positive(), color: z.string(), size: z.string(), qty: z.number().int().min(1).max(20)
  })).min(1, 'السلة فاضية.').max(40),
  coupon: z.string().trim().toUpperCase().max(30).optional().or(z.literal(''))
});

/* السعر والمخزون والشحن والخصم والعملة كلها تُحسب هنا. من المتصفح نأخذ فقط (المنتج، اللون، المقاس، الكمية، الدولة) */
router.post('/', optionalAuth, validate(schema), wrap(async (req, res) => {
  const { country, paymentMethod, lang, customer: c, items, coupon: code } = req.body;
  const [[ct]] = await db.query('SELECT * FROM countries WHERE code = ? AND is_active = 1', [country]);
  if (!ct) throw new HttpError(400, 'الدولة غير مدعومة حاليًا.');
  const rate = Number(ct.rate), region = P.regionOf(ct.code);

  if (paymentMethod === 'cod' && ct.code !== 'EG') throw new HttpError(400, 'الدفع عند الاستلام متاح داخل مصر فقط.');
  if (paymentMethod === 'card' && !stripe.enabled) throw new HttpError(400, 'الدفع بالبطاقة غير مفعّل حاليًا.');
  const bad = P.phoneProblem(ct.code, c.phone); if (bad) throw new HttpError(400, bad);
  if ((region !== 'EG' || paymentMethod === 'card') && !c.email) throw new HttpError(400, 'البريد الإلكتروني مطلوب لإرسال إيصال الدفع.');
  if (region === 'EU' && !c.postal) throw new HttpError(400, 'اكتب الرمز البريدي.');
  if (ct.code === 'EG' && !c.gov) throw new HttpError(400, 'اختر المحافظة.');

  const phone = c.phone.replace(/[\s-]/g, '');
  const conn = await db.getConnection();
  let order;
  try {
    await conn.beginTransaction();
    const lines = [];
    // ترتيب ثابت لتفادي deadlock بين الطلبات المتزامنة
    const sorted = [...items].sort((a, b) => a.id - b.id || a.color.localeCompare(b.color) || a.size.localeCompare(b.size));
    for (const it of sorted) {
      const [[v]] = await conn.query(
        `SELECT v.id, v.stock, p.name, p.name_en, p.price FROM product_variants v JOIN products p ON p.id = v.product_id
          WHERE v.product_id = ? AND v.color_name = ? AND v.size = ? AND p.is_active = 1 FOR UPDATE`, [it.id, it.color, it.size]);
      if (!v) throw new HttpError(400, 'أحد المنتجات لم يعد متاحًا بهذا اللون والمقاس.');
      if (v.stock < it.qty) throw new HttpError(409, `الكمية المتاحة من «${v.name}» (${it.color} / ${it.size}) هي ${v.stock} فقط.`);
      lines.push({ ...it, variantId: v.id, name: v.name, nameEn: v.name_en, unitC: P.unitCents(v.price, rate) });
    }
    const subtotalC = lines.reduce((s, l) => s + l.unitC * l.qty, 0);

    let coupon = null;
    if (code) {
      [[coupon]] = await conn.query('SELECT * FROM coupons WHERE code = ?', [code]);
      const cp = P.couponProblem(coupon, subtotalC, rate);
      if (cp) throw new HttpError(400, cp);
    }
    let shipC, freeC = P.toCents(ct.free_from);
    if (ct.code === 'EG') {
      const [[zone]] = await conn.query('SELECT fee FROM shipping_zones WHERE governorate = ?', [c.gov]);
      if (!zone) throw new HttpError(400, 'المحافظة غير مدعومة.');
      shipC = P.unitCents(zone.fee, rate);
    } else shipC = P.toCents(ct.ship_fee);
    const t = P.computeTotals({ subtotalC, coupon, rate, shipC, freeC });

    const ref = 'SH-' + crypto.randomInt(100000, 999999);
    const totalEgp = Math.round(P.major(t.total) / rate * 100) / 100;
    const [o] = await conn.query(
      `INSERT INTO orders (ref,user_id,customer_name,phone,email,country,governorate,city,postal_code,address,notes,subtotal,discount,coupon_code,shipping,total,currency,fx_rate,total_egp,payment_method)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [ref, req.user ? req.user.id : null, c.name, phone, c.email || null, ct.code, c.gov || '', c.city, c.postal || null, c.address, c.notes || null,
        P.major(t.subtotal), P.major(t.discount), coupon ? coupon.code : null, P.major(t.shipping), P.major(t.total), ct.currency, rate, totalEgp, paymentMethod]);
    for (const l of lines) {
      await conn.query('INSERT INTO order_items (order_id,product_id,variant_id,name,color_name,size,qty,unit_price) VALUES (?,?,?,?,?,?,?,?)',
        [o.insertId, l.id, l.variantId, l.name, l.color, l.size, l.qty, P.major(l.unitC)]);
      await conn.query('UPDATE product_variants SET stock = stock - ? WHERE id = ?', [l.qty, l.variantId]);   // الحجز يتم للدفع عند الاستلام وللبطاقة معًا
    }
    await conn.commit();
    order = { id: o.insertId, ref, t, lines, currency: ct.currency, email: c.email };
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }

  if (paymentMethod === 'cod') return res.status(201).json({ ref: order.ref, ...apiTotals(order) });

  /* بطاقة: ننشئ جلسة Stripe Checkout. لو فشلت نلغي الطلب ونرجع المخزون فورًا */
  try {
    const s = stripe.get(), cur = ct.currency.toLowerCase(), en = lang === 'en';
    const minor = cents => P.stripeMinor(cents, ct.currency);
    const params = {
      mode: 'payment',
      client_reference_id: order.ref,
      customer_email: order.email || undefined,
      locale: en ? 'en' : 'auto',   // Stripe لا يدعم العربية في صفحة الدفع: auto يتبع لغة المتصفح
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
      line_items: order.lines.map(l => ({ quantity: l.qty, price_data: { currency: cur, unit_amount: minor(l.unitC), product_data: { name: `${(en && l.nameEn) || l.name} — ${l.color} / ${l.size}` } } })),
      shipping_options: [{ shipping_rate_data: { type: 'fixed_amount', fixed_amount: { amount: minor(order.t.shipping), currency: cur }, display_name: en ? 'Shipping' : 'الشحن' } }],
      metadata: { ref: order.ref },
      payment_intent_data: { metadata: { ref: order.ref } },
      success_url: `${publicUrl}/checkout.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${publicUrl}/checkout.html?canceled=1`
    };
    if (order.t.discount > 0) {
      const cp = await s.coupons.create({ amount_off: minor(order.t.discount), currency: cur, duration: 'once', name: code || 'Discount' });
      params.discounts = [{ coupon: cp.id }];
    }
    const session = await s.checkout.sessions.create(params);
    await db.query('UPDATE orders SET stripe_session_id = ? WHERE id = ?', [session.id, order.id]);
    res.status(201).json({ ref: order.ref, url: session.url, ...apiTotals(order) });
  } catch (e) {
    await orders.cancelUnpaid(order.id).catch(() => {});
    console.error('[stripe] تعذّر إنشاء جلسة الدفع: ' + e.message);
    throw new HttpError(502, 'تعذّر بدء الدفع بالبطاقة: ' + (e.raw && e.raw.message || e.message));   // رسالة Stripe نفسها (مثل نقص صلاحية المفتاح أو عدم تفعيل الحساب)
  }
}));
const apiTotals = o => ({ subtotal: P.major(o.t.subtotal), discount: P.major(o.t.discount), shipping: P.major(o.t.shipping), total: P.major(o.t.total), currency: o.currency });

/* بعد رجوع العميل من Stripe: نتحقق من الجلسة مباشرة من Stripe (لا نثق بالرابط) */
router.get('/confirm', wrap(async (req, res) => {
  const sid = String(req.query.session_id || '');
  if (!/^cs_[\w]+$/.test(sid) || !stripe.enabled) throw new HttpError(400, 'جلسة غير صحيحة.');
  const o = await orders.bySession(sid);
  if (!o) throw new HttpError(404, 'الطلب غير موجود.');
  let paid = o.payment_status === 'paid';
  if (!paid) {
    const s = await stripe.get().checkout.sessions.retrieve(sid);
    if (s.payment_status === 'paid') { await orders.markPaid(o.id); paid = true; }
  }
  res.json({ paid, ref: o.ref, total: Number(o.total), currency: o.currency });
}));

router.get('/mine', requireAuth, wrap(async (req, res) => {
  const [rows] = await db.query('SELECT ref,status,payment_status,payment_method,total,currency,created_at FROM orders WHERE user_id = ? ORDER BY id DESC', [req.user.id]);
  res.json(rows);
}));
module.exports = router;
