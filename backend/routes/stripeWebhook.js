/* Stripe webhook: التوقيع يُتحقق منه على الجسم الخام، فهذا المسار يُركَّب قبل express.json */
const router = require('express').Router();
const express = require('express');
const stripe = require('../services/stripe');
const orders = require('../services/orders');

router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe.enabled || !stripe.cfg.webhookSecret) return res.status(503).send('webhook not configured');
  let ev;
  try { ev = stripe.get().webhooks.constructEvent(req.body, req.headers['stripe-signature'], stripe.cfg.webhookSecret); }
  catch (e) { return res.status(400).send('bad signature'); }
  try {
    const s = ev.data.object;
    if (ev.type === 'checkout.session.completed' || ev.type === 'checkout.session.async_payment_succeeded') {
      const o = await orders.bySession(s.id);
      if (o && s.payment_status === 'paid') await orders.markPaid(o.id);
    } else if (ev.type === 'checkout.session.expired' || ev.type === 'checkout.session.async_payment_failed') {
      const o = await orders.bySession(s.id);
      if (o) await orders.cancelUnpaid(o.id);
    }
    res.json({ received: true });
  } catch (e) { console.error('[webhook] ' + e.message); res.status(500).send('error'); }   // 500 ⇒ Stripe يعيد المحاولة
});
module.exports = router;
