require('dotenv').config();
const need = k => { const v = process.env[k]; if (!v) throw new Error(`المتغير ${k} مفقود في ملف .env`); return v; };
const secret = need('JWT_SECRET');
if (secret.length < 24 || /replace/i.test(secret)) throw new Error('JWT_SECRET ضعيف: استخدم نصًا عشوائيًا طويلًا (٣٢ حرفًا فأكثر).');
const stripeKey = (process.env.STRIPE_SECRET_KEY || '').trim();
const port = Number(process.env.PORT) || 3000;
module.exports = {
  port,
  jwtSecret: secret,
  jwtExpires: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || '',
  db: { host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT) || 3306, database: need('DB_NAME'), user: need('DB_USER'), password: process.env.DB_PASSWORD || '' },
  // Stripe: يُفعَّل الدفع بالبطاقة فقط لو المفتاح موجود وليس نصًا افتراضيًا
  stripe: {
    secretKey: /^(sk|rk)_(test|live)_\w{10,}/.test(stripeKey) ? stripeKey : '',
    publishableKey: (process.env.STRIPE_PUBLISHABLE_KEY || '').trim(),
    webhookSecret: (process.env.STRIPE_WEBHOOK_SECRET || '').trim()
  },
  publicUrl: (process.env.PUBLIC_URL || `http://localhost:${port}`).replace(/\/+$/, '')
};
