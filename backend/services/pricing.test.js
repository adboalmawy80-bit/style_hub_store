const assert = require('assert');
const P = require('./pricing');
// الوحدة: ٢٩٩ ج.م × ٠٫٠٧٥ = ٢٢٫٤٢٥ ريال → ٢٢٤٢ سنت (تقريب)
assert.strictEqual(P.unitCents(299, 0.075), 2243);
assert.strictEqual(P.unitCents(299, 1), 29900);
// كوبون نسبة وكوبون ثابت (بالجنيه ويتحوّل بالمعدل) ولا يتجاوز المجموع
assert.strictEqual(P.couponDiscount({ type: 'percent', value: 10 }, 10000, 1), 1000);
assert.strictEqual(P.couponDiscount({ type: 'fixed', value: 50 }, 100000, 0.075), 375);
assert.strictEqual(P.couponDiscount({ type: 'fixed', value: 5000 }, 1000, 1), 1000);
// الشحن والحد المجاني
assert.deepStrictEqual(P.computeTotals({ subtotalC: 100000, coupon: null, rate: 1, shipC: 5500, freeC: 150000 }), { subtotal: 100000, discount: 0, shipping: 5500, total: 105500 });
assert.strictEqual(P.computeTotals({ subtotalC: 160000, coupon: null, rate: 1, shipC: 5500, freeC: 150000 }).shipping, 0);
assert.strictEqual(P.computeTotals({ subtotalC: 160000, coupon: { type: 'percent', value: 10 }, rate: 1, shipC: 5500, freeC: 150000 }).shipping, 5500); // بعد الخصم أقل من الحد
// Stripe
assert.strictEqual(P.stripeMinor(1234, 'KWD'), 12340);
assert.strictEqual(P.stripeMinor(1234, 'EUR'), 1234);
// كوبون
assert.ok(P.couponProblem(null, 1, 1));
assert.ok(P.couponProblem({ is_active: 1, expires_at: '2000-01-01' }, 1, 1));
assert.ok(P.couponProblem({ is_active: 1, min_subtotal: 100 }, 5000, 1));
assert.strictEqual(P.couponProblem({ is_active: 1, min_subtotal: 100 }, 10000, 1), null);
// المناطق والهاتف
assert.strictEqual(P.regionOf('EG'), 'EG'); assert.strictEqual(P.regionOf('KW'), 'GCC'); assert.strictEqual(P.regionOf('DE'), 'EU');
assert.strictEqual(P.phoneProblem('EG', '01012345678'), null); assert.ok(P.phoneProblem('EG', '123'));
assert.strictEqual(P.phoneProblem('SA', '+966 50 123 4567'), null); assert.ok(P.phoneProblem('SA', '0501234567'));
console.log('pricing tests OK');
