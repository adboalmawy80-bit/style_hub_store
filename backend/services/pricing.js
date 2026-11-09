/* حساب الأسعار على الخادم — دوال نقية. كل المبالغ أعداد صحيحة بوحدة "السنت" من عملة الدولة.
   لازم تطابق نفس معادلات الواجهة (frontend/js/app.js): unit = round(سعر_بالجنيه × المعدل × 100) */
const GCC = ['SA', 'AE', 'KW', 'QA', 'BH', 'OM'];
const THREE_DEC = ['KWD', 'BHD', 'OMR'];
const regionOf = code => (code === 'EG' ? 'EG' : GCC.includes(code) ? 'GCC' : 'EU');

const PHONE_EG = /^01[0125]\d{8}$/;
const phoneProblem = (country, raw) => {
  const p = String(raw || '').replace(/[\s-]/g, '');
  if (country === 'EG') return PHONE_EG.test(p) ? null : 'رقم الموبايل لازم يكون ١١ رقم ويبدأ بـ 01.';
  return /^\+\d{8,15}$/.test(p) ? null : 'اكتب رقم الموبايل مع مفتاح الدولة، مثل +966501234567.';
};

const unitCents = (priceEgp, rate) => Math.round(Number(priceEgp) * Number(rate) * 100);
const fixedCents = unitCents;
const toCents = major => Math.round(Number(major) * 100);

function couponProblem(coupon, subtotalC, rate, now = new Date()) {
  if (!coupon || !coupon.is_active) return 'كود الخصم غير صحيح.';
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date(now.toDateString())) return 'انتهت صلاحية كود الخصم.';
  if (fixedCents(coupon.min_subtotal || 0, rate) > subtotalC) return 'الطلب أقل من الحد الأدنى لهذا الكود.';
  return null;
}
function couponDiscount(coupon, subtotalC, rate) {
  if (!coupon) return 0;
  const raw = coupon.type === 'percent' ? Math.round(subtotalC * Number(coupon.value) / 100) : fixedCents(coupon.value, rate);
  return Math.max(0, Math.min(subtotalC, raw));
}
function computeTotals({ subtotalC, coupon, rate, shipC, freeC }) {
  const discount = couponDiscount(coupon, subtotalC, rate);
  const after = subtotalC - discount;
  const shipping = after >= freeC ? 0 : shipC;
  return { subtotal: subtotalC, discount, shipping, total: after + shipping };
}
/* Stripe: وحدة الدفع الصغرى. عملات ٣ خانات (دينار كويتي/بحريني/ريال عُماني) = سنت × ١٠ */
const stripeMinor = (cents, cur) => (THREE_DEC.includes(String(cur).toUpperCase()) ? cents * 10 : cents);
const major = cents => cents / 100;

module.exports = { GCC, THREE_DEC, regionOf, phoneProblem, unitCents, fixedCents, toCents, couponProblem, couponDiscount, computeTotals, stripeMinor, major };
