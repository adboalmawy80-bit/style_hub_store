const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { port, corsOrigin, stripe: stripeCfg } = require('./config/env');
const { errorHandler } = require('./middleware/common');

const app = express();
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: { directives: {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'"],            // الصفحات تستخدم سكربتات داخلية
  scriptSrcAttr: ["'unsafe-inline'"],                     // أزرار onclick في لوحة الإدارة
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com'],
  imgSrc: ["'self'", 'data:', 'blob:'],
  upgradeInsecureRequests: null   // يفعَّل خلف HTTPS في الإنتاج
} } }));
if (corsOrigin) app.use(cors({ origin: corsOrigin }));
app.use('/api/stripe/webhook', require('./routes/stripeWebhook'));          // الجسم الخام: قبل express.json
app.use('/api/admin/products', express.json({ limit: '3mb' }));            // رفع الصور فقط يحتاج حدًا أكبر
app.use(express.json({ limit: '100kb' }));
app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false }));

app.use('/api', require('./routes/public'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api', (_req, res) => res.status(404).json({ error: 'المسار غير موجود.' }));

app.get('/admin', (_req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'admin.html')));
app.use(express.static(path.join(__dirname, '..', 'frontend')));   // تقديم الواجهة من نفس الخادم
app.use(errorHandler);
app.listen(port, () => {
  console.log(`STYLE HUB PRO يعمل على http://localhost:${port}`);
  console.log(stripeCfg.secretKey ? `الدفع بالبطاقة: مفعّل${stripeCfg.webhookSecret ? '' : ' (تنبيه: STRIPE_WEBHOOK_SECRET غير مضبوط)'}` : 'الدفع بالبطاقة: غير مفعّل (ضع STRIPE_SECRET_KEY في .env)');
  const orders = require('./services/orders');
  setInterval(() => orders.sweepUnpaid().catch(e => console.error('[sweeper] ' + e.message)), 10 * 60 * 1000).unref();   // يلغي طلبات البطاقة غير المدفوعة
});
