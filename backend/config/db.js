const mysql = require('mysql2/promise');
const { db } = require('./env');
/* DB_SSL=true: مشفّر مع التحقق من الشهادة (TiDB وغيره). DB_SSL=no-verify: مشفّر بدون تحقق (Aiven وشهادات ذاتية). غير ذلك: بدون تشفير. */
const mode = String(process.env.DB_SSL || '').toLowerCase();
const ssl = mode === 'true' ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : mode === 'no-verify' ? { rejectUnauthorized: false } : undefined;
const pool = mysql.createPool({
  ...db, ssl, connectTimeout: 15000, waitForConnections: true, connectionLimit: 10, charset: 'utf8mb4', decimalNumbers: true, dateStrings: ['DATE'],   // تاريخ الكوبون كنص YYYY-MM-DD بدون إزاحة توقيت
 
  enableKeepAlive: true, keepAliveInitialDelay: 10000,      // الاستضافات السحابية تقطع الاتصالات الخاملة
  maxIdle: 2, idleTimeout: 30000                            // نغلق الخامل بدل أن تقطعه الاستضافة
});
// قطع اتصال خامل (ECONNRESET) لا يجب أن يوقف الخادم: نسجّله ويُستبدل بالاتصال التالي
pool.pool.on('connection', c => c.on('error', e => console.error('[db] اتصال انقطع وسيُستبدل: ' + (e.code || e.message))));
module.exports = pool;
