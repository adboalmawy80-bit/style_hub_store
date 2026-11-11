/* فحص شامل للإعدادات والقاعدة:  npm run doctor */
const ok = m => console.log('  ✔ ' + m), bad = m => console.log('  ✘ ' + m), step = m => console.log('\n' + m);
const TABLES = ['users', 'categories', 'products', 'product_variants', 'coupons', 'shipping_zones', 'orders', 'order_items', 'countries', 'product_images'];
(async () => {
  let problems = 0; const fail = (m, fix) => { problems++; bad(m); if (fix) console.log('     ← ' + fix); };
  step('١) ملف .env');
  try { require('../backend/config/env'); ok('المتغيرات الأساسية موجودة وJWT_SECRET قوي'); }
  catch (e) { fail(e.message, 'عدّل ملف .env ثم أعد المحاولة'); return finish(); }
  const e = process.env;
  ok(`الخادم: ${e.DB_HOST}:${e.DB_PORT || 3306}  — القاعدة: ${e.DB_NAME} — SSL: ${e.DB_SSL === 'true' ? 'مفعّل' : 'غير مفعّل'}`);
  if (/tidbcloud/i.test(e.DB_HOST || '') && e.DB_SSL !== 'true') fail('TiDB Cloud يتطلب DB_SSL=true', 'ضع DB_SSL=true وDB_PORT=4000 في .env');
  if (!e.ADMIN_PASSWORD || e.ADMIN_PASSWORD.length < 12 || /change_me/i.test(e.ADMIN_PASSWORD)) fail('ADMIN_PASSWORD غير صالح (١٢ حرفًا فأكثر وليس change_me)', 'عدّله ثم شغّل npm run seed');
  const st = require('../backend/config/env').stripe;
  if (st.secretKey) ok(`Stripe: المفتاح السري موجود (${st.secretKey.startsWith('sk_live') ? 'وضع حقيقي LIVE' : 'وضع تجريبي TEST'})`); else console.log('  • Stripe غير مفعّل (اختياري): ضع STRIPE_SECRET_KEY في .env لتفعيل الدفع بالبطاقة');
  if (st.secretKey && !st.webhookSecret) fail('STRIPE_WEBHOOK_SECRET غير مضبوط', 'أنشئ webhook على /api/stripe/webhook وضع السر في .env (راجع README)');
  step('٢) الاتصال بقاعدة البيانات');
  const db = require('../backend/config/db');
  try { await db.query('SELECT 1'); ok('تم الاتصال'); } catch (x) { fail(`تعذّر الاتصال: ${x.code || ''} ${x.message}`, 'راجع DB_HOST وDB_USER وDB_PASSWORD وDB_PORT وDB_SSL'); await db.end().catch(() => {}); return finish(); }
  step('٣) الجداول');
  const [t] = await db.query('SHOW TABLES'); const have = t.map(r => Object.values(r)[0]);
  const missing = TABLES.filter(x => !have.includes(x));
  missing.length ? fail('جداول ناقصة: ' + missing.join('، '), 'شغّل: npm run setup') : ok('كل الجداول موجودة (' + TABLES.length + ')');
  if (!missing.length) {
    const { MIGRATIONS } = require('./setup');
    const lack = [];
    for (const [t2, c2] of MIGRATIONS) { const [[r]] = await db.query('SELECT COUNT(*) n FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?', [t2, c2]); if (!r.n) lack.push(t2 + '.' + c2); }
    lack.length ? fail('أعمدة ناقصة (قاعدة قديمة): ' + lack.join('، '), 'شغّل: npm run setup') : ok('أعمدة الدول والصور والدفع موجودة');
    step('٤) البيانات');
    const n = async (q) => (await db.query(q))[0][0].n;
    const c = { 'الأقسام': await n('SELECT COUNT(*) n FROM categories'), 'المنتجات': await n('SELECT COUNT(*) n FROM products'), 'متغيرات المنتجات': await n('SELECT COUNT(*) n FROM product_variants'),
      'الكوبونات': await n('SELECT COUNT(*) n FROM coupons'), 'مناطق الشحن': await n('SELECT COUNT(*) n FROM shipping_zones'), 'الدول': await n('SELECT COUNT(*) n FROM countries WHERE is_active=1'), 'حسابات المدير': await n("SELECT COUNT(*) n FROM users WHERE role='admin'") };
    for (const [k, v] of Object.entries(c)) v ? ok(`${k}: ${v}`) : fail(`${k}: صفر`, 'شغّل: npm run seed');
  }
  await db.end(); finish();
  function finish() { console.log(problems ? `\nوُجدت ${problems} مشكلة. أصلحها بالترتيب ثم أعد: npm run doctor` : '\nكل شيء سليم. شغّل: npm start ثم افتح http://localhost:' + (process.env.PORT || 3000)); }
})().catch(x => { console.error(x); process.exit(1); });
