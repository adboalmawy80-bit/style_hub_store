/* يملأ قاعدة البيانات بالبيانات الأولية: node database/seed.js  (بعد تشغيل schema.sql) */
const fs = require('fs'), path = require('path'), vm = require('vm');
const bcrypt = require('bcrypt');
require('../backend/config/env');
const db = require('../backend/config/db');

// نقرأ المنتجات من frontend/js/data.js نفسه لتبقى البيانات متطابقة
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'frontend', 'js', 'data.js'), 'utf8') + '\n;this.OUT={PRODUCTS,CATEGORIES,GOVERNORATES,COUPONS,COUNTRIES};', ctx);
const { PRODUCTS, CATEGORIES, GOVERNORATES, COUPONS, COUNTRIES } = ctx.OUT;
// القاموس الإنجليزي (i18n.js) هو مصدر الأسماء/الأوصاف الإنجليزية للمنتجات
const i18n = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'js', 'i18n.js'), 'utf8');
const EN = JSON.parse(i18n.slice(i18n.indexOf('const EN = ') + 11, i18n.indexOf(';\nconst ', i18n.indexOf('const EN = ') + 11)));

const log = m => console.log('[seed] ' + m);
(async () => {
  log('جاري الاتصال بقاعدة البيانات…');
  let conn;
  try { conn = await db.getConnection(); }
  catch (e) { console.error('[seed] تعذّر الاتصال بقاعدة البيانات: ' + (e.code || '') + ' ' + e.message); await db.end().catch(() => {}); process.exit(1); }
  log('تم الاتصال.');
  try {
    await conn.beginTransaction();
    log('إدخال الأقسام والشحن والكوبونات…');
    for (const c of CATEGORIES) await conn.query('INSERT INTO categories (slug,name) VALUES (?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)', [c.id, c.name]);
    for (const [g, fee] of GOVERNORATES) await conn.query('INSERT INTO shipping_zones (governorate,fee) VALUES (?,?) ON DUPLICATE KEY UPDATE fee=VALUES(fee)', [g, fee]);
    for (const [code, c] of Object.entries(COUPONS)) await conn.query('INSERT INTO coupons (code,type,value) VALUES (?,?,?) ON DUPLICATE KEY UPDATE value=VALUES(value)', [code, c.type, c.value]);
    log('إدخال الدول والعملات (الأسعار الحالية لا تُستبدل لو عدّلتها من لوحة الإدارة)…');
    for (const c of COUNTRIES) await conn.query(
      'INSERT INTO countries (code,name_ar,name_en,currency,rate,ship_fee,free_from) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name_ar=VALUES(name_ar), name_en=VALUES(name_en), currency=VALUES(currency)',
      [c.code, c.ar, c.en, c.cur, c.rate, c.ship, c.free]);
    const [[n]] = await conn.query('SELECT COUNT(*) n FROM products');
    log('عدد المنتجات الحالي في القاعدة: ' + n.n);
    if (n.n === 0) {
      for (const p of PRODUCTS) {
        const [[cat]] = await conn.query('SELECT id FROM categories WHERE slug = ?', [p.cat]);
        const [r] = await conn.query('INSERT INTO products (category_id,name,name_en,description,description_en,price,old_price,tag,type,rating,reviews) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
          [cat.id, p.name, EN[p.name] || null, p.desc, EN[p.desc] || null, p.price, p.old, p.tag, p.type, p.rating, p.reviews]);
        const combos = p.colors.length * p.sizes.length, each = Math.max(1, Math.floor(p.stock / combos));
        for (const c of p.colors) for (const s of p.sizes)
          await conn.query('INSERT INTO product_variants (product_id,color_name,color_hex,size,stock) VALUES (?,?,?,?,?)', [r.insertId, c.n, c.hex, s, each]);
      }
    }
    for (const p of PRODUCTS) // تعبئة الأسماء الإنجليزية للمنتجات القديمة الناقصة
      await conn.query('UPDATE products SET name_en = COALESCE(name_en, ?), description_en = COALESCE(description_en, ?) WHERE name = ?', [EN[p.name] || null, EN[p.desc] || null, p.name]);
    log('تم إدخال المنتجات.');
    const email = (process.env.ADMIN_EMAIL || '').toLowerCase(), pw = process.env.ADMIN_PASSWORD || '';
    if (email && pw.length >= 12 && !/change_me/i.test(pw)) {
      await conn.query("INSERT INTO users (name,email,password_hash,role) VALUES ('مدير المتجر',?,?, 'admin') ON DUPLICATE KEY UPDATE role='admin', password_hash=VALUES(password_hash)", [email, await bcrypt.hash(pw, 12)]);
      log('تم إنشاء حساب المدير: ' + email);
    } else log('لم يُنشأ حساب مدير: عيّن ADMIN_EMAIL وADMIN_PASSWORD (١٢ حرفًا فأكثر) في .env ثم أعد التشغيل.');
    await conn.commit(); log('تم تجهيز البيانات.');
  } catch (e) { await conn.rollback(); console.error('[seed] فشل: ' + (e.code || '') + ' ' + e.message); process.exitCode = 1; } finally { conn.release(); await db.end(); }
})();
