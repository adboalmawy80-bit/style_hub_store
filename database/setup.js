/* ينشئ الجداول من schema.sql ويرقّي قاعدة قديمة تلقائيًا (يضيف الأعمدة الناقصة):  npm run setup */
const fs = require('fs'), path = require('path');

function splitSql(text) {
  return text.replace(/--.*$/gm, '').split(/;\s*(?:\r?\n|$)/).map(s => s.trim()).filter(Boolean)
    .filter(s => !/^(CREATE DATABASE|USE)\b/i.test(s));   // الاتصال يستخدم DB_NAME مباشرة
}
/* أعمدة أُضيفت بعد النسخة الأولى. التحقق عبر information_schema لأن ADD COLUMN IF NOT EXISTS غير مدعوم دائمًا */
const MIGRATIONS = [
  ['products', 'name_en', 'VARCHAR(160) NULL'],
  ['products', 'description_en', 'TEXT NULL'],
  ['orders', 'country', "CHAR(2) NOT NULL DEFAULT 'EG'"],
  ['orders', 'postal_code', 'VARCHAR(20) NULL'],
  ['orders', 'currency', "CHAR(3) NOT NULL DEFAULT 'EGP'"],
  ['orders', 'fx_rate', 'DECIMAL(14,6) NOT NULL DEFAULT 1'],
  ['orders', 'total_egp', 'DECIMAL(12,2) NULL'],
  ['orders', 'stripe_session_id', 'VARCHAR(255) NULL']
];
const WIDEN = [ // توسيع أعمدة قديمة (آمن للتكرار)
  ['orders', 'governorate', 'VARCHAR(60) NOT NULL'], ['orders', 'subtotal', 'DECIMAL(12,2) NOT NULL'], ['orders', 'discount', 'DECIMAL(12,2) NOT NULL DEFAULT 0'],
  ['orders', 'shipping', 'DECIMAL(12,2) NOT NULL DEFAULT 0'], ['orders', 'total', 'DECIMAL(12,2) NOT NULL'], ['order_items', 'unit_price', 'DECIMAL(12,2) NOT NULL']
];
async function migrate(db, log = () => {}) {
  for (const [t, c, def] of MIGRATIONS) {
    const [[r]] = await db.query('SELECT COUNT(*) n FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?', [t, c]);
    if (!r.n) { await db.query(`ALTER TABLE ${t} ADD COLUMN ${c} ${def}`); log(`أُضيف العمود ${t}.${c}`); }
  }
  for (const [t, c, def] of WIDEN) { try { await db.query(`ALTER TABLE ${t} MODIFY COLUMN ${c} ${def}`); } catch (e) { log(`تخطّي توسيع ${t}.${c}: ${e.message}`); } }
  await db.query("UPDATE orders SET total_egp = total WHERE total_egp IS NULL AND currency = 'EGP'");
}
/* جداول موجودة بنفس الأسماء لكن من مشروع آخر: CREATE TABLE IF NOT EXISTS يتجاهلها فتظهر أخطاء "Unknown column" لاحقًا */
const MUST = { users: 'role', categories: 'slug', products: 'category_id', product_variants: 'color_name', coupons: 'code', shipping_zones: 'governorate', orders: 'customer_name', order_items: 'order_id' };
async function foreignTables(db) {
  const bad = [];
  for (const [t, c] of Object.entries(MUST)) {
    const [[a]] = await db.query('SELECT COUNT(*) n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?', [t]);
    if (!a.n) continue;
    const [[b]] = await db.query('SELECT COUNT(*) n FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?', [t, c]);
    if (!b.n) bad.push(t);
  }
  return bad;
}
module.exports = { splitSql, migrate, MIGRATIONS, foreignTables };

if (require.main === module) (async () => {
  const log = m => console.log('[setup] ' + m);
  try {
    require('../backend/config/env');
    const db = require('../backend/config/db');
    const stmts = splitSql(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
    log(`الاتصال بقاعدة البيانات… (${stmts.length} جملة)`);
    const bad = await foreignTables(db);
    if (bad.length) {
      console.error('[setup] توقّف: القاعدة فيها جداول بنفس أسماء جداول المتجر لكن بأعمدة مختلفة (من مشروع آخر): ' + bad.join('، '));
      console.error('[setup] الحل: أنشئ قاعدة بيانات جديدة فاضية، وغيّر DB_NAME في .env، ثم أعد npm run setup.');
      await db.end(); process.exit(1);
    }
    for (const st of stmts) {
      await db.query(st);
      const m = st.match(/^CREATE TABLE IF NOT EXISTS\s+(\w+)/i);
      if (m) log('جدول جاهز: ' + m[1]);
    }
    await migrate(db, log);
    log('تم. الخطوة التالية: npm run seed');
    await db.end();
  } catch (e) { console.error('[setup] فشل: ' + (e.code || '') + ' ' + e.message); process.exit(1); }
})();
